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
 * Interface for bulk operation result
 */
interface BulkOperationResult {
  id: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
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
      const shipmentData = data[i];

      // Calculate shipping rates directly in the queue worker
      const ratesResult = await shipmentService.getShipmentRates(shipmentData.order_id, userId);

      if (!ratesResult.rates || ratesResult.rates.length === 0) {
        failedCount++;
        results.push({
          id: shipmentData.order_id || 'unknown',
          success: false,
          message: 'No shipping rates available for this order',
          error: ratesResult.error || 'No shipping rates available'
        });
        continue;
      }

      // Find the courier rate that matches the courier_id
      const selectedRate = ratesResult.rates.find((rate: { id: string }) => rate.id === shipmentData.courier_id);

      if (!selectedRate) {
        failedCount++;
        results.push({
          id: shipmentData.order_id || 'unknown',
          success: false,
          message: 'Selected courier not available for this order',
          error: 'Selected courier not available'
        });
        continue;
      }

      // Validate the data
      // const validatedData = CreateShipmentSchema.parse(shipmentData);

      // Create the shipment
      // const result = await shipmentService.createShipment(validatedData, userId);

      // if (result.error) {
      //   failedCount++;
      //   results.push({
      //     id: shipmentData.order_id || 'unknown',
      //     success: false,
      //     message: result.error,
      //     error: result.error
      //   });
      // } else {
      //   successCount++;
      //   results.push({
      //     id: shipmentData.order_id || 'unknown',
      //     success: true,
      //     message: shipmentData.schedule_pickup
      //       ? 'Shipment created and pickup scheduled successfully'
      //       : 'Shipment created successfully',
      //     data: result.shipment
      //   });
      // }

      // // Update job progress
      // await job.updateProgress(Math.floor(((i + 1) / data.length) * 100));

      // // Update bulk operation status
      // await fastify.prisma.bulkOperation.update({
      //   where: { id: operationId },
      //   data: {
      //     processed_count: i + 1,
      //     success_count: successCount,
      //     failed_count: failedCount,
      //     results: JSON.stringify(results)
      //   },
      // });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].order_id || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
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
          results: JSON.stringify(results)
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
      results: JSON.stringify(results)
    },
  });

  // Generate CSV report
  await generateCsvReport(operationId, results, fastify);

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
          error: result.error
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
          results: JSON.stringify(results)
        },
      });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].shipment_id || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
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
          results: JSON.stringify(results)
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
      results: JSON.stringify(results)
    },
  });

  // Generate CSV report
  await generateCsvReport(operationId, results, fastify);

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
          error: result.error
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
          results: JSON.stringify(results)
        },
      });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].shipment_id || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
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
          results: JSON.stringify(results)
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
      results: JSON.stringify(results)
    },
  });

  // Generate CSV report
  await generateCsvReport(operationId, results, fastify);

  return { success: true, results };
}

