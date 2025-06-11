import { Queue, Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { ShipmentService } from '../services/shipmentService';
import { z } from 'zod';
import { CreateShipmentSchema } from '@lorrigo/utils';

// Queue names
const SHIPMENT_QUEUE = 'shipment-queue';
const BULK_OPERATION_QUEUE = 'bulk-operation-queue';

/**
 * Job types for the shipment queue
 */
export enum JobType {
  CREATE_SHIPMENT = 'create-shipment',
  SCHEDULE_PICKUP = 'schedule-pickup',
  CANCEL_SHIPMENT = 'cancel-shipment',
  BULK_CREATE_SHIPMENT = 'bulk-create-shipment',
  BULK_SCHEDULE_PICKUP = 'bulk-schedule-pickup',
  BULK_CANCEL_SHIPMENT = 'bulk-cancel-shipment'
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
  // Get Redis connection details from environment or config
  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined
  };

  // Create the queue
  const bulkOperationQueue = new Queue(BULK_OPERATION_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: 1000 // Keep last 1000 failed jobs
    }
  });

  // Create the worker
  const worker = new Worker(BULK_OPERATION_QUEUE, async (job: Job) => {
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
  }, { connection });

  // Handle worker events
  worker.on('completed', (job) => {
    fastify.log.info(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    fastify.log.error(`Job ${job?.id} failed: ${error}`);
  });

  // Add the queue to the fastify instance for use in other parts of the application
  (fastify as any).bulkOperationQueue = bulkOperationQueue;

  return { queue: bulkOperationQueue, worker };
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
  const { data, userId, operationId } = job.data;
  const results: BulkOperationResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Process each shipment
  for (let i = 0; i < data.length; i++) {
    try {
      // Validate the data
      const shipmentData = data[i];
      const validatedData = CreateShipmentSchema.parse(shipmentData);

      // Create the shipment
      const result = await shipmentService.createShipment(validatedData, userId);

      if (result.error) {
        failedCount++;
        results.push({
          id: shipmentData.order_id || 'unknown',
          success: false,
          message: result.error
        });
      } else {
        successCount++;
        results.push({
          id: shipmentData.order_id || 'unknown',
          success: true,
          message: shipmentData.schedule_pickup 
            ? 'Shipment created and pickup scheduled successfully' 
            : 'Shipment created successfully',
          data: !result.error ? result : null
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
          failed_count: failedCount
        }
      });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].order_id || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update job progress
      await job.updateProgress(Math.floor(((i + 1) / data.length) * 100));

      // Update bulk operation status
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: i + 1,
          success_count: successCount,
          failed_count: failedCount
        }
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
      failed_count: failedCount
    }
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
          message: result.error
        });
      } else {
        successCount++;
        results.push({
          id: data[i].shipment_id,
          success: true,
          message: 'Pickup scheduled successfully',
          data: result
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
          failed_count: failedCount
        }
      });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].shipment_id || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update job progress
      await job.updateProgress(Math.floor(((i + 1) / data.length) * 100));

      // Update bulk operation status
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: i + 1,
          success_count: successCount,
          failed_count: failedCount
        }
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
      failed_count: failedCount
    }
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
        data[i].shipmentId,
        userId,
        data[i].reason
      );

      if (result.error) {
        failedCount++;
        results.push({
          id: data[i].shipmentId,
          success: false,
          message: result.error
        });
      } else {
        successCount++;
        results.push({
          id: data[i].shipmentId,
          success: true,
          message: 'Shipment cancelled successfully',
          data: result
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
          failed_count: failedCount
        }
      });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].shipmentId || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update job progress
      await job.updateProgress(Math.floor(((i + 1) / data.length) * 100));

      // Update bulk operation status
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: i + 1,
          success_count: successCount,
          failed_count: failedCount
        }
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
      failed_count: failedCount
    }
  });

  return { success: true, results };
} 