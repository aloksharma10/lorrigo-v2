import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { ShipmentService } from '../services/shipmentService';
import { z } from 'zod';
import { CreateShipmentSchema } from '@lorrigo/utils';
import { queues, QueueNames } from '@/lib/queue';

// Job types for the shipment queue
export enum JobType {
  CREATE_SHIPMENT = 'create-shipment',
  SCHEDULE_PICKUP = 'schedule-pickup',
  CANCEL_SHIPMENT = 'cancel-shipment',
  BULK_CREATE_SHIPMENT = 'bulk-create-shipment',
  BULK_SCHEDULE_PICKUP = 'bulk-schedule-pickup',
  BULK_CANCEL_SHIPMENT = 'bulk-cancel-shipment',
}

/**
 * Interface for bulk operation job data
 */
interface BulkOperationJobData {
  type: string;
  data: any[];
  userId: string;
  operationId: string;
  isBulkShipment?: boolean;
}

/**
 * Interface for bulk operation result
 */
interface BulkOperationResult {
  id: string;
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Initialize the shipment queue
 * @param fastify Fastify instance
 * @param shipmentService Shipment service instance
 */
export function initShipmentQueue(fastify: FastifyInstance, shipmentService: ShipmentService) {
  try {
    // Get the queue from the centralized queue.ts
    const bulkOperationQueue = queues[QueueNames.BULK_OPERATION];

    if (!bulkOperationQueue) {
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
            default:
              throw new Error(`Unknown job type: ${job.name}`);
          }
        } catch (error) {
          fastify.log.error(`Error processing job ${job.id}: ${error}`);
          throw error;
        }
      },
      {
        connection: bulkOperationQueue.opts.connection,
        concurrency: 5, // Process up to 5 jobs concurrently
        autorun: true, // Ensure worker starts automatically
        lockDuration: 30000, // 30 seconds lock
        lockRenewTime: 15000, // Renew lock every 15 seconds
        stalledInterval: 30000, // Check for stalled jobs every 30 seconds
        maxStalledCount: 3, // Allow 3 stalls before job is considered failed
      }
    );
    // Handle worker events
    worker.on('completed', (job) => {
      fastify.log.info(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      fastify.log.error(`Job ${job?.id} failed: ${error}`);
    });

    // Handle connection errors
    worker.on('error', (error) => {
      fastify.log.error(`Worker connection error: ${error}`);
    });

    worker.on('active', (job) => {
      fastify.log.info(`Job ${job.id} has started processing`);
    });

    worker.on('stalled', (jobId) => {
      fastify.log.warn(`Job ${jobId} has stalled`);
    });

    fastify.log.info('Shipment queue worker initialized successfully');

    // Register a cleanup function for graceful shutdown
    fastify.addHook('onClose', async () => {
      fastify.log.info('Closing shipment queue worker');
      await worker.close();
    });

    fastify.log.info('Shipment queue initialized successfully');
    return { queue: bulkOperationQueue, worker };
  } catch (error) {
    fastify.log.error(`Failed to initialize shipment queue: ${error}`);
    // Return empty objects to prevent errors elsewhere in the code
    return { queue: null, worker: null };
  }
}

/**
 * Process bulk shipment creation
 * @param job Job data
 * @param fastify Fastify instance
 * @param shipmentService Shipment service
 */
async function processBulkCreateShipment(
  job: Job<BulkOperationJobData>,
  fastify: FastifyInstance,
  shipmentService: ShipmentService
) {
  const { data, userId, operationId, isBulkShipment } = job.data;
  const results: BulkOperationResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  console.log('chla chla data', data);
  // Process each shipment
  for (let i = 0; i < data.length; i++) {
    try {
      // Validate the data
      const shipmentData = {
        ...data[i],
        isBulkShipment: isBulkShipment || true, // Ensure bulk shipment flag is set
      };
      const validatedData = CreateShipmentSchema.parse(shipmentData);

      // Create the shipment
      const result = await shipmentService.createShipment(validatedData, userId);

      if (result.error) {
        failedCount++;
        results.push({
          id: shipmentData.order_id || 'unknown',
          success: false,
          message: result.error,
        });
      } else {
        successCount++;
        results.push({
          id: shipmentData.order_id || 'unknown',
          success: true,
          message: shipmentData.schedule_pickup
            ? 'Shipment created and pickup scheduled successfully'
            : 'Shipment created successfully',
          data: !result.error ? result : null,
        });
      }

      // Update job progress
      await job.updateProgress(Math.floor(((i + 1) / data.length) * 100));

      // Update bulk operation status
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: i + 1,
          success_count: successCount,
          failed_count: failedCount,
        },
      });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].order_id || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      // Update job progress
      await job.updateProgress(Math.floor(((i + 1) / data.length) * 100));

      // Update bulk operation status
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: i + 1,
          success_count: successCount,
          failed_count: failedCount,
        },
      });
    }
  }

  // Update bulk operation status to completed
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'COMPLETED',
      processed_count: data.length,
      success_count: successCount,
      failed_count: failedCount,
    },
  });

  return { success: true, results };
}

/**
 * Process bulk schedule pickup
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

  // Process each pickup
  for (let i = 0; i < data.length; i++) {
    try {
      // Schedule the pickup
      const result = await shipmentService.schedulePickup(
        data[i].shipment_id,
        userId,
        data[i].pickup_date
      );

      if (result.error) {
        failedCount++;
        results.push({
          id: data[i].shipment_id,
          success: false,
          message: result.error,
        });
      } else {
        successCount++;
        results.push({
          id: data[i].shipment_id,
          success: true,
          message: 'Pickup scheduled successfully',
          data: result,
        });
      }

      // Update job progress
      await job.updateProgress(Math.floor(((i + 1) / data.length) * 100));

      // Update bulk operation status
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: i + 1,
          success_count: successCount,
          failed_count: failedCount,
        },
      });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].shipment_id || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      // Update job progress
      await job.updateProgress(Math.floor(((i + 1) / data.length) * 100));

      // Update bulk operation status
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: i + 1,
          success_count: successCount,
          failed_count: failedCount,
        },
      });
    }
  }

  // Update bulk operation status to completed
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'COMPLETED',
      processed_count: data.length,
      success_count: successCount,
      failed_count: failedCount,
    },
  });

  return { success: true, results };
}

/**
 * Process bulk cancel shipment
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

  // Process each shipment
  for (let i = 0; i < data.length; i++) {
    try {
      // Cancel the shipment
      const result = await shipmentService.cancelShipment(
        data[i].shipment_id,
        'shipment',
        userId,
        data[i].reason
      );

      if (result.error) {
        failedCount++;
        results.push({
          id: data[i].shipment_id,
          success: false,
          message: result.error,
        });
      } else {
        successCount++;
        results.push({
          id: data[i].shipment_id,
          success: true,
          message: 'Shipment cancelled successfully',
          data: result,
        });
      }

      // Update job progress
      await job.updateProgress(Math.floor(((i + 1) / data.length) * 100));

      // Update bulk operation status
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: i + 1,
          success_count: successCount,
          failed_count: failedCount,
        },
      });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].shipment_id || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      // Update job progress
      await job.updateProgress(Math.floor(((i + 1) / data.length) * 100));

      // Update bulk operation status
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: i + 1,
          success_count: successCount,
          failed_count: failedCount,
        },
      });
    }
  }

  // Update bulk operation status to completed
  await fastify.prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: 'COMPLETED',
      processed_count: data.length,
      success_count: successCount,
      failed_count: failedCount,
    },
  });

  return { success: true, results };
}
