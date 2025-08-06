import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { ShipmentService } from '../services/shipmentService';
import { CreateShipmentSchema, ShipmentBucketManager } from '@lorrigo/utils';
import { QueueNames, addJob, initQueueEvents } from '@/lib/queue';
import { APP_CONFIG } from '@/config/app';
import { redis } from '@/lib/redis';
import { generateCsvReport, mergePdfBuffers, BulkOperationResult } from '@/modules/bulk-operations/utils/file-utils';
import pLimit from 'p-limit';
import csv from 'csvtojson';
import { TransactionEntityType, TransactionType } from '@/modules/transactions/services/transaction-service';
import { processTrackingRetry, TrackingProcessor, TrackingProcessorConfig, processBulkShipmentTracking } from '../batch/processor';
import { ChargeType, ShipmentStatus } from '@lorrigo/db';
import { getOrderZoneFromCourierZone } from '@/utils/calculate-order-price';
import { TransactionJobType } from '@/modules/transactions/queues/transaction-worker';
import { VendorService } from '@/modules/vendors/vendor.service';
import { ShopifySyncService } from '@/modules/channels/services/shopify/shopify-sync-service';

// Job types for the shipment queue
export enum JobType {
  CREATE_SHIPMENT = 'create-shipment',
  SCHEDULE_PICKUP = 'schedule-pickup',
  CANCEL_SHIPMENT = 'cancel-shipment',
  BULK_CREATE_SHIPMENT = 'bulk-create-shipment',
  BULK_SCHEDULE_PICKUP = 'bulk-schedule-pickup',
  BULK_CANCEL_SHIPMENT = 'bulk-cancel-shipment',
  BULK_DOWNLOAD_LABEL = 'bulk-download-label',
  BULK_EDIT_PICKUP_ADDRESS = 'bulk-edit-pickup-address',
  TRACK_SHIPMENTS = 'track-shipments',
  RETRY_TRACK_SHIPMENT = 'retry-track-shipment',
  PROCESS_RTO_CHARGES = 'process-rto-charges',
  PROCESS_RTO = 'process-rto',
  PROCESS_BULK_STATUS_UPDATES = 'process-bulk-status-updates',
  PROCESS_UNMAPPED_STATUSES = 'process-unmapped-statuses',
  PROCESS_EDD_UPDATES = 'process-edd-updates',
  PROCESS_NDR_DETAILS = 'process-ndr-details',
  PROCESS_BULK_TRACKING_EVENTS = 'process-bulk-tracking-events',
  PROCESS_DISPUTE_ACTIONS_CSV = 'process-dispute-actions-csv',
  BULK_PROCESS_TRANSACTIONS = 'bulk-process-transactions',
}

/**
 * Interface for bulk operation job data
 */
interface BulkOperationJobData {
  type: string;
  reason: string;
  data: any[];
  userId: string;
  operationId: string;
  pickup_date: string;
}

/**
 * Interface for tracking job data
 */
interface TrackingJobData {
  batchSize?: number;
  config?: Partial<TrackingProcessorConfig>;
  shipmentId?: string;
}

/**
 * Interface for RTO charges job data
 */
interface RtoChargesJobData {
  shipmentId: string;
  orderId: string;
}

/**
 * Interface for NDR details job data
 */
interface NdrDetailsJobData {
  shipmentId: string;
  awb: string;
  vendorName: string;
  orderId: string;
}

/**
 * Initialize the shipment queue
 * @param fastify Fastify instance
 * @param shipmentService Shipment service instance
 */
