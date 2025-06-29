import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { OrderService } from '../services/order-service';
import { QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';
import { APP_CONFIG } from '@/config/app';
import { OrderFormValues } from '@lorrigo/utils';
import pLimit from 'p-limit';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@lorrigo/db';

// Job types for bulk order processing
export enum BulkOrderJobType {
  PROCESS_BULK_ORDERS = 'PROCESS_BULK_ORDERS',
  VALIDATE_ORDERS = 'VALIDATE_ORDERS',
  CREATE_ORDERS_BATCH = 'CREATE_ORDERS_BATCH',
}

// Job data interfaces
export interface BulkOrderJobData {
  operationId: string;
  userId: string;
  userName: string;
  csvContent?: string;
  headerMapping?: Record<string, string>;
  orders?: OrderFormValues[]; // For backward compatibility
  batchIndex?: number;
  totalBatches?: number;
}

export interface BulkOrderResult {
  orderId: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: Date;
}

/**
 * Initialize bulk order processing worker
 * @param fastify Fastify instance
 * @param orderService Order service instance
 */
export function initBulkOrderWorker(fastify: FastifyInstance, orderService: OrderService) {
  // Create worker for bulk order processing
  const bulkOrderWorker = new Worker(
    QueueNames.BULK_ORDER_UPLOAD,
    async (job: Job<BulkOrderJobData>) => {
      fastify.log.info(`Processing bulk order job ${job.id} of type ${job.name}`);

      try {
        switch (job.name) {
          case BulkOrderJobType.PROCESS_BULK_ORDERS:
            return await processBulkOrders(job, fastify, orderService);
          case BulkOrderJobType.VALIDATE_ORDERS:
            return await validateOrders(job, fastify);
          case BulkOrderJobType.CREATE_ORDERS_BATCH:
            return await createOrdersBatch(job, fastify, orderService);
          default:
            throw new Error(`Unknown bulk order job type: ${job.name}`);
        }
      } catch (error) {
        fastify.log.error(`Error processing bulk order job ${job.id}: ${error}`);

        // Update bulk operation status to failed
        try {
          const { operationId } = job.data;
          await fastify.prisma.bulkOperation.update({
            where: { id: operationId },
            data: {
              status: 'FAILED',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date(),
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
      concurrency: 5, // Process up to 5 bulk operations concurrently
      limiter: {
        max: 3, // Maximum number of jobs to process per time window
        duration: 1000, // Time window in ms (1 second)
      },
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          const baseDelay = 5000; // 5 seconds
          const maxDelay = 300000; // 5 minutes
          // Exponential backoff with jitter
          const expDelay = Math.min(maxDelay, baseDelay * Math.pow(2, attemptsMade));
          return Math.floor(Math.random() * expDelay);
        }
      },
      maxStalledCount: 2,
      stalledInterval: 15000,
    }
  );

  // Event handlers
  bulkOrderWorker.on('completed', (job) => {
    fastify.log.info(`Bulk order job ${job.id} completed successfully`);
  });

  bulkOrderWorker.on('failed', (job, err) => {
    fastify.log.error(`Bulk order job ${job?.id} failed with error: ${err.message}`);
  });

  bulkOrderWorker.on('error', (err) => {
    fastify.log.error(`Bulk order worker error: ${err.message}`);
  });

  // Graceful shutdown
  const gracefulShutdown = async () => {
    fastify.log.info('Shutting down bulk order worker gracefully...');
    await bulkOrderWorker.close();
    fastify.log.info('Bulk order worker shut down successfully');
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return { bulkOrderWorker, gracefulShutdown };
}

/**
 * Process bulk orders with parallel processing and chunking for 10L+ orders
 */
async function processBulkOrders(
  job: Job<BulkOrderJobData>,
  fastify: FastifyInstance,
  orderService: OrderService
): Promise<{
  operationId: string;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  reportPath?: string;
  duration: number;
}> {
  const startTime = Date.now();
  const { operationId, userId, userName, csvContent, headerMapping } = job.data;
  
  try {
    if (!csvContent || !headerMapping) {
      throw new Error('CSV content and header mapping are required');
    }

    // Parse CSV and transform to orders
    const csvData = parseCsvContent(csvContent);
    const ordersToProcess = transformCsvToOrders(csvData, headerMapping);
    
    // Update total count in database
    await fastify.prisma.bulkOperation.update({
      where: { id: operationId },
      data: { 
        total_count: ordersToProcess.length,
        status: 'PROCESSING' 
      },
    });

    if (ordersToProcess.length === 0) {
      throw new Error('No valid orders found to process');
    }

    await job.updateProgress(5);

    // Process orders in chunks
    const CHUNK_SIZE = 1000;
    const chunks = chunkArray(ordersToProcess, CHUNK_SIZE);
    const totalChunks = chunks.length;
    const results: BulkOrderResult[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunk = chunks[i];
      if (!chunk || chunk.length === 0) continue;
      
      const chunkResults = await processOrderChunk(chunk, userId, userName, orderService);
      results.push(...chunkResults);

      // Update progress
      const progress = Math.floor(((i + 1) / totalChunks) * 90) + 5; // 5-95%
      await job.updateProgress(progress);

      // Update database with current progress
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: results.length,
          success_count: successCount,
          failed_count: failedCount,
        },
      });
    }

    // Generate report
    const reportPath = await generateCsvReport(results, operationId);
    await job.updateProgress(95);

    // Final update
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    await fastify.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: 'COMPLETED',
        processed_count: results.length,
        success_count: successCount,
        failed_count: failedCount,
        report_path: reportPath,
        updated_at: new Date(),
      },
    });

    await job.updateProgress(100);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    job.log(`Bulk order upload completed: ${successCount} successful, ${failedCount} failed in ${duration}s`);

    return {
      operationId,
      totalProcessed: results.length,
      successCount,
      failedCount,
      reportPath,
      duration,
    };

  } catch (error) {
    job.log(`Bulk order upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Update operation status to failed
    await fastify.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date(),
      },
    });

    throw error;
  }
}

// Chunk processing function
async function processOrderChunk(
  orders: OrderFormValues[],
  userId: string,
  userName: string,
  orderService: OrderService
): Promise<BulkOrderResult[]> {
  const limit = pLimit(50);
  const results: BulkOrderResult[] = [];

  const promises = orders.map((order) =>
    limit(async () => {
      try {
        const createdOrder = await orderService.createOrder(order, userId, userName);
        
        return {
          orderId: order.orderId,
          success: true,
          message: 'Order created successfully',
          data: createdOrder,
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          orderId: order.orderId,
          success: false,
          message: 'Failed to create order',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
    })
  );

  const chunkResults = await Promise.all(promises);
  results.push(...chunkResults);

  return results;
}

// Process orders in batches (for backward compatibility)
async function processOrdersChunk(
  orders: OrderFormValues[] | undefined,
  userId: string,
  userName: string,
  fastify: FastifyInstance,
  orderService: OrderService
): Promise<BulkOrderResult[]> {
  if (!orders) {
    return [];
  }
  // Use the new chunk processing function
  return await processOrderChunk(orders, userId, userName, orderService);
}

// Batch processing for very large datasets
async function processBatchOrders(
  orders: OrderFormValues[] | undefined,
  userId: string,
  userName: string,
  fastify: FastifyInstance,
  orderService: OrderService
): Promise<BulkOrderResult[]> {
  if (!orders) {
    return [];
  }
  // This is a placeholder for future implementation of true bulk insert
  // For now, we'll use the chunk processing approach
  return await processOrderChunk(orders, userId, userName, orderService);
}

// Generate CSV report function
async function generateCsvReport(
  results: BulkOrderResult[],
  operationId: string
): Promise<string> {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'reports');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const fileName = `bulk_order_report_${operationId}.csv`;
    const filePath = path.join(uploadsDir, fileName);
    
    // Generate CSV content
    const headers = ['Order ID', 'Status', 'Message', 'Error', 'Timestamp'];
    const csvRows = [headers.join(',')];
    
    results.forEach(result => {
      const row = [
        result.orderId,
        result.success ? 'SUCCESS' : 'FAILED',
        result.message,
        result.error || '',
        result.timestamp.toISOString(),
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });
    
    const csvContent = csvRows.join('\n');
    await fs.writeFile(filePath, csvContent, 'utf8');
    
    return filePath;
  } catch (error) {
    console.error('Error generating CSV report:', error);
    throw error;
  }
}

/**
 * Validate orders before processing
 */
async function validateOrders(
  job: Job<BulkOrderJobData>,
  fastify: FastifyInstance
): Promise<{ valid: boolean; errors: string[] }> {
  const { orders } = job.data;
  const errors: string[] = [];

  // Basic validation
  if (!orders || !Array.isArray(orders)) {
    errors.push('Orders must be an array');
    return { valid: false, errors };
  }

  if (orders.length === 0) {
    errors.push('Orders array cannot be empty');
    return { valid: false, errors };
  }

  if (orders.length > 1000000) {
    errors.push('Maximum 1,000,000 orders allowed per upload');
    return { valid: false, errors };
  }

  // Validate each order structure
  orders.forEach((order, index) => {
    if (!order.orderId) {
      errors.push(`Order at index ${index}: orderId is required`);
    }
    if (!order.pickupAddressId) {
      errors.push(`Order at index ${index}: pickupAddressId is required`);
    }
    if (!order.deliveryDetails?.mobileNumber) {
      errors.push(`Order at index ${index}: Customer mobile number is required`);
    }
    if (!order.productDetails?.products?.length) {
      errors.push(`Order at index ${index}: At least one product is required`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Create a batch of orders using bulk insert
 */
async function createOrdersBatch(
  job: Job<BulkOrderJobData>,
  fastify: FastifyInstance,
  orderService: OrderService
): Promise<BulkOrderResult[]> {
  const { orders, userId, userName } = job.data;
  
  // This is a placeholder for future implementation of true bulk insert
  // For now, we'll use the chunk processing approach
  return await processOrdersChunk(orders, userId, userName, fastify, orderService);
}

// CSV parsing and transformation functions
function parseCsvContent(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const firstLine = lines[0];
  if (!firstLine) return [];
  
  const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    if (!currentLine) continue;
    
    const values = currentLine.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return data;
}

function transformCsvToOrders(csvData: any[], mapping: Record<string, string>): OrderFormValues[] {
  return csvData.map((row, index) => {
    try {
      const order: OrderFormValues = {
        orderId: row[mapping.orderId || ''] || `ORDER_${Date.now()}_${index}`,
        orderChannel: row[mapping.orderChannel || ''] || 'CUSTOM',
        orderType: (row[mapping.orderType || ''] || 'domestic') as 'domestic' | 'international',
        pickupAddressId: row[mapping.pickupAddressId || ''],
        
        deliveryDetails: {
          isBusiness: false,
          fullName: row[mapping.customerName || ''],
          mobileNumber: row[mapping.customerPhone || ''],
          email: row[mapping.customerEmail || ''] || '',
          completeAddress: row[mapping.deliveryAddress || ''],
          landmark: row[mapping.deliveryLandmark || ''] || '',
          pincode: row[mapping.deliveryPincode || ''],
          city: row[mapping.deliveryCity || ''] || '',
          state: row[mapping.deliveryState || ''] || '',
          billingIsSameAsDelivery: true,
          billingFullName: '',
          billingMobileNumber: '',
          billingCompleteAddress: '',
          billingLandmark: '',
          billingPincode: '',
          billingCity: '',
          billingState: '',
        },
        
        sellerDetails: {
          name: row[mapping.sellerName || ''],
          isAddressAvailable: true,
          gstNo: row[mapping.sellerGstNo || ''] || '',
          contactNumber: row[mapping.sellerContact || ''],
          address: row[mapping.sellerAddress || ''],
          pincode: row[mapping.sellerPincode || ''],
          city: '',
          state: '',
          country: 'India',
        },
        
        productDetails: {
          products: [{
            id: `product_${index}`,
            name: row[mapping.productName || ''],
            sku: row[mapping.productSku || ''] || '',
            quantity: parseInt(row[mapping.productQuantity || '']) || 1,
            price: parseFloat(row[mapping.productPrice || '']) || 0,
            taxRate: parseFloat(row[mapping.productTax || '']) || 0,
            hsnCode: row[mapping.productHsn || ''] || '',
          }],
          taxableValue: parseFloat(row[mapping.taxableValue || '']) || 0,
        },
        
        packageDetails: {
          deadWeight: row[mapping.packageWeight || ''] || '0.5',
          length: row[mapping.packageLength || ''] || '10',
          breadth: row[mapping.packageBreadth || ''] || '10',
          height: row[mapping.packageHeight || ''] || '10',
          volumetricWeight: '0',
        },
        
        paymentMethod: {
          paymentMethod: (row[mapping.paymentMethod || ''] || 'prepaid').toLowerCase(),
        },
        
        amountToCollect: parseFloat(row[mapping.amountToCollect || '']) || 0,
        order_invoice_number: row[mapping.orderInvoiceNumber || ''] || '',
        order_invoice_date: row[mapping.orderInvoiceDate || ''] || '',
        ewaybill: row[mapping.ewaybill || ''] || '',
      };
      
      return order;
    } catch (error) {
      throw new Error(`Error processing row ${index + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
    }
  });
}

function chunkArray(array: any[], chunkSize: number): any[][] {
  const result: any[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
} 