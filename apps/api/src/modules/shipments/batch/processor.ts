import { ChargeType, prisma, ShipmentStatus } from '@lorrigo/db';
import { ShipmentBucketManager, ShipmentBucket, getShipmentBucket } from '@lorrigo/utils';
import { FastifyInstance } from 'fastify';
import { ShipmentService } from '../services/shipmentService';
import { addJob, QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';
import pLimit from 'p-limit';
import { TrackingEventData } from '@/types/vendor';
import { JobType } from '../queues/shipmentQueue';
import { ChargeProcessingService } from '../services/charge-processing.service';

/**
 * Tracking processor configuration
 */
export interface TrackingProcessorConfig {
  batchSize: number;
  concurrency: number;
  cacheExpiry: number;
  maxRetries: number;
  retryDelay: number;
  rtoProcessingEnabled: boolean;
  updateFrequency: {
    inTransit: number; // Hours between updates for in-transit shipments
    delivered: number; // Hours between updates for delivered shipments
    rto: number; // Hours between updates for RTO shipments
  };
}

/**
 * Default tracking processor configuration
 */
const DEFAULT_CONFIG: TrackingProcessorConfig = {
  batchSize: 50,
  concurrency: 5,
  cacheExpiry: 3600, // 1 hour
  maxRetries: 3,
  retryDelay: 60000, // 1 minute
  rtoProcessingEnabled: true,
  updateFrequency: {
    inTransit: 4, // Check in-transit shipments every 4 hours
    delivered: 24, // Check delivered shipments once a day
    rto: 12, // Check RTO shipments every 12 hours
  },
};

/**
 * Tracking result interface
 */
export interface TrackingResult {
  shipmentId: string;
  awb: string | null;
  previousStatus: ShipmentStatus;
  newStatus?: ShipmentStatus;
  newBucket?: number;
  events?: TrackingEventData[];
  success: boolean;
  message: string;
  retryCount?: number;
  error?: any;
}

/**
 * Process shipments for tracking updates with proper function signature
 * @param fastify Fastify instance for database and logging access
 * @param shipmentService Service for tracking shipments
 * @param config Optional configuration overrides
 * @param job Optional job instance for progress tracking
 * @returns Processing statistics
 */
export async function processShipmentTracking(
  fastify: FastifyInstance,
  shipmentService: ShipmentService,
  config: { batchSize: number; [key: string]: any },
  job?: any
): Promise<{ success: boolean; message: string; processed: number; updated: number }> {
  try {
    const { batchSize = 50 } = config;
    
    // Get shipments that need tracking updates
    const shipments = await fastify.prisma.shipment.findMany({
      where: {
        awb: { not: null },
        status: {
          notIn: [
            ShipmentStatus.DELIVERED,
            ShipmentStatus.RTO_DELIVERED,
            ShipmentStatus.CANCELLED_SHIPMENT,
            ShipmentStatus.CANCELLED_ORDER,
          ],
        },
      },
      include: {
        order: {
          select: {
            id: true,
            code: true,
          },
        },
        courier: {
          select: {
            channel_config: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: batchSize,
      orderBy: { updated_at: 'asc' },
    });

    if (shipments.length === 0) {
      return { success: true, message: 'No shipments to track', processed: 0, updated: 0 };
    }

    // Use the optimized bulk processing function
    const result = await processBulkShipmentTracking(fastify, shipmentService, shipments);

    fastify.log.info(`Tracking batch completed: ${result.updated} updated, ${result.rtoProcessed} RTO processed`);

    return {
      success: true,
      message: `Processed ${result.processed} shipments, updated ${result.updated}`,
      processed: result.processed,
      updated: result.updated,
    };
  } catch (error) {
    fastify.log.error(`Error in processShipmentTracking: ${error}`);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      processed: 0,
      updated: 0,
    };
  }
}

/**
 * Optimized bulk shipment tracking processor that uses real tracking data
 * Processes multiple shipments using the actual trackShipment function
 */
export async function processBulkShipmentTracking(
  fastify: FastifyInstance,
  shipmentService: ShipmentService,
  shipments: Array<{
    id: string;
    awb: string | null;
    status: ShipmentStatus;
    bucket: number | null;
    user_id: string;
    updated_at: Date;
    order?: {
      id: string;
      code: string;
    };
    courier?: {
      channel_config: {
        name: string;
      };
    } | null;
  }>
): Promise<{ 
  processed: number; 
  updated: number; 
  rtoProcessed: number; 
  errors: Array<{ shipmentId: string; error: string }> 
}> {
  const result = {
    processed: 0,
    updated: 0,
    rtoProcessed: 0,
    errors: [] as Array<{ shipmentId: string; error: string }>
  };

  if (shipments.length === 0) {
    return result;
  }

  try {
    // Create concurrency limiter to avoid overwhelming external APIs
    const limit = pLimit(5); // Process 5 shipments concurrently
    
    // Process shipments in parallel with concurrency control
    const trackingPromises = shipments.map(shipment => 
      limit(async () => {
        try {
          result.processed++;
          
          if (!shipment.awb || !shipment.courier?.channel_config?.name) {
            result.errors.push({ 
              shipmentId: shipment.id, 
              error: 'Missing AWB or courier configuration' 
            });
            return;
          }

          // Use the real trackShipment function to get tracking data
          const trackingResult = await shipmentService.trackShipment(
            shipment.id,
            shipment.courier.channel_config.name,
            shipment.awb,
            shipment.order?.id || ''
          );

          if (trackingResult.success && trackingResult.updated) {
            result.updated++;
            
            // Check if this is an RTO shipment that needs charge processing
            if (trackingResult.newStatus && isRtoStatus(trackingResult.newStatus)) {
              result.rtoProcessed++;
            }
          } else if (!trackingResult.success) {
            result.errors.push({ 
              shipmentId: shipment.id, 
              error: trackingResult.message 
            });
          }
        } catch (error) {
          result.errors.push({ 
            shipmentId: shipment.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      })
    );

    // Wait for all tracking operations to complete
    await Promise.all(trackingPromises);

    fastify.log.info(`Bulk tracking completed: ${result.updated}/${result.processed} shipments updated`);

    return result;
  } catch (error) {
    fastify.log.error(`Error in bulk shipment tracking: ${error}`);
    throw error;
  }
}

/**
 * Process RTO charges for multiple shipments efficiently
 */
async function processRtoChargesBulk(
  fastify: FastifyInstance,
  shipmentIds: string[]
): Promise<number> {
  try {
    const chargeService = new ChargeProcessingService(fastify);
    let processed = 0;

    // Get shipment details in bulk
    const shipments = await fastify.prisma.shipment.findMany({
      where: { id: { in: shipmentIds } },
      include: {
        order: {
          select: {
            id: true,
            user_id: true,
            payment_method: true,
            amount_to_collect: true,
            total_amount: true,
          }
        },
        pricing: true,
      },
    });

    // Process RTO charges for each shipment
    for (const shipment of shipments) {
      try {
        const results = await chargeService.processRtoShipmentCharges(shipment);
        if (results.length > 0) {
          processed++;
          fastify.log.info(`Processed RTO charges for shipment ${shipment.id}`);
        }
      } catch (error) {
        fastify.log.error(`Failed to process RTO charges for shipment ${shipment.id}: ${error}`);
      }
    }

    return processed;
  } catch (error) {
    fastify.log.error(`Error in bulk RTO processing: ${error}`);
    throw error;
  }
}

/**
 * Check if a status indicates RTO
 */
function isRtoStatus(status: string): boolean {
  return ['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(status);
}

/**
 * Get shipments that need tracking updates based on their status and last update time
 * @param fastify Fastify instance
 * @param config Tracking processor configuration
 * @returns Promise resolving to shipments array
 */
async function getShipmentsForTracking(
  fastify: FastifyInstance,
  config: TrackingProcessorConfig
): Promise<
  Array<{
    id: string;
    awb: string | null;
    status: ShipmentStatus;
    order: {
      id: string;
      code: string;
    };
    courier: {
      channel_config: {
        name: string;
      };
    } | null;
    lastUpdated: Date;
    bucket: number | null;
  }>
> {
  // Calculate cutoff times for different shipment statuses
  const now = new Date();

  const inTransitCutoff = new Date(now);
  inTransitCutoff.setHours(now.getHours() - config.updateFrequency.inTransit);

  const deliveredCutoff = new Date(now);
  deliveredCutoff.setHours(now.getHours() - config.updateFrequency.delivered);

  const rtoCutoff = new Date(now);
  rtoCutoff.setHours(now.getHours() - config.updateFrequency.rto);

  // Get shipments that need tracking updates
  const shipments = await fastify.prisma.shipment.findMany({
    where: {
      awb: { not: null },
      status: {
        notIn: [
          ShipmentStatus.DELIVERED,
          ShipmentStatus.RTO_DELIVERED,
          ShipmentStatus.CANCELLED_SHIPMENT,
          ShipmentStatus.CANCELLED_ORDER,
          ShipmentStatus.NEW,
        ],
      },
      // OR: [
      //   // In-transit shipments updated more than inTransit hours ago
      //   {
      //     status: {
      //       in: [
      //         ShipmentStatus.IN_TRANSIT,
      //         ShipmentStatus.OUT_FOR_DELIVERY,
      //         ShipmentStatus.PICKED_UP,
      //         ShipmentStatus.PICKUP_SCHEDULED,
      //         ShipmentStatus.COURIER_ASSIGNED,
      //       ],
      //     },
      //     updated_at: { lt: inTransitCutoff },
      //   },
      //   // NDR (Not Delivered) shipments should be checked frequently
      //   {
      //     status: ShipmentStatus.NDR,
      //     updated_at: { lt: inTransitCutoff }, // Use same frequency as in-transit
      //   },
      //   // Delivered shipments updated more than delivered hours ago
      //   // We still check these occasionally to ensure final status is correct
      //   {
      //     status: ShipmentStatus.DELIVERED,
      //     updated_at: { lt: deliveredCutoff },
      //   },
      //   // RTO shipments updated more than rto hours ago
      //   {
      //     status: {
      //       in: [
      //         ShipmentStatus.RTO,
      //         ShipmentStatus.RTO_DELIVERED,
      //       ],
      //     },
      //     updated_at: { lt: rtoCutoff },
      //   },
      //   // Exception shipments should be checked frequently
      //   {
      //     status: ShipmentStatus.EXCEPTION,
      //     updated_at: { lt: inTransitCutoff }, // Use same frequency as in-transit
      //   },
      // ],
    },
    select: {
      id: true,
      awb: true,
      status: true,
      bucket: true,
      updated_at: true,
      order: {
        select: {
          id: true,
          code: true,
        },
      },
      courier: {
        select: {
          channel_config: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      updated_at: 'asc', // Process oldest updates first
    },
    take: config.batchSize,
  });

  // Map to the expected format
  return shipments.map((shipment) => ({
    id: shipment.id,
    awb: shipment.awb,
    status: shipment.status,
    order: shipment.order,
    courier: shipment.courier,
    lastUpdated: shipment.updated_at,
    bucket: shipment.bucket,
  }));
}

export class TrackingProcessor {
  /**
   * Process RTO charges for a shipment
   * @param shipmentId Shipment ID
   * @param orderId Order ID
   * @param vendorName Vendor name
   * @returns Promise resolving to true if charges were processed
   */
  public static async processRtoCharges(fastify: FastifyInstance, shipmentId: string, orderId: string): Promise<boolean> {
    try {
      // Check if shipment is already in RTO status
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        select: {
          status: true,
          courier: { select: { channel_config: { select: { name: true } } } },
        },
      });

      if (shipment?.status === ShipmentStatus.RTO_INITIATED) {
        fastify.log.info(`Shipment ${shipmentId} is already in RTO status`);
        return false;
      }

      // Queue the RTO update instead of updating directly
      await redis.rpush(
        'shipment:rto:updates',
        JSON.stringify({
          shipmentId,
          orderId,
          vendorName: shipment?.courier?.channel_config?.name,
          timestamp: new Date().toISOString(),
        })
      );

      return true;
    } catch (error) {
      fastify.log.error(`Error processing RTO charges for shipment ${shipmentId}:`, error);
      return false;
    }
  }

  /**
   * Process bulk tracking events from Redis queue
   * @param fastify Fastify instance
   * @returns Number of processed events
   */
  public static async processBulkTrackingEvents(fastify: FastifyInstance): Promise<number> {
    try {
      const eventQueue = 'tracking:events:queue';
      const events = await fastify.redis.lrange(eventQueue, 0, -1);

      if (events.length === 0) {
        return 0;
      }

      fastify.log.info(`Processing ${events.length} tracking events`);

      // Process events in chunks to avoid overwhelming the database
      const CHUNK_SIZE = 100;
      const chunks = [];

      for (let i = 0; i < events.length; i += CHUNK_SIZE) {
        chunks.push(events.slice(i, i + CHUNK_SIZE));
      }

      let processedCount = 0;

      for (const chunk of chunks) {
        const eventData = chunk
          .map((event) => {
            try {
              const data = JSON.parse(event);
              return {
                shipment_id: data.shipment_id,
                status: data.status,
                location: data.location || '',
                description: data.description || '',
                timestamp: new Date(data.timestamp),
                action: data.vendor_name || '',
              };
            } catch (e) {
              fastify.log.error('Error parsing tracking event:', e);
              return null;
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        if (eventData.length > 0) {
          await fastify.prisma.trackingEvent.createMany({
            data: eventData,
            skipDuplicates: true,
          });

          processedCount += eventData.length;
        }
      }

      // Clear the processed events
      await fastify.redis.del(eventQueue);

      fastify.log.info(`Processed ${processedCount} tracking events`);
      return processedCount;
    } catch (error) {
      fastify.log.error('Error processing bulk tracking events:', error);
      return 0;
    }
  }

  /**
   * Process bulk status updates from Redis
   * @param fastify Fastify instance
   * @returns Number of processed status updates
   */
  public static async processBulkStatusUpdates(fastify: FastifyInstance): Promise<number> {
    try {
      const statusQueue = 'shipment:status:updates';
      const updates = await fastify.redis.lrange(statusQueue, 0, -1);

      if (updates.length === 0) {
        return 0;
      }

      fastify.log.info(`Processing ${updates.length} shipment status updates`);

      // Process updates in chunks to avoid overwhelming the database
      const CHUNK_SIZE = 100;
      let processedCount = 0;

      // Process in chunks
      for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE);

        // Extract shipment IDs and statuses
        const updateData = chunk
          .map((update) => {
            try {
              return JSON.parse(update);
            } catch (e) {
              fastify.log.error('Error parsing status update:', e);
              return null;
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        // Group updates by status for bulk operations
        const statusGroups: Record<string, string[]> = {};

        for (const data of updateData) {
          const status = data.status as ShipmentStatus;
          if (!statusGroups[status]) {
            statusGroups[status] = [];
          }
          statusGroups[status].push(data.id);
        }

        // Update shipments in bulk by status
        for (const [status, ids] of Object.entries(statusGroups)) {
          if (ids.length > 0) {
            await fastify.prisma.shipment.updateMany({
              where: { id: { in: ids } },
              data: { status: status as ShipmentStatus },
            });
            processedCount += ids.length;
          }
        }
      }

      // Clear the processed updates
      await fastify.redis.del(statusQueue);

      fastify.log.info(`Processed ${processedCount} status updates`);

      // Schedule the next run
      await addJob(
        QueueNames.SHIPMENT_TRACKING,
        JobType.PROCESS_BULK_STATUS_UPDATES,
        {},
        { delay: 60000 } // Run again in 1 minute
      );

      return processedCount;
    } catch (error) {
      fastify.log.error('Error processing bulk status updates:', error);

      // Schedule retry with backoff
      await addJob(
        QueueNames.SHIPMENT_TRACKING,
        JobType.PROCESS_BULK_STATUS_UPDATES,
        {},
        { delay: 300000 } // Retry in 5 minutes on error
      );

      return 0;
    }
  }

  /**
   * Process unmapped courier statuses
   * @param fastify Fastify instance
   * @returns Number of processed unmapped statuses
   */
  public static async processUnmappedStatuses(fastify: FastifyInstance): Promise<number> {
    try {
      const unmappedQueue = 'courier:unmapped:statuses';
      const statuses = await fastify.redis.lrange(unmappedQueue, 0, -1);

      if (statuses.length === 0) {
        return 0;
      }

      fastify.log.info(`Processing ${statuses.length} unmapped courier statuses`);

      // Extract unique unmapped statuses
      const uniqueStatuses = new Map();

      for (const status of statuses) {
        try {
          const data = JSON.parse(status);
          const key = `${data.courier_name}:${data.status_code}`;

          if (!uniqueStatuses.has(key)) {
            uniqueStatuses.set(key, {
              courier_name: data.courier_name,
              status_code: data.status_code,
              status_label: data.status_label || '',
              count: 1,
              last_seen: new Date(),
            });
          } else {
            const existing = uniqueStatuses.get(key);
            existing.count++;
            existing.last_seen = new Date();
            uniqueStatuses.set(key, existing);
          }
        } catch (e) {
          fastify.log.error('Error parsing unmapped status:', e);
        }
      }

      // Store unmapped statuses in database for admin to map
      let processedCount = 0;

      // Check if unmappedCourierStatus model exists
      const hasUnmappedModel = 'unmappedCourierStatus' in fastify.prisma;

      for (const [_, data] of uniqueStatuses.entries()) {
        try {
          // Check if mapping already exists
          const existingMapping = await fastify.prisma.courierStatusMapping.findFirst({
            where: {
              courier_name: data.courier_name,
              status_code: data.status_code,
            },
          });

          if (!existingMapping) {
            // Create unmapped status record if model exists
            if (hasUnmappedModel) {
              await fastify.prisma.unmappedCourierStatus.upsert({
                where: {
                  courier: data.courier_name,
                  courier_status_code: data.status_code,
                },
                update: {
                  count: data.count,
                  last_seen: data.last_seen,
                },
                create: data,
              });
            }

            processedCount++;
          }
        } catch (e) {
          fastify.log.error('Error storing unmapped status:', e);
        }
      }

      // Clear processed unmapped statuses
      await fastify.redis.del(unmappedQueue);

      fastify.log.info(`Processed ${processedCount} unmapped statuses`);

      // Schedule the next run
      await addJob(
        QueueNames.SHIPMENT_TRACKING,
        JobType.PROCESS_UNMAPPED_STATUSES,
        {},
        { delay: 3600000 } // Run again in 1 hour
      );

      return processedCount;
    } catch (error) {
      fastify.log.error('Error processing unmapped statuses:', error);

      // Schedule retry with backoff
      await addJob(
        QueueNames.SHIPMENT_TRACKING,
        JobType.PROCESS_UNMAPPED_STATUSES,
        {},
        { delay: 3600000 } // Retry in 1 hour on error
      );

      return 0;
    }
  }

  /**
   * Process bulk EDD (Estimated Delivery Date) updates from Redis
   * @param fastify Fastify instance
   * @returns Number of processed EDD updates
   */
  public static async processBulkEddUpdates(fastify: FastifyInstance): Promise<number> {
    try {
      const eddQueue = 'shipment:edd:updates';
      const updates = await fastify.redis.lrange(eddQueue, 0, -1);

      if (updates.length === 0) {
        return 0;
      }

      fastify.log.info(`Processing ${updates.length} EDD updates`);

      // Parse and validate updates
      const validUpdates: Array<{ shipmentId: string; estimatedDeliveryDate: string }> = [];
      for (const update of updates) {
        try {
          const data = JSON.parse(update);
          if (data.shipmentId && data.estimatedDeliveryDate) {
            validUpdates.push(data);
          }
        } catch (parseError) {
          fastify.log.warn(`Invalid EDD update data: ${update}`);
        }
      }

      if (validUpdates.length === 0) {
        // Clear the queue
        await fastify.redis.del(eddQueue);
        return 0;
      }

      // Batch update EDDs
      const updatePromises = validUpdates.map(({ shipmentId, estimatedDeliveryDate }) =>
        prisma.shipment.updateMany({
          where: {
            id: shipmentId,
          },
          data: {
            edd: new Date(estimatedDeliveryDate),
            updated_at: new Date(),
          },
        })
      );

      const results = await Promise.allSettled(updatePromises);

      // Count successful updates
      let processed = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          processed += result.value.count;
        } else {
          const update = validUpdates[index];
          if (update) {
            fastify.log.error(
              `Failed to update EDD for shipment ${update.shipmentId}: ${result.reason}`
            );
          }
        }
      });

      // Clear processed updates from queue
      await fastify.redis.del(eddQueue);

      fastify.log.info(`Successfully processed ${processed} EDD updates`);

      return processed;
    } catch (error) {
      fastify.log.error(`Error processing EDD updates: ${error}`);

      // Schedule retry with backoff
      await addJob(
        QueueNames.SHIPMENT_TRACKING,
        JobType.PROCESS_EDD_UPDATES,
        {},
        { delay: 300000 } // Retry in 5 minutes on error
      );

      throw error;
    } finally {
      // Schedule the next run
      await addJob(
        QueueNames.SHIPMENT_TRACKING,
        JobType.PROCESS_EDD_UPDATES,
        {},
        { delay: 300000 } // Run again in 5 minutes
      );
    }
  }

  /**
   * Process NDR details for a shipment
   * @param fastify Fastify instance
   * @param shipmentService Shipment service instance
   * @param shipmentId Shipment ID
   * @param awb AWB number
   * @param vendorName Vendor name
   * @param orderId Order ID
   * @returns Promise resolving to processing result
   */
  public static async processNdrDetails(
    fastify: FastifyInstance,
    shipmentService: any,
    shipmentId: string,
    awb: string,
    vendorName: string,
    orderId: string
  ): Promise<{
    success: boolean;
    message: string;
    ndrId?: string;
  }> {
    try {
      fastify.log.info(`Processing NDR details for shipment ${shipmentId}, AWB: ${awb}`);

      // Currently only support Shiprocket for NDR details
      if (vendorName !== 'SHIPROCKET') {
        return {
          success: false,
          message: `NDR details processing not supported for vendor: ${vendorName}`,
        };
      }

      // Get the vendor service
      const { VendorService } = await import('../../vendors/vendor.service');
      const vendorService = new VendorService(fastify);

      // Get vendor instance
      const vendor = vendorService.getVendor(vendorName);
      if (!vendor || !('getNdrDetails' in vendor)) {
        return {
          success: false,
          message: `Vendor ${vendorName} does not support NDR details`,
        };
      }

      // Get NDR details from vendor API
      const ndrDetailsResult = await vendor.getNdrDetails(awb);

      if (!ndrDetailsResult.success || !ndrDetailsResult.data?.data?.[0]) {
        return {
          success: false,
          message: ndrDetailsResult.message || `Failed to get NDR details for AWB ${awb}`,
        };
      }

      const ndrData = ndrDetailsResult.data.data[0];

      // Check if NDR record already exists
      const existingNdr = await fastify.prisma.nDROrder.findFirst({
        where: { awb },
        include: {
          ndr_history: {
            orderBy: {
              created_at: 'desc',
            },
          },
        },
      });

      if (existingNdr) {
        fastify.log.info(`NDR record already exists for AWB ${awb}, checking for changes`);

        // Check if cancellation_reason has changed
        const reasonChanged = existingNdr.cancellation_reason !== (ndrData.reason || '');

        // Check if attempts count has changed
        const attemptsChanged = existingNdr.attempts !== (ndrData.attempts || 1);

        // Check if ndr_raised_at date has changed
        const ndrRaisedAtChanged =
          ndrData.ndr_raised_at &&
          (!existingNdr.ndr_raised_at ||
            new Date(ndrData.ndr_raised_at).getTime() !== existingNdr.ndr_raised_at.getTime());

        // Check if new history items are available
        let historyChanged = false;
        if (ndrData.history && Array.isArray(ndrData.history)) {
          // Create a set of existing ndr_reasons for comparison
          const existingReasons = new Set();
          existingNdr.ndr_history.forEach((h) => {
            if (h.ndr_reason) {
              existingReasons.add(h.ndr_reason.trim().toLowerCase());
            }
          });

          // Check if there are any new ndr_reasons in the incoming data
          for (const historyItem of ndrData.history) {
            const ndrReason = (historyItem.ndr_reason || '').trim();
            if (ndrReason && !existingReasons.has(ndrReason.toLowerCase())) {
              historyChanged = true;
              break;
            }
          }
        }

        // If no changes detected, return existing record
        if (!reasonChanged && !attemptsChanged && !ndrRaisedAtChanged && !historyChanged) {
          fastify.log.info(`No changes detected for NDR AWB ${awb}, skipping update`);
          return {
            success: true,
            message: `NDR record exists with no changes for AWB ${awb}`,
            ndrId: existingNdr.id,
          };
        }

        fastify.log.info(
          `Changes detected for NDR AWB ${awb}: reason=${reasonChanged}, attempts=${attemptsChanged}, ndrRaisedAt=${ndrRaisedAtChanged}, history=${historyChanged}`
        );

        // Update existing NDR record
        const updatedNdr = await fastify.prisma.nDROrder.update({
          where: { id: existingNdr.id },
          data: {
            cancellation_reason: ndrData.reason || existingNdr.cancellation_reason,
            attempts: ndrData.attempts || existingNdr.attempts,
            ndr_raised_at: ndrData.ndr_raised_at
              ? new Date(ndrData.ndr_raised_at)
              : existingNdr.ndr_raised_at,
            updated_at: new Date(),
          },
        });

        // Add new history records if there are changes
        if (historyChanged && ndrData.history && Array.isArray(ndrData.history)) {
          // Get existing history reasons to avoid duplicates - simplified approach
          // Check if ndr_reason already exists for this NDR order
          const existingReasons = new Set();
          existingNdr.ndr_history.forEach((h) => {
            if (h.ndr_reason) {
              existingReasons.add(h.ndr_reason.trim().toLowerCase());
            }
          });

          const newHistoryRecords = [];

          for (const historyItem of ndrData.history) {
            const ndrReason = (historyItem.ndr_reason || '').trim();
            const normalizedReason = ndrReason.toLowerCase();

            // Only add if this ndr_reason doesn't already exist for this NDR order
            if (ndrReason && !existingReasons.has(normalizedReason)) {
              newHistoryRecords.push({
                ndr_id: existingNdr.id,
                ndr_reason: ndrReason,
                action_by: historyItem.action_by || null,
                ndr_attempt: historyItem.ndr_attempt || null,
                ndr_push_status: historyItem.ndr_push_status || null,
                comment: historyItem.comment || '',
                call_recording: historyItem.call_center_call_recording || '',
                recording_date: historyItem.call_center_recording_date || '',
                proof_recording: historyItem.proof_recording || '',
                proof_image: historyItem.proof_image || '',
                sms_response: historyItem.sms_response || '',
                ndr_raised_at: historyItem.ndr_raised_at
                  ? new Date(historyItem.ndr_raised_at)
                  : new Date(),
              });

              // Add to the set to prevent duplicates within the same batch
              existingReasons.add(normalizedReason);
            }
          }

          if (newHistoryRecords.length > 0) {
            await fastify.prisma.nDRHistory.createMany({
              data: newHistoryRecords,
              skipDuplicates: true,
            });

            fastify.log.info(
              `Added ${newHistoryRecords.length} new history records for NDR ${existingNdr.id}`
            );
          } else {
            fastify.log.info(`No new unique history records to add for NDR ${existingNdr.id}`);
          }
        }

        fastify.log.info(`Successfully updated NDR record ${existingNdr.id} for AWB ${awb}`);

        return {
          success: true,
          message: `NDR record updated successfully for AWB ${awb}`,
          ndrId: existingNdr.id,
        };
      }

      // Get shipment and order details
      const shipment = await fastify.prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          order: {
            include: {
              customer: true,
            },
          },
          courier: true,
        },
      });

      if (!shipment) {
        return {
          success: false,
          message: `Shipment not found: ${shipmentId}`,
        };
      }

      // Use the actual order ID from the shipment if not provided
      const actualOrderId = orderId || shipment.order_id;

      // Create NDR record
      const ndrRecord = await fastify.prisma.nDROrder.create({
        data: {
          order_id: actualOrderId,
          shipment_id: shipmentId,
          customer_id: shipment.order.customer?.id || '',
          courier_id: shipment.courier_id,
          awb: awb,
          cancellation_reason: ndrData.reason || '',
          attempts: ndrData.attempts || 1,
          ndr_raised_at: ndrData.ndr_raised_at ? new Date(ndrData.ndr_raised_at) : new Date(),
          action_taken: false,
          otp_verified: false, // Default to false for new NDR records
        },
      });

      // Create NDR history records from the API response history
      if (ndrData.history && Array.isArray(ndrData.history)) {
        const seenReasons = new Set<string>();
        const historyRecords = [];

        for (const historyItem of ndrData.history) {
          const ndrReason = (historyItem.ndr_reason || '').trim();
          const normalizedReason = ndrReason.toLowerCase();

          // Only add if this ndr_reason hasn't been seen before in this batch
          if (ndrReason && !seenReasons.has(normalizedReason)) {
            historyRecords.push({
              ndr_id: ndrRecord.id,
              ndr_reason: ndrReason,
              action_by: historyItem.action_by || null,
              ndr_attempt: historyItem.ndr_attempt || null,
              ndr_push_status: historyItem.ndr_push_status || null,
              comment: historyItem.comment || '',
              call_recording: historyItem.call_center_call_recording || '',
              recording_date: historyItem.call_center_recording_date || '',
              proof_recording: historyItem.proof_recording || '',
              proof_image: historyItem.proof_image || '',
              sms_response: historyItem.sms_response || '',
              ndr_raised_at: historyItem.ndr_raised_at
                ? new Date(historyItem.ndr_raised_at)
                : new Date(),
            });

            seenReasons.add(normalizedReason);
          }
        }

        if (historyRecords.length > 0) {
          await fastify.prisma.nDRHistory.createMany({
            data: historyRecords,
            skipDuplicates: true,
          });

          fastify.log.info(
            `Created ${historyRecords.length} unique history records for new NDR ${ndrRecord.id}`
          );
        }
      }

      fastify.log.info(`Successfully created NDR record ${ndrRecord.id} for AWB ${awb}`);

      return {
        success: true,
        message: `NDR record created successfully for AWB ${awb}`,
        ndrId: ndrRecord.id,
      };
    } catch (error) {
      fastify.log.error(`Error processing NDR details for shipment ${shipmentId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process NDR details',
      };
    }
  }

  /**
   * Process RTO shipments for charge deduction and refund processing
   * @param fastify Fastify instance
   * @param batchSize Number of RTO shipments to process in a batch
   * @returns Number of processed RTO shipments
   */
  public static async processRtoShipments(
    fastify: FastifyInstance,
    batchSize: number = 100
  ): Promise<number> {
    try {
      // Find shipments that are marked as RTO but haven't been processed yet
      const rtoShipments = await prisma.shipment.findMany({
        where: {
          bucket: {
            in: [ShipmentBucket.RTO_INITIATED, ShipmentBucket.RTO_IN_TRANSIT],
          },
        },
        include: {
          order: {
            include: {
              user: true,
            },
          },
          pricing: true,
        },
        take: batchSize,
        orderBy: {
          updated_at: 'asc',
        },
      });

      if (rtoShipments.length === 0) {
        fastify.log.info('No RTO shipments to process');
        return 0;
      }

      fastify.log.info(`Processing ${rtoShipments.length} RTO shipments`);

      let processed = 0;
      const concurrency = pLimit(5); // Process 5 RTO shipments concurrently
      const chargeProcessingService = new ChargeProcessingService(fastify);

      const processingPromises = rtoShipments.map((shipment: any) =>
        concurrency(async () => {
          try {
            // Check if shipment is already in RTO status to avoid duplicate processing
            if (await chargeProcessingService.hasChargeBeenApplied(shipment.id, ChargeType.RTO_CHARGE)) {
              fastify.log.info(`Shipment ${shipment.id} is already in RTO status`);
              return;
            }
            // Process RTO charges for this shipment
            const chargeResults = await chargeProcessingService.processRtoShipmentCharges(shipment);
            // Log results
            const successfulCharges = chargeResults.filter(r => r.success);
            const failedCharges = chargeResults.filter(r => !r.success);
            if (successfulCharges.length > 0) {
              fastify.log.info(`Processed ${successfulCharges.length} charges for shipment ${shipment.id}: ${successfulCharges.map(c => c.chargeType).join(', ')}`);
            }
            if (failedCharges.length > 0) {
              fastify.log.error(`Failed to process ${failedCharges.length} charges for shipment ${shipment.id}: ${failedCharges.map(c => c.chargeType).join(', ')}`);
            }
            // Count as processed if at least one charge was processed
            if (successfulCharges.length > 0) {
              processed++;
            }
          } catch (error) {
            fastify.log.error(
              `Failed to process charges for shipment ${shipment.id}: ${error}`
            );
          }
        })
      );

      await Promise.all(processingPromises);

      fastify.log.info(`Successfully processed ${processed} RTO shipments with charge deductions`);
      return processed;
    } catch (error) {
      fastify.log.error(`Error processing RTO shipments: ${error}`);
      throw error;
    }
  }
}

/**
 * Process a single shipment tracking retry
 *
 * @param fastify Fastify instance
 * @param shipmentService Shipment service
 * @param shipmentId Shipment ID
 */
export async function processTrackingRetry(
  fastify: FastifyInstance,
  shipmentService: ShipmentService,
  shipmentId: string
): Promise<TrackingResult> {
  try {
    fastify.log.info(`Processing tracking retry for shipment ${shipmentId}`);

    // Get shipment details
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        awb: true,
        status: true,
        order: {
          select: {
            id: true,
            code: true,
          },
        },
        courier: {
          select: {
            channel_config: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!shipment || !shipment.awb || !shipment.courier?.channel_config?.name) {
      return {
        shipmentId,
        awb: shipment?.awb || null,
        previousStatus: shipment?.status || ShipmentStatus.NEW,
        success: false,
        message: 'Shipment not found or missing required data',
      };
    }

    // Check if shipment is in a final state
    if (ShipmentBucketManager.isFinalStatus(shipment.status)) {
      return {
        shipmentId,
        awb: shipment.awb,
        previousStatus: shipment.status,
        success: true,
        message: `Shipment is in final status (${shipment.status}), no tracking needed`,
      };
    }

    // Process the single shipment
    const result = await shipmentService.processShipmentTrackingBatch([shipment]);

    if (result.results.length === 0) {
      return {
        shipmentId,
        awb: shipment.awb,
        previousStatus: shipment.status,
        success: false,
        message: 'No tracking result returned',
      };
    }

    // Return the first result
    const firstResult = result.results[0];
    if (firstResult) {
      return {
        shipmentId,
        awb: shipment.awb,
        previousStatus: shipment.status,
        newStatus: firstResult.newStatus,
        newBucket: firstResult.newBucket,
        success: firstResult.success,
        message: firstResult.message,
      };
    } else {
      return {
        shipmentId,
        awb: shipment.awb,
        previousStatus: shipment.status,
        success: false,
        message: 'No tracking result details available',
      };
    }
  } catch (error) {
    fastify.log.error(`Error processing tracking retry for shipment ${shipmentId}:`, error);
    return {
      shipmentId,
      awb: null,
      previousStatus: ShipmentStatus.NEW,
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during tracking retry',
    };
  }
}