export function initShipmentQueue(fastify: FastifyInstance, shipmentService: ShipmentService, vendorService: VendorService) {
  // Initialize the bulk operation queue
  const bulkOperationQueue = fastify.queues[QueueNames.BULK_OPERATION];

  // Initialize the shipment tracking queue
  const trackingQueue = fastify.queues[QueueNames.SHIPMENT_TRACKING];

  // Initialize the workers
  if (!bulkOperationQueue) {
    fastify.log.error('Bulk operation queue not initialized in queue.ts');
    return {
      bulkOperationQueue: null,
      bulkOperationWorker: null,
      trackingQueue: null,
      trackingWorker: null,
    };
  }

  if (!trackingQueue) {
    fastify.log.error('Shipment tracking queue not initialized in queue.ts');
    return {
      bulkOperationQueue,
      bulkOperationWorker: null,
      trackingQueue: null,
      trackingWorker: null,
    };
  }

  // Initialize queue events for monitoring
  const bulkOperationQueueEvents = initQueueEvents(fastify, QueueNames.BULK_OPERATION);
  const trackingQueueEvents = initQueueEvents(fastify, QueueNames.SHIPMENT_TRACKING);

  // Create the bulk operation worker
  const bulkOperationWorker = new Worker(
    QueueNames.BULK_OPERATION,
    async (job: Job) => {
      fastify.log.info(`Processing job ${job.id} of type ${job.name}`);

      try {
        switch (job.name) {
          case JobType.CREATE_SHIPMENT:
            return await processVendorShipmentCreation(job.data, fastify, shipmentService, vendorService);
          case JobType.BULK_CREATE_SHIPMENT:
            return await processBulkCreateShipment(job, fastify, shipmentService);
          case JobType.BULK_SCHEDULE_PICKUP:
            return await processBulkSchedulePickup(job, fastify, shipmentService);
          case JobType.BULK_CANCEL_SHIPMENT:
            return await processBulkCancelShipment(job, fastify, shipmentService);
          case JobType.BULK_DOWNLOAD_LABEL:
            return await processBulkDownloadLabel(job, fastify, shipmentService);
          case JobType.BULK_EDIT_PICKUP_ADDRESS:
            return await processBulkEditPickupAddress(job, fastify, shipmentService);
          case JobType.PROCESS_DISPUTE_ACTIONS_CSV:
            return await processDisputeActionsCsv(job, fastify);
          default:
            throw new Error(`Unknown job type: ${job.name}`);
        }
      } catch (error) {
        fastify.log.error(`Error processing job ${job.id}: ${error}`);

        // Update bulk operation status to failed
        try {
          const { operationId } = job.data;
          await fastify.prisma.bulkOperation.update({
            where: { id: operationId },
            data: {
              status: 'FAILED',
              error_message: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } catch (updateError) {
          fastify.log.error(`Failed to update bulk operation status: ${updateError}`);
        }

        throw error;
      }
    },
    {
      connection: redis,
      prefix: APP_CONFIG.REDIS.PREFIX,
      concurrency: 10, // Process up to 10 bulk operations concurrently
      limiter: {
        max: 5, // Maximum number of jobs to process per time window
        duration: 1000, // Time window in ms (1 second)
      },
      // Custom backoff strategy for retries
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          const baseDelay = 5000; // 5 seconds
          const maxDelay = 300000; // 5 minutes
          // Exponential backoff with full jitter
          const expDelay = Math.min(maxDelay, baseDelay * Math.pow(2, attemptsMade));
          return Math.floor(Math.random() * expDelay);
        },
      },
      maxStalledCount: 2, // Consider a job stalled after 2 checks
      stalledInterval: 15000, // Check for stalled jobs every 15 seconds
    }
  );

  // Create the tracking worker with optimized settings
  const trackingWorker = new Worker(
    QueueNames.SHIPMENT_TRACKING,
    async (job: Job) => {
      fastify.log.info(`Processing tracking job ${job.id} of type ${job.name}`);

      try {
        switch (job.name) {
          case JobType.TRACK_SHIPMENTS:
            const { batchSize, config } = job.data as TrackingJobData;
            // return await processShipmentTracking(
            //   fastify,
            //   shipmentService,
            //   { batchSize: batchSize || 50, ...config },
            //   job // Pass the job as the fourth argument
            // );
            return processOptimizedBulkStatusUpdates(fastify);

          case JobType.RETRY_TRACK_SHIPMENT:
            const { shipmentId } = job.data as TrackingJobData;
            if (!shipmentId) {
              throw new Error('Missing shipment ID for retry tracking');
            }
            return await processTrackingRetry(fastify, shipmentService, shipmentId);

          case JobType.PROCESS_RTO_CHARGES:
            const { shipmentId: rtoShipmentId, orderId } = job.data as RtoChargesJobData;
            if (!rtoShipmentId || !orderId) {
              throw new Error('Missing shipment ID or order ID for RTO charges');
            }
            return await TrackingProcessor.processRtoCharges(fastify, rtoShipmentId, orderId);

          case JobType.PROCESS_BULK_STATUS_UPDATES:
            return await processOptimizedBulkStatusUpdates(fastify);

          case JobType.PROCESS_UNMAPPED_STATUSES:
            return await TrackingProcessor.processUnmappedStatuses(fastify);

          case JobType.PROCESS_EDD_UPDATES:
            return await TrackingProcessor.processBulkEddUpdates(fastify);

          case JobType.PROCESS_RTO:
            const { batchSize: rtoBatchSize } = job.data as TrackingJobData;
            return await TrackingProcessor.processRtoShipments(fastify, rtoBatchSize || 100);

          case JobType.PROCESS_NDR_DETAILS:
            const { shipmentId: ndrShipmentId, awb, vendorName, orderId: ndrOrderId } = job.data as NdrDetailsJobData;
            if (!ndrShipmentId || !awb || !vendorName) {
              throw new Error('Missing required data for NDR details processing');
            }
            return await TrackingProcessor.processNdrDetails(fastify, shipmentService, ndrShipmentId, awb, vendorName, ndrOrderId);

          case JobType.PROCESS_BULK_TRACKING_EVENTS:
            return await TrackingProcessor.processBulkTrackingEvents(fastify);

          default:
            throw new Error(`Unknown tracking job type: ${job.name}`);
        }
      } catch (error) {
        fastify.log.error(`Error processing tracking job ${job.id}: ${error}`);
        throw error;
      }
    },
    {
      connection: redis,
      prefix: APP_CONFIG.REDIS.PREFIX,
      concurrency: 3, // Process up to 3 tracking jobs concurrently
      limiter: {
        max: 10, // Maximum number of jobs to process per time window
        duration: 1000, // Time window in ms (1 second)
      },
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          const baseDelay = 3000; // 3 seconds
          const maxDelay = 60000; // 1 minute
          return maxDelay * Math.pow(2, attemptsMade);
        },
      },
      maxStalledCount: 2, // Consider a job stalled after 2 checks
      stalledInterval: 15000, // Check for stalled jobs every 15 seconds
    }
  );

  // Log bulk operation worker events
  bulkOperationWorker.on('completed', (job) => {
    fastify.log.info(`Bulk operation job ${job.id} completed successfully`);
  });

  bulkOperationWorker.on('failed', (job, err) => {
    fastify.log.error(`Bulk operation job ${job?.id} failed with error:`, err instanceof Error ? err.stack || err.message : JSON.stringify(err));
  });

  bulkOperationWorker.on('error', (err) => {
    fastify.log.error('Bulk operation worker error:', err instanceof Error ? err.stack || err.message : JSON.stringify(err));
  });

  // Log tracking worker events
  trackingWorker.on('completed', (job) => {
    fastify.log.info(`Tracking job ${job.id} completed successfully`);
  });

  trackingWorker.on('failed', (job, err) => {
    fastify.log.error(`Tracking job ${job?.id} failed with error: ${err.message}`);

    // Handle "Missing key for job repeat" error by attempting to recover
    if (err.message?.includes('Missing key for job repeat')) {
      try {
        // Attempt to recover by cleaning up orphaned repeat jobs
        // const { cleanupOrphanedRepeatJobs } = require('@/lib/queue');
        fastify.log.warn(`Detected "Missing key for job repeat" error for job ${job?.id}, attempting recovery...`);
        // cleanupOrphanedRepeatJobs().then(() => {
        //   fastify.log.info(`Recovery attempt completed for job ${job?.id}`);
        // }).catch((cleanupErr: Error) => {
        //   fastify.log.error(`Recovery attempt failed for job ${job?.id}: ${cleanupErr.message}`);
        // });
      } catch (recoveryErr: unknown) {
        const errMsg = recoveryErr instanceof Error ? recoveryErr.message : 'Unknown error';
        fastify.log.error(`Failed to initiate recovery for job ${job?.id}: ${errMsg}`);
      }
    }
  });

  trackingWorker.on('error', (err) => {
    fastify.log.error(`Tracking worker error: ${err.message}`);

    // Handle "Missing key for job repeat" error by attempting to recover
    if (err.message?.includes('Missing key for job repeat')) {
      try {
        // Attempt to recover by cleaning up orphaned repeat jobs
        // const { cleanupOrphanedRepeatJobs } = require('@/lib/queue');
        fastify.log.warn(`Detected "Missing key for job repeat" error, attempting recovery...`);
        // cleanupOrphanedRepeatJobs().then(() => {
        //   fastify.log.info(`Recovery attempt completed for tracking worker error`);
        // }).catch((cleanupErr: Error) => {
        //   fastify.log.error(`Recovery attempt failed for tracking worker error: ${cleanupErr.message}`);
        // });
      } catch (recoveryErr: unknown) {
        const errMsg = recoveryErr instanceof Error ? recoveryErr.message : 'Unknown error';
        fastify.log.error(`Failed to initiate recovery for tracking worker error: ${errMsg}`);
      }
    }
  });

  // Setup graceful shutdown
  const gracefulShutdown = async () => {
    fastify.log.info('Shutting down queue workers gracefully...');

    // Close the workers
    await Promise.all([bulkOperationWorker.close(), trackingWorker.close()]);

    // Close the queue events
    await Promise.all([bulkOperationQueueEvents.close(), trackingQueueEvents.close()]);

    fastify.log.info('Queue workers shut down successfully');
  };

  // Register shutdown handlers
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return {
    bulkOperationQueue,
    bulkOperationWorker,
    trackingQueue,
    trackingWorker,
    gracefulShutdown,
  };
}

