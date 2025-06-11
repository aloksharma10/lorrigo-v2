import { Queue, Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { ShipmentService } from '../services/shipmentService';
import { z } from 'zod';
import { CreateShipmentSchema } from '@lorrigo/utils';

// Queue names
export const SHIPMENT_QUEUE = 'shipment-queue';
export const BULK_OPERATION_QUEUE = 'bulk-operation-queue';

// Job types
export enum JobType {
  CREATE_SHIPMENT = 'create-shipment',
  SCHEDULE_PICKUP = 'schedule-pickup',
  CANCEL_SHIPMENT = 'cancel-shipment',
  BULK_CREATE_SHIPMENT = 'bulk-create-shipment',
  BULK_SCHEDULE_PICKUP = 'bulk-schedule-pickup',
  BULK_CANCEL_SHIPMENT = 'bulk-cancel-shipment'
}

interface BulkOperationResult {
  id: string;
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Initialize shipment queue and worker processors
 * @param fastify Fastify instance
 * @param shipmentService Shipment service instance
 */
export function initShipmentQueue(fastify: FastifyInstance, shipmentService: ShipmentService) {
  const connection = {
    host: fastify.config.REDIS_HOST,
    port: parseInt(fastify.config.REDIS_PORT),
    password: fastify.config.REDIS_PASSWORD
  };

  // Create queues
  const shipmentQueue = new Queue(SHIPMENT_QUEUE, { connection });
  const bulkOperationQueue = new Queue(BULK_OPERATION_QUEUE, { connection });

  // Create worker for regular shipment operations
  const shipmentWorker = new Worker(SHIPMENT_QUEUE, async (job: Job) => {
    const { type, data, userId } = job.data;

    switch (type) {
      case JobType.CREATE_SHIPMENT:
        return await shipmentService.createShipment(data, userId);

      case JobType.SCHEDULE_PICKUP:
        return await shipmentService.schedulePickup(data.id, userId, data.pickupDate);

      case JobType.CANCEL_SHIPMENT:
        return await shipmentService.cancelShipment(data.id, userId, data.reason);

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }, { connection });

  // Create worker for bulk operations
  const bulkOperationWorker = new Worker(BULK_OPERATION_QUEUE, async (job: Job) => {
    const { type, data, userId, operationId } = job.data;
    const results: BulkOperationResult[] = [];
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    try {
      // Update operation status to PROCESSING
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'PROCESSING',
          processed_count: 0,
          success_count: 0,
          failed_count: 0
        }
      });

      // Process each item in batches
      switch (type) {
        case JobType.BULK_CREATE_SHIPMENT:
          for (const item of data) {
            try {
              processedCount++;
              
              // Update progress
              await job.updateProgress(Math.floor((processedCount / data.length) * 100));
              
              // Validate the data
              const validatedData = CreateShipmentSchema.parse(item);
              
              // Create the shipment
              const result = await shipmentService.createShipment(validatedData, userId);
              
              if (result.error) {
                failedCount++;
                results.push({
                  id: item.order_id,
                  success: false,
                  message: result.error
                });
              } else {
                successCount++;
                results.push({
                  id: item.order_id,
                  success: true,
                  message: 'Shipment created successfully',
                  data: result.shipment
                });
              }
              
              // Update operation status periodically
              if (processedCount % 10 === 0 || processedCount === data.length) {
                await fastify.prisma.bulkOperation.update({
                  where: { id: operationId },
                  data: {
                    processed_count: processedCount,
                    success_count: successCount,
                    failed_count: failedCount
                  }
                });
              }
            } catch (error) {
              failedCount++;
              results.push({
                id: item.order_id,
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          break;

        case JobType.BULK_SCHEDULE_PICKUP:
          for (const item of data) {
            try {
              processedCount++;
              
              // Update progress
              await job.updateProgress(Math.floor((processedCount / data.length) * 100));
              
              // Schedule the pickup
              const result = await shipmentService.schedulePickup(
                item.shipment_id,
                userId,
                item.pickup_date
              );
              
              if (result.error) {
                failedCount++;
                results.push({
                  id: item.shipment_id,
                  success: false,
                  message: result.error
                });
              } else {
                successCount++;
                results.push({
                  id: item.shipment_id,
                  success: true,
                  message: 'Pickup scheduled successfully',
                  data: result
                });
              }
              
              // Update operation status periodically
              if (processedCount % 10 === 0 || processedCount === data.length) {
                await fastify.prisma.bulkOperation.update({
                  where: { id: operationId },
                  data: {
                    processed_count: processedCount,
                    success_count: successCount,
                    failed_count: failedCount
                  }
                });
              }
            } catch (error) {
              failedCount++;
              results.push({
                id: item.shipment_id,
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          break;

        case JobType.BULK_CANCEL_SHIPMENT:
          for (const item of data) {
            try {
              processedCount++;
              
              // Update progress
              await job.updateProgress(Math.floor((processedCount / data.length) * 100));
              
              // Cancel the shipment
              const result = await shipmentService.cancelShipment(
                item.shipment_id,
                userId,
                item.reason
              );
              
              if (result.error) {
                failedCount++;
                results.push({
                  id: item.shipment_id,
                  success: false,
                  message: result.error
                });
              } else {
                successCount++;
                results.push({
                  id: item.shipment_id,
                  success: true,
                  message: 'Shipment cancelled successfully',
                  data: result
                });
              }
              
              // Update operation status periodically
              if (processedCount % 10 === 0 || processedCount === data.length) {
                await fastify.prisma.bulkOperation.update({
                  where: { id: operationId },
                  data: {
                    processed_count: processedCount,
                    success_count: successCount,
                    failed_count: failedCount
                  }
                });
              }
            } catch (error) {
              failedCount++;
              results.push({
                id: item.shipment_id,
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          break;

        default:
          throw new Error(`Unknown bulk operation type: ${type}`);
      }

      // Update operation status to COMPLETED
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'COMPLETED',
          processed_count: processedCount,
          success_count: successCount,
          failed_count: failedCount
        }
      });

      return {
        success: true,
        results,
        total: data.length,
        processed: processedCount,
        successful: successCount,
        failed: failedCount
      };
    } catch (error) {
      // Update operation status to FAILED
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'FAILED',
          processed_count: processedCount,
          success_count: successCount,
          failed_count: failedCount
        }
      });

      throw error;
    }
  }, { connection });

  // Handle worker events
  shipmentWorker.on('completed', (job) => {
    fastify.log.info(`Shipment job ${job.id} completed`);
  });

  shipmentWorker.on('failed', (job, error) => {
    fastify.log.error(`Shipment job ${job?.id} failed: ${error.message}`);
  });

  bulkOperationWorker.on('completed', (job) => {
    fastify.log.info(`Bulk operation job ${job.id} completed`);
  });

  bulkOperationWorker.on('failed', (job, error) => {
    fastify.log.error(`Bulk operation job ${job?.id} failed: ${error.message}`);
  });

  // Add queues to fastify instance for easy access
  fastify.decorate('shipmentQueue', shipmentQueue);
  fastify.decorate('bulkOperationQueue', bulkOperationQueue);

  // Clean up on shutdown
  fastify.addHook('onClose', async (instance) => {
    await shipmentWorker.close();
    await bulkOperationWorker.close();
    await shipmentQueue.close();
    await bulkOperationQueue.close();
  });

  return { shipmentQueue, bulkOperationQueue };
} 