/**
 * Process bulk download label
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

  // Process each shipment
  for (let i = 0; i < data.length; i++) {
    try {
      // Get shipment details
      const shipment = await fastify.prisma.shipment.findFirst({
        where: {
          id: data[i].shipment_id,
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
        failedCount++;
        results.push({
          id: data[i].shipment_id,
          success: false,
          message: 'Shipment not found or AWB missing',
          error: 'Shipment not found or AWB missing'
        });
        continue;
      }

      // Generate label using vendor service
      const labelResult = await shipmentService.vendorService.generateLabel(
        shipment.courier?.channel_config?.name || '',
        {
          awb: shipment.awb,
          shipment,
        }
      );

      if (!labelResult.success || !labelResult.pdfBuffer) {
        failedCount++;
        results.push({
          id: data[i].shipment_id,
          success: false,
          message: labelResult.message || 'Failed to generate label',
          error: labelResult.message || 'Failed to generate label'
        });
      } else {
        successCount++;
        results.push({
          id: data[i].shipment_id,
          success: true,
          message: 'Label generated successfully',
        });

        // Add PDF buffer to array for later merging
        pdfBuffers.push(labelResult.pdfBuffer);
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
          results: JSON.stringify(results)
        },
      });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].shipment_id || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
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
          results: JSON.stringify(results)
        },
      });
    }
  }

  // Merge PDF buffers if any were generated
  let mergedPdfBuffer: Buffer | null = null;
  if (pdfBuffers.length > 0) {
    try {
      // Here you would use a PDF library to merge the buffers
      // For example, with pdf-lib or pdfkit
      // This is a placeholder for the actual implementation
      mergedPdfBuffer = Buffer.concat(pdfBuffers);

      // Save the merged PDF to a file
      const uploadsDir = path.join(process.cwd(), 'uploads', 'labels');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const pdfPath = path.join(uploadsDir, `bulk_labels_${operationId}.pdf`);
      fs.writeFileSync(pdfPath, mergedPdfBuffer);

      // Update the bulk operation with the PDF path
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          file_path: pdfPath,
        },
      });
    } catch (error) {
      fastify.log.error(`Error merging PDF buffers: ${error}`);
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
      results: JSON.stringify(results)
    },
  });

  // Generate CSV report
  await generateCsvReport(operationId, results, fastify);

  return {
    success: true,
    results,
    pdfBuffer: mergedPdfBuffer

  };
}

/**
 * Process bulk edit pickup address
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

  // Process each shipment
  for (let i = 0; i < data.length; i++) {
    try {
      const { shipment_id, hub_id } = data[i];

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
        failedCount++;
        results.push({
          id: shipment_id,
          success: false,
          message: 'Shipment not found or cannot be edited',
          error: 'Shipment not found or cannot be edited'
        });
        continue;
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
        failedCount++;
        results.push({
          id: shipment_id,
          success: false,
          message: 'Pickup hub not found',
          error: 'Pickup hub not found'
        });
        continue;
      }

      // Update order with new hub
      await fastify.prisma.order.update({
        where: { id: shipment.order_id },
        data: {
          hub_id: hub_id,
        },
      });

      successCount++;
      results.push({
        id: shipment_id,
        success: true,
        message: 'Pickup address updated successfully',
        data: { hub_id, hub_name: hub.name },
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
          results: JSON.stringify(results)
        },
      });
    } catch (error) {
      failedCount++;
      results.push({
        id: data[i].shipment_id || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
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
          results: JSON.stringify(results)
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
      results: JSON.stringify(results)
    },
  });

  // Generate CSV report
  await generateCsvReport(operationId, results, fastify);

  return { success: true, results };
}

/**
 * Generate CSV report for bulk operation
 * @param operationId Bulk operation ID
 * @param results Operation results
 * @param fastify Fastify instance
 */
async function generateCsvReport(
  operationId: string,
  results: BulkOperationResult[],
  fastify: FastifyInstance
): Promise<boolean> {
  try {
    // Create CSV header
    const header = 'ID,Success,Message,Error,Timestamp\n';

    // Format data for CSV
    const rows = results.map(result => {
      const id = result.id || '';
      const success = result.success ? 'Yes' : 'No';
      const message = (result.message || '').replace(/,/g, ';').replace(/\n/g, ' ');
      const error = (result.error || '').replace(/,/g, ';').replace(/\n/g, ' ');
      const timestamp = new Date().toISOString();

      return `"${id}","${success}","${message}","${error}","${timestamp}"`;
    }).join('\n');

    // Generate CSV content
    const csvContent = header + rows;

    // Create directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'reports');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Write CSV file
    const csvPath = path.join(uploadsDir, `bulk_operation_${operationId}.csv`);
    fs.writeFileSync(csvPath, csvContent);

    // Update bulk operation with CSV path
    await fastify.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        report_path: csvPath,
      },
    });

    fastify.log.info(`CSV report generated for operation ${operationId}`);
    return true;
  } catch (error) {
    fastify.log.error(`Error generating CSV report: ${error}`);
    return false;
  }
}