async function processVendorShipmentCreation(jobData: any, fastify: FastifyInstance, shipmentService: ShipmentService, vendorService: VendorService) {
  const {
    shipmentId,
    order,
    courier,
    shipmentCode,
    isSchedulePickup,
    selectedCourierRate,
    courier_curr_zone_pricing,
    fwCharges,
    codCharges,
    userId,
    isReverseOrder,
    vendorResult,
  } = jobData;

  try {
    // Step 1: Create shipment on vendor's platform

    const awb = vendorResult.awb;
    const hubCity = order.hub?.address?.city || 'Unknown';
    const orderZone = getOrderZoneFromCourierZone(selectedCourierRate.zoneName);

    // Step 2: Update shipment with vendor details in a single transaction
    await fastify.prisma.$transaction(async (prisma) => {
      // Update main shipment record
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          awb,
          sr_shipment_id: vendorResult.data?.sr_shipment_id?.toString() || '',
          status: isSchedulePickup ? ShipmentStatus.PICKUP_SCHEDULED : ShipmentStatus.COURIER_ASSIGNED,
          bucket: ShipmentBucketManager.getBucketFromStatus(isSchedulePickup ? ShipmentStatus.PICKUP_SCHEDULED : ShipmentStatus.COURIER_ASSIGNED),
          pickup_date: isSchedulePickup && vendorResult.pickup_date ? new Date(vendorResult.pickup_date) : null,
          routing_code: vendorResult.routingCode,
        },
      });

      // Create tracking event
      await prisma.trackingEvent.create({
        data: {
          shipment_id: shipmentId,
          status: isSchedulePickup ? ShipmentStatus.PICKUP_SCHEDULED : ShipmentStatus.COURIER_ASSIGNED,
          location: hubCity,
          description: isSchedulePickup ? 'Shipment created and pickup scheduled' : 'Shipment created and ready for pickup',
        },
      });

      // Create shipment pricing
      await prisma.shipmentPricing.create({
        data: {
          shipment_id: shipmentId,
          cod_charge_hard: selectedCourierRate.cod.hardCharge,
          cod_charge_percent: selectedCourierRate.cod.percentCharge,
          is_fw_applicable: selectedCourierRate.pricing.pricing.is_fw_applicable,
          is_rto_applicable: selectedCourierRate.pricing.pricing.is_rto_applicable,
          is_cod_applicable: selectedCourierRate.pricing.pricing.is_cod_applicable,
          is_cod_reversal_applicable: selectedCourierRate.pricing.pricing.is_cod_reversal_applicable,
          weight_slab: selectedCourierRate.pricing.pricing.weight_slab,
          increment_weight: selectedCourierRate.pricing.pricing.increment_weight,
          zone: orderZone,
          is_rto_same_as_fw: courier_curr_zone_pricing.is_rto_same_as_fw,
          increment_price: courier_curr_zone_pricing.increment_price,
          base_price: courier_curr_zone_pricing.base_price,
          rto_base_price: courier_curr_zone_pricing.rto_base_price,
          rto_increment_price: courier_curr_zone_pricing.rto_increment_price,
          flat_rto_charge: courier_curr_zone_pricing.flat_rto_charge,
          courier_other_zone_pricing: {
            createMany: {
              data: selectedCourierRate.pricing.pricing.zone_pricing.map((zone: any) => {
                const { id, plan_courier_pricing_id, created_at, updated_at, ...rest } = zone;
                return { ...rest };
              }),
            },
          },
        },
      });
    });

    // Step 3: Queue transaction processing
    await addJob(QueueNames.TRANSACTION_QUEUE, TransactionJobType.BULK_PROCESS_TRANSACTIONS, {
      transactions: [
        {
          shipmentId: shipmentId,
          userId: userId,
          amount: fwCharges,
          type: TransactionType.DEBIT,
          description: `${isReverseOrder ? 'Reverse' : 'Forward'} charge for AWB: ${awb}`,
          awb: awb,
          charge_type: ChargeType.FORWARD_CHARGE,
        },
        {
          shipmentId: shipmentId,
          userId: userId,
          awb: awb,
          amount: codCharges,
          type: TransactionType.DEBIT,
          description: `COD charge for AWB: ${awb}`,
          charge_type: ChargeType.COD_CHARGE,
        },
      ],
      entityType: TransactionEntityType.SHIPMENT,
    });

    // Step 4: Send tracking information to Shopify if this is a Shopify order
    try {
      const shopifySyncService = new ShopifySyncService(fastify);

      // Generate tracking URL (you may need to adjust this based on your tracking system)
      const trackingUrl = `${process.env.FRONTEND_URL || 'https://app.lorrigo.com'}/tracking/${awb}`;

      // Send tracking to Shopify
      const shopifyResult = await shopifySyncService.sendTrackingToShopify(
        order.id,
        awb,
        trackingUrl,
        ['Tracking Sent', 'Courier Assigned'] // Add relevant tags
      );

      if (shopifyResult.success) {
        fastify.log.info(`Shopify tracking update successful for order ${order.id}, AWB: ${awb}`);
      } else {
        fastify.log.warn(`Shopify tracking update failed for order ${order.id}: ${shopifyResult.error}`);
      }
    } catch (shopifyError) {
      // Don't fail the entire shipment creation if Shopify update fails
      fastify.log.error(`Error updating Shopify tracking for order ${order.id}:`, shopifyError);
    }

    // Step 5: Emit real-time update to frontend
    // fastify.io.to(`user-${userId}`).emit('shipment-updated', {
    //   shipmentId,
    //   awb,
    //   status: isSchedulePickup ? ShipmentStatus.PICKUP_SCHEDULED : ShipmentStatus.COURIER_ASSIGNED,
    //   pickup_date: isSchedulePickup && vendorResult.pickup_date ? vendorResult.pickup_date : null,
    // });
  } catch (error) {
    fastify.log.error(`Error in background vendor shipment creation for shipment ${shipmentId}:`, error);

    // Update shipment status to indicate failure
    await fastify.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: 'AWAITING',
        bucket: ShipmentBucketManager.getBucketFromStatus(ShipmentStatus.AWAITING),
      },
    });

    // Emit error to frontend
    // fastify.io.to(`user-${userId}`).emit('shipment-error', {
    //   shipmentId,
    //   error: 'Failed to create shipment with vendor',
    // });
  }
}

