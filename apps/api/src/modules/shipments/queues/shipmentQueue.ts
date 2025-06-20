import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { ShipmentService } from '../services/shipmentService';
import { z } from 'zod';
import { CreateShipmentSchema } from '@lorrigo/utils';
import { queues, QueueNames } from '@/lib/queue';
import fs from 'fs';
import path from 'path';
import { ShipmentStatus } from '@lorrigo/db';
import { APP_CONFIG } from '@/config/app';
import { redis } from '@/lib/redis';
import { QueueEvents } from 'bullmq';
import { generateCsvReport, mergePdfBuffers, BulkOperationResult } from '@/modules/bulk-operations/utils/file-utils';
import pLimit from 'p-limit';

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
}

/**
 * Interface for bulk operation job data
 */
interface BulkOperationJobData {
  type: string;
  data: any[];
  userId: string;
  operationId: string;
}

/**
 * Initialize the shipment queue
 * @param fastify Fastify instance
 * @param shipmentService Shipment service instance
 */
export function initShipmentQueue(fastify: FastifyInstance, shipmentService: ShipmentService) {
  // Initialize the bulk operation queue
  const queue = fastify.queues[QueueNames.BULK_OPERATION];
  
  // Initialize the worker
  if (!queue) {
    fastify.log.error('Bulk operation queue not initialized in queue.ts');
    return { queue: null, worker: null };
  }

  // Create the worker
  const worker = new Worker(
    QueueNames.BULK_OPERATION,
    async (job: Job) => {
      fastify.log.info(`Processing job ${job.id} of type ${job.name}`);

      try {
        switch (job.name) {
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
    }, {
    connection: redis,
    prefix: APP_CONFIG.REDIS.PREFIX,
    concurrency: 10, // Adjust based on your needs
  });

  // Log worker events
  worker.on('completed', (job) => {
    fastify.log.info(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    fastify.log.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  worker.on('error', (err) => {
    fastify.log.error(`Worker error: ${err.message}`);
  });

  // Initialize queue events for monitoring
  const queueEvents = new QueueEvents(QueueNames.BULK_OPERATION, {
    connection: redis,
    prefix: APP_CONFIG.REDIS.PREFIX,
  });

  queueEvents.on('waiting', ({ jobId }) => {
    fastify.log.info(`Job ${jobId} is waiting`);
  });

  queueEvents.on('active', ({ jobId }) => {
    fastify.log.info(`Job ${jobId} is active`);
  });

  return { queue, worker };
}

/**
 * Process bulk shipment creation with parallel processing and multiple courier fallbacks
 * @param job Job data
 * @param fastify Fastify instance
 * @param shipmentService Shipment service
 */
async function processBulkCreateShipment(
  job: Job<BulkOperationJobData>,
  fastify: FastifyInstance,
  shipmentService: ShipmentService
) {
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
              message: shipmentData.is_schedule_pickup
                ? 'Shipment created and pickup scheduled successfully'
                : 'Shipment created successfully',
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
async function processBulkSchedulePickup(
  job: Job<BulkOperationJobData>,
  fastify: FastifyInstance,
  shipmentService: ShipmentService
) {
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
        // Schedule the pickup
        const result = await shipmentService.schedulePickup(
          item.shipment_id,
          userId,
          item.pickup_date
        );

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
async function processBulkCancelShipment(
  job: Job<BulkOperationJobData>,
  fastify: FastifyInstance,
  shipmentService: ShipmentService
) {
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
        // Cancel the shipment
        const result = await shipmentService.cancelShipment(
          item.shipment_id,
          'shipment',
          userId,
          item.reason
        );

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
async function processBulkDownloadLabel(
  job: Job<BulkOperationJobData>,
  fastify: FastifyInstance,
  shipmentService: ShipmentService
) {
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
        const labelResult = await vendorService.generateLabel(
          shipment.courier?.channel_config?.name || '',
          {
            awb: shipment.awb,
            shipment,
          }
        );

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
async function processBulkEditPickupAddress(
  job: Job<BulkOperationJobData>,
  fastify: FastifyInstance,
  shipmentService: ShipmentService
) {
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
            status: {
              in: [
                ShipmentStatus.NEW,
                ShipmentStatus.COURIER_ASSIGNED,
                ShipmentStatus.PICKUP_SCHEDULED
              ],
            },
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