/**
 * Process bulk shipment creation with parallel processing and multiple courier fallbacks
 * @param job Job data
 * @param fastify Fastify instance
 * @param shipmentService Shipment service
 */
async function processBulkCreateShipment(job: Job<BulkOperationJobData>, fastify: FastifyInstance, shipmentService: ShipmentService) {
  const { data, userId, operationId } = job.data;
  const results: BulkOperationResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Update bulk operation status to processing
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'PROCESSING',
    },
  });

  // Create a limit function for controlling concurrency
  // Process 5 shipments at a time to avoid overloading the system
  const limit = pLimit(5);

  // Create an array of promises for parallel processing
  const promises = data.map((shipmentData, index) => {
    return limit(async () => {
      try {
        // Get order ID from shipment data
        const orderId = shipmentData.order_id;
        if (!orderId) {
          return {
            id: `unknown-${index}`,
            success: false,
            message: 'Missing order ID',
            error: 'Missing order ID',
            timestamp: new Date(),
          };
        }

        // Calculate shipping rates
        const ratesResult = await shipmentService.getShipmentRates(orderId, userId);

        if (!ratesResult.rates || ratesResult.rates.length === 0) {
          return {
            id: orderId,
            success: false,
            message: 'No shipping rates available for this order',
            error: ratesResult.error || 'No shipping rates available',
            timestamp: new Date(),
          };
        }

        // Get courier IDs from shipment data
        const courierIds = shipmentData.courier_ids || [];
        if (courierIds.length === 0) {
          return {
            id: orderId,
            success: false,
            message: 'No courier IDs provided',
            error: 'No courier IDs provided',
            timestamp: new Date(),
          };
        }

        // Try each courier in order until one succeeds
        for (const courierId of courierIds) {
          // Find the courier rate that matches the courier ID
          const selectedRate = ratesResult.rates.find((rate: { id: string }) => rate.id === courierId);

          if (!selectedRate) {
            fastify.log.info(`Courier ${courierId} not available for order ${orderId}, trying next courier`);
            continue; // Try next courier
          }

          // Prepare data for shipment creation
          const shipmentCreateData = {
            order_id: orderId,
            courier_id: courierId,
            is_schedule_pickup: shipmentData.is_schedule_pickup || false,
          };

          // Validate the data
          try {
            CreateShipmentSchema.parse(shipmentCreateData);
          } catch (error) {
            fastify.log.error(`Validation error for order ${orderId}: ${error}`);
            continue; // Try next courier
          }

          // Create the shipment
          const result = await shipmentService.createShipment(shipmentCreateData, userId);

          if (result.error) {
            fastify.log.error(`Failed to create shipment for order ${orderId} with courier ${courierId}: ${result.error}`);
            // Continue to next courier if this one failed
            continue;
          } else {
            // Success! Return the result and stop trying other couriers
            return {
              id: orderId,
              success: true,
              message: shipmentData.is_schedule_pickup ? 'Shipment created and pickup scheduled successfully' : 'Shipment created successfully',
              data: result.shipment,
              timestamp: new Date(),
            };
          }
        }

        // If we get here, all couriers failed
        return {
          id: orderId,
          success: false,
          message: 'All couriers failed to create shipment',
          error: 'All couriers failed to create shipment',
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          id: shipmentData.order_id || `unknown-${index}`,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
    });
  });

  // Process all shipments in parallel with concurrency limit
  const processedResults = await Promise.all(promises);

  // Count successes and failures
  for (const result of processedResults) {
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
    results.push(result);
  }

  // Update bulk operation status to completed
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'COMPLETED',
      processed_count: data.length,
      success_count: successCount,
      failed_count: failedCount,
      results: JSON.stringify(results),
    },
  });

  // Generate CSV report
  await generateCsvReport(operationId, results, fastify);

  // Update job progress to 100%
  await job.updateProgress(100);

  return { success: true, results };
}

/**
 * Process bulk schedule pickup with parallel processing
 * @param job Job data
 * @param fastify Fastify instance
 * @param shipmentService Shipment service
 */
async function processBulkSchedulePickup(job: Job<BulkOperationJobData>, fastify: FastifyInstance, shipmentService: ShipmentService) {
  const { data, userId, operationId, pickup_date } = job.data;
  const results: BulkOperationResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Update bulk operation status to processing
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'PROCESSING',
    },
  });

  // Create a limit function for controlling concurrency
  const limit = pLimit(5);

  // Create an array of promises for parallel processing
  const promises = data.map((item, index) => {
    return limit(async () => {
      try {
        // Schedule the pickup
        const result = await shipmentService.schedulePickup(item.shipment_id, userId, pickup_date);

        if (result.error) {
          return {
            id: item.shipment_id,
            success: false,
            message: result.error,
            error: result.error,
            timestamp: new Date(),
          };
        } else {
          return {
            id: item.shipment_id,
            success: true,
            message: 'Pickup scheduled successfully',
            data: result,
            timestamp: new Date(),
          };
        }
      } catch (error) {
        return {
          id: item.shipment_id || `unknown-${index}`,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
    });
  });

  // Process all pickups in parallel with concurrency limit
  const processedResults = await Promise.all(promises);

  // Count successes and failures
  for (const result of processedResults) {
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
    results.push(result);
  }

  // Update bulk operation status to completed
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'COMPLETED',
      processed_count: data.length,
      success_count: successCount,
      failed_count: failedCount,
      results: JSON.stringify(results),
    },
  });

  // Generate CSV report
  await generateCsvReport(operationId, results, fastify);

  // Update job progress to 100%
  await job.updateProgress(100);

  return { success: true, results };
}

/**
 * Process bulk cancel shipment with parallel processing
 * @param job Job data
 * @param fastify Fastify instance
 * @param shipmentService Shipment service
 */
async function processBulkCancelShipment(job: Job<BulkOperationJobData>, fastify: FastifyInstance, shipmentService: ShipmentService) {
  const { data, userId, operationId, reason } = job.data;
  const results: BulkOperationResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Update bulk operation status to processing
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'PROCESSING',
    },
  });

  // Create a limit function for controlling concurrency
  const limit = pLimit(5);

  // Create an array of promises for parallel processing
  const promises = data.map((item, index) => {
    return limit(async () => {
      try {
        // Cancel the shipment
        const result = await shipmentService.cancelShipment(item.shipment_id, 'shipment', userId, reason);

        if (result.error) {
          return {
            id: item.shipment_id,
            success: false,
            message: result.error,
            error: result.error,
            timestamp: new Date(),
          };
        } else {
          return {
            id: item.shipment_id,
            success: true,
            message: 'Shipment cancelled successfully',
            data: result,
            timestamp: new Date(),
          };
        }
      } catch (error) {
        return {
          id: item.shipment_id || `unknown-${index}`,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
    });
  });

  // Process all cancellations in parallel with concurrency limit
  const processedResults = await Promise.all(promises);

  // Count successes and failures
  for (const result of processedResults) {
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
    results.push(result);
  }

  // Update bulk operation status to completed
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'COMPLETED',
      processed_count: data.length,
      success_count: successCount,
      failed_count: failedCount,
      results: JSON.stringify(results),
    },
  });

  // Generate CSV report
  await generateCsvReport(operationId, results, fastify);

  // Update job progress to 100%
  await job.updateProgress(100);

  return { success: true, results };
}

/**
 * Process bulk download label with parallel processing
 * @param job Job data
 * @param fastify Fastify instance
 * @param shipmentService Shipment service
 */
async function processBulkDownloadLabel(job: Job<BulkOperationJobData>, fastify: FastifyInstance, shipmentService: ShipmentService) {
  const { data, userId, operationId } = job.data;
  const results: BulkOperationResult[] = [];
  let successCount = 0;
  let failedCount = 0;
  const pdfBuffers: Buffer[] = [];

  // Update bulk operation status to processing
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'PROCESSING',
    },
  });

  // Create a limit function for controlling concurrency
  const limit = pLimit(3); // Lower concurrency for PDF generation which is resource-intensive

  // Create an array of promises for parallel processing
  const promises = data.map((item, index) => {
    return limit(async () => {
      try {
        // Get shipment details
        const shipment = await fastify.prisma.shipment.findFirst({
          where: {
            id: item.shipment_id,
            user_id: userId,
          },
          include: {
            courier: {
              include: {
                channel_config: true,
              },
            },
          },
        });

        if (!shipment || !shipment.awb) {
          return {
            id: item.shipment_id,
            success: false,
            message: 'Shipment not found or AWB missing',
            error: 'Shipment not found or AWB missing',
            timestamp: new Date(),
            pdfBuffer: null,
          };
        }

        // Access the VendorService through the shipment service
        // Since vendorService is private, we need to use a workaround
        // Create a temporary instance of VendorService
        const VendorServiceClass = require('@/modules/vendors/vendor.service').VendorService;
        const vendorService = new VendorServiceClass(fastify);

        // Generate label using vendor service
        const labelResult = await vendorService.generateLabel(shipment.courier?.channel_config?.name || '', {
          awb: shipment.awb,
          shipment,
        });

        if (!labelResult.success || !labelResult.pdfBuffer) {
          return {
            id: item.shipment_id,
            success: false,
            message: labelResult.message || 'Failed to generate label',
            error: labelResult.message || 'Failed to generate label',
            timestamp: new Date(),
            pdfBuffer: null,
          };
        } else {
          return {
            id: item.shipment_id,
            success: true,
            message: 'Label generated successfully',
            timestamp: new Date(),
            pdfBuffer: labelResult.pdfBuffer,
          };
        }
      } catch (error) {
        return {
          id: item.shipment_id || `unknown-${index}`,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          pdfBuffer: null,
        };
      }
    });
  });

  // Process all label generations in parallel with concurrency limit
  const processedResults = await Promise.all(promises);

  // Count successes and failures and collect PDF buffers
  for (const result of processedResults) {
    if (result.success && result.pdfBuffer) {
      successCount++;
      pdfBuffers.push(result.pdfBuffer);
    } else {
      failedCount++;
    }

    // Remove the pdfBuffer before storing the result to avoid large JSON
    const { pdfBuffer, ...resultWithoutBuffer } = result;
    results.push(resultWithoutBuffer);
  }

  // Merge PDF buffers if any were generated
  if (pdfBuffers.length > 0) {
    await mergePdfBuffers(pdfBuffers, operationId, fastify);
  }

  // Update bulk operation status to completed
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'COMPLETED',
      processed_count: data.length,
      success_count: successCount,
      failed_count: failedCount,
      results: JSON.stringify(results),
    },
  });

  // Generate CSV report
  await generateCsvReport(operationId, results, fastify);

  // Update job progress to 100%
  await job.updateProgress(100);

  return { success: true, results };
}

/**
 * Process bulk edit pickup address with parallel processing
 * @param job Job data
 * @param fastify Fastify instance
 * @param shipmentService Shipment service
 */
async function processBulkEditPickupAddress(job: Job<BulkOperationJobData>, fastify: FastifyInstance, shipmentService: ShipmentService) {
  const { data, userId, operationId } = job.data;
  const results: BulkOperationResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Update bulk operation status to processing
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'PROCESSING',
    },
  });

  // Create a limit function for controlling concurrency
  const limit = pLimit(5);

  // Create an array of promises for parallel processing
  const promises = data.map((item, index) => {
    return limit(async () => {
      try {
        const { shipment_id, hub_id } = item;

        // Verify shipment exists and belongs to user
        const shipment = await fastify.prisma.shipment.findFirst({
          where: {
            id: shipment_id,
            user_id: userId,
            status: ShipmentStatus.NEW,
          },
          include: {
            order: true,
          },
        });

        if (!shipment) {
          return {
            id: shipment_id,
            success: false,
            message: 'Shipment not found or cannot be edited',
            error: 'Shipment not found or cannot be edited',
            timestamp: new Date(),
          };
        }

        // Verify hub exists and belongs to user
        const hub = await fastify.prisma.hub.findFirst({
          where: {
            id: hub_id,
            user_id: userId,
            is_active: true,
          },
          include: {
            address: true,
          },
        });

        if (!hub) {
          return {
            id: shipment_id,
            success: false,
            message: 'Pickup hub not found',
            error: 'Pickup hub not found',
            timestamp: new Date(),
          };
        }

        // Update order with new hub
        await fastify.prisma.order.update({
          where: { id: shipment.order_id },
          data: {
            hub_id: hub_id,
          },
        });

        return {
          id: shipment_id,
          success: true,
          message: 'Pickup address updated successfully',
          data: { hub_id, hub_name: hub.name },
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          id: item.shipment_id || `unknown-${index}`,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
    });
  });

  // Process all address updates in parallel with concurrency limit
  const processedResults = await Promise.all(promises);

  // Count successes and failures
  for (const result of processedResults) {
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
    results.push(result);
  }

  // Update bulk operation status to completed
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'COMPLETED',
      processed_count: data.length,
      success_count: successCount,
      failed_count: failedCount,
      results: JSON.stringify(results),
    },
  });

  // Generate CSV report
  await generateCsvReport(operationId, results, fastify);

  // Update job progress to 100%
  await job.updateProgress(100);

  return { success: true, results };
}

/**
 * Optimized bulk status updates using the new bulk processing function
 */
async function processOptimizedBulkStatusUpdates(fastify: FastifyInstance): Promise<{
  processed: number;
  updated: number;
  rtoProcessed: number;
  errors: Array<{ shipmentId: string; error: string }>;
}> {
  try {
    const BATCH_SIZE = 100;

    // Get shipments that need status updates
    const shipments = await fastify.prisma.shipment.findMany({
      where: {
        awb: { not: null },
        status: {
          notIn: [ShipmentStatus.DELIVERED, ShipmentStatus.RTO_DELIVERED, ShipmentStatus.CANCELLED_SHIPMENT, ShipmentStatus.CANCELLED_ORDER],
        },
      },
      select: {
        id: true,
        awb: true,
        status: true,
        bucket: true,
        user_id: true,
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
      take: BATCH_SIZE,
      orderBy: { updated_at: 'asc' },
    });

    if (shipments.length === 0) {
      return { processed: 0, updated: 0, rtoProcessed: 0, errors: [] };
    }

    // Use the optimized bulk processing function
    const shipmentService = new (await import('../services/shipmentService')).ShipmentService(
      fastify,
      new (await import('../../orders/services/order-service')).OrderService(fastify)
    );

    const result = await processBulkShipmentTracking(fastify, shipmentService, shipments);

    fastify.log.info(`Optimized bulk status update completed: ${result.updated} updated, ${result.rtoProcessed} RTO processed`);

    return result;
  } catch (error) {
    fastify.log.error(`Error in optimized bulk status updates: ${error}`);
    return { processed: 0, updated: 0, rtoProcessed: 0, errors: [] };
  }
}

async function processDisputeActionsCsv(job: Job, fastify: FastifyInstance) {
  const { csvPath, operationId, actor } = job.data as { csvPath: string; operationId: string; actor: 'ADMIN' | 'SELLER' };
  try {
    const rows = await csv().fromFile(csvPath);
    let processed = 0;

    for (const row of rows) {
      const awb = String(row['AWB'] || row['awb']).trim();
      const action = String(row['Action'] || row['action']).toUpperCase();
      const finalWeightField = row['final_weight'] || row['Final weight'] || row['Final_Weight'];
      const finalWeight = finalWeightField ? parseFloat(finalWeightField) : undefined;

      const shipment = await fastify.prisma.shipment.findFirst({ where: { awb } });
      if (!shipment) continue;

      const dispute = await fastify.prisma.weightDispute.findFirst({ where: { order_id: shipment.order_id } });
      if (!dispute) continue;

      if (actor === 'SELLER') {
        // seller can ACCEPT or RAISED (raise evidence)
        if (action === 'ACCEPT') {
          await fastify.prisma.weightDispute.update({
            where: { id: dispute.id },
            data: {
              status: 'RESOLVED',
              seller_action_taken: true,
            },
          });
        } else if (action === 'RAISED') {
          await fastify.prisma.weightDispute.update({
            where: { id: dispute.id },
            data: {
              status: 'RAISED_BY_SELLER',
              seller_action_taken: true,
            },
          });
        }
      } else {
        // ADMIN flow: ACCEPT / REJECT, optional final_weight
        if (action === 'ACCEPT') {
          const updateData: any = { status: 'RESOLVED' };
          if (finalWeight) {
            updateData.final_weight = finalWeight;
          }
          await fastify.prisma.weightDispute.update({ where: { id: dispute.id }, data: updateData });
          // apply wallet debit/credit if needed using TransactionService
        } else if (action === 'REJECT') {
          await fastify.prisma.weightDispute.update({ where: { id: dispute.id }, data: { status: 'REJECTED' } });
        }
      }
      processed++;
    }

    await fastify.prisma.bulkOperation.update({
      where: { id: operationId },
      data: { status: 'COMPLETED', processed_count: processed, success_count: processed },
    });
    return { processed };
  } catch (err) {
    fastify.log.error(err);
    await fastify.prisma.bulkOperation.update({ where: { id: operationId }, data: { status: 'FAILED', error_message: (err as Error).message } });
    throw err;
  }
}
