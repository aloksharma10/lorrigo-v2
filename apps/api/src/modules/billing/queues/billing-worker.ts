import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';
import { APP_CONFIG } from '@/config/app';
import { BillingCSVRow } from '../services/billing-service';
import { format } from 'date-fns';

// Generate billing ID function
function generateBillingId(date = new Date()) {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const randomNumber = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `BL-${year}${month}-${randomNumber}`;
}

// Job types for billing queue
export enum BillingJobType {
  PROCESS_BILLING_CSV = 'process-billing-csv',
}

interface BillingJobData {
  bulkOperationId: string;
  billingRows: BillingCSVRow[];
  userId: string;
}

export function initBillingWorker(fastify: FastifyInstance) {
  const billingWorker = new Worker(
    QueueNames.BILLING_CSV_PROCESSING,
    async (job: Job<BillingJobData>) => {
      fastify.log.info(`Processing billing job ${job.id} of type ${job.name}`);

      try {
        switch (job.name) {
          case BillingJobType.PROCESS_BILLING_CSV:
          case 'process-billing-csv': // Allow both patterns
            return await processBillingCSV(job, fastify);
          default:
            throw new Error(`Unknown billing job type: ${job.name}`);
        }
      } catch (error) {
        fastify.log.error(`Error processing billing job ${job.id}: ${error}`);

        // Update bulk operation status to failed
        try {
          const { bulkOperationId } = job.data;
          await fastify.prisma.bulkOperation.update({
            where: { id: bulkOperationId },
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
      concurrency: 3, // Process up to 3 billing jobs concurrently
      limiter: {
        max: 5, // Maximum number of jobs to process per time window
        duration: 1000, // Time window in ms (1 second)
      },
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          const baseDelay = 5000; // 5 seconds
          const maxDelay = 300000; // 5 minutes
          return Math.min(maxDelay, baseDelay * Math.pow(2, attemptsMade));
        },
      },
      maxStalledCount: 2,
      stalledInterval: 15000,
    }
  );

  // Event handlers
  billingWorker.on('completed', (job) => {
    fastify.log.info(`Billing job ${job.id} completed successfully`);
  });

  billingWorker.on('failed', (job, err) => {
    fastify.log.error(`Billing job ${job?.id} failed with error: ${err.message}`);
  });

  billingWorker.on('error', (err) => {
    fastify.log.error(`Billing worker error: ${err.message}`);
  });

  // Graceful shutdown
  const gracefulShutdown = async () => {
    fastify.log.info('Shutting down billing worker gracefully...');
    await billingWorker.close();
    fastify.log.info('Billing worker shut down successfully');
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return { billingWorker, gracefulShutdown };
}

/**
 * Process billing CSV data - find orders by AWB and calculate billing charges
 */
async function processBillingCSV(
  job: Job<BillingJobData>,
  fastify: FastifyInstance
): Promise<{
  operationId: string;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  duration: number;
}> {
  const startTime = Date.now();
  const { bulkOperationId, billingRows, userId } = job.data;

  try {
    // Update bulk operation to processing
    await fastify.prisma.bulkOperation.update({
      where: { id: bulkOperationId },
      data: {
        status: 'PROCESSING',
        total_count: billingRows.length,
      },
    });

    let successCount = 0;
    let failedCount = 0;
    const currentDate = new Date();
    const billingMonth = format(currentDate, 'yyyy-MM');

    // Process rows in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < billingRows.length; i += BATCH_SIZE) {
      const batch = billingRows.slice(i, i + BATCH_SIZE);
      const awbs = batch.map(row => row.awb);

      // Find orders with shipments by AWB
      const orders = await fastify.prisma.order.findMany({
        where: {
          shipment: {
            awb: { in: awbs }
          }
        },
        include: {
          shipment: {
            include: {
              courier: true
            }
          },
          user: true,
          customer: {
            include: {
              address: true
            }
          },
          hub: {
            include: {
              address: true
            }
          }
        }
      });

      // Create a map for quick AWB lookup
      const orderMap = new Map();
      orders.forEach(order => {
        if (order.shipment?.awb) {
          orderMap.set(order.shipment.awb, order);
        }
      });

      // Process each row in the batch
      for (const row of batch) {
        try {
          const order = orderMap.get(row.awb);
          
          if (!order || !order.shipment) {
            fastify.log.warn(`Order not found for AWB: ${row.awb}`);
            failedCount++;
            continue;
          }

          // Check if billing record already exists for this month
          const existingBilling = await fastify.prisma.billing.findFirst({
            where: {
              order_id: order.id,
              billing_month: billingMonth
            }
          });

          if (existingBilling) {
            fastify.log.info(`Billing record already exists for order ${order.id} in month ${billingMonth}`);
            successCount++;
            continue;
          }

          // Calculate billing charges based on weight difference and shipment details
          const actualWeight = row.weight;
          const orderWeight = order.shipment.weight || 0;
          const chargedWeight = Math.max(actualWeight, orderWeight);
          
          // Calculate zone (simplified logic - in reality this would be more complex)
          const hubPincode = order.hub?.address?.pincode;
          const customerPincode = order.customer?.address?.pincode;
          const orderZone = calculateZone(hubPincode, customerPincode);
          const chargedZone = orderZone; // For now, assume no zone changes
          
          // Calculate charges (simplified pricing logic)
          const basePricing = await calculateBasePricing(order, chargedWeight, orderZone);
          const excessCharges = calculateExcessCharges(orderWeight, actualWeight, basePricing.baseRate);
          const codCharges = order.payment_mode === 'COD' ? order.total_amount * 0.02 : 0; // 2% COD charges
          const zoneChangeCharges = orderZone !== chargedZone ? 10 : 0; // Fixed zone change fee
          
          const totalBillingAmount = basePricing.totalAmount + excessCharges.fw_excess + excessCharges.rto_excess + codCharges + zoneChangeCharges;

          // Create billing record
          await fastify.prisma.billing.create({
            data: {
              code: generateBillingId(),
              order_id: order.id,
              billing_date: currentDate,
              billing_month: billingMonth,
              billing_amount: Math.round(totalBillingAmount * 100) / 100, // Round to 2 decimal places
              charged_weight: chargedWeight,
              fw_excess_charge: excessCharges.fw_excess,
              rto_excess_charge: excessCharges.rto_excess,
              zone_change_charge: zoneChangeCharges,
              cod_charge: codCharges,
              is_forward_applicable: true,
              is_rto_applicable: false,
              base_price: basePricing.totalAmount,
              base_weight: 0.5, // 500g standard
              increment_price: basePricing.additionalRate,
              order_weight: orderWeight,
              order_zone: orderZone,
              charged_zone: chargedZone,
              courier_name: order.shipment?.courier?.name || 'Unknown',
              is_processed: true,
              payment_status: 'NOT_PAID'
            }
          });

          successCount++;

        } catch (error) {
          fastify.log.error(`Error processing billing for AWB ${row.awb}: ${error}`);
          failedCount++;
        }
      }

      // Update progress
      const processedCount = Math.min(i + BATCH_SIZE, billingRows.length);
      const progress = Math.floor((processedCount / billingRows.length) * 100);
      await job.updateProgress(progress);

      // Update bulk operation progress
      await fastify.prisma.bulkOperation.update({
        where: { id: bulkOperationId },
        data: {
          processed_count: processedCount,
          success_count: successCount,
          failed_count: failedCount,
        },
      });
    }

    // Final update
    await fastify.prisma.bulkOperation.update({
      where: { id: bulkOperationId },
      data: {
        status: 'COMPLETED',
        processed_count: billingRows.length,
        success_count: successCount,
        failed_count: failedCount,
        updated_at: new Date(),
      },
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    fastify.log.info(
      `Billing CSV processing completed: ${successCount} successful, ${failedCount} failed in ${duration}s`
    );

    return {
      operationId: bulkOperationId,
      totalProcessed: billingRows.length,
      successCount,
      failedCount,
      duration,
    };

  } catch (error) {
    fastify.log.error(`Error in billing CSV processing: ${error}`);

    // Update bulk operation to failed
    await fastify.prisma.bulkOperation.update({
      where: { id: bulkOperationId },
      data: {
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Calculate zone based on pickup and delivery pincodes
 * This is a simplified implementation
 */
function calculateZone(pickupPincode?: string, deliveryPincode?: string): string {
  // Simplified zone calculation logic
  // In reality, this would involve complex zone mapping
  if (!pickupPincode || !deliveryPincode) return 'A';
  
  const pickup = parseInt(pickupPincode);
  const delivery = parseInt(deliveryPincode);
  
  if (Math.abs(pickup - delivery) < 100000) return 'A'; // Same state
  if (Math.abs(pickup - delivery) < 300000) return 'B'; // Adjacent states
  return 'C'; // Rest of India
}

/**
 * Calculate base pricing for an order
 */
async function calculateBasePricing(order: any, weight: number, zone: string) {
  // Simplified pricing logic - in reality this would use complex pricing rules
  const baseRates = {
    A: { rate: 40, additional: 15 },
    B: { rate: 50, additional: 20 },
    C: { rate: 70, additional: 25 }
  };
  
  const zoneRates = baseRates[zone as keyof typeof baseRates] || baseRates.C;
  const baseWeight = 0.5; // 500g
  const baseAmount = zoneRates.rate;
  
  let additionalAmount = 0;
  if (weight > baseWeight) {
    const additionalWeight = Math.ceil((weight - baseWeight) / 0.5); // Per 500g slab
    additionalAmount = additionalWeight * zoneRates.additional;
  }
  
  const totalAmount = baseAmount + additionalAmount;
  
  return {
    baseRate: zoneRates.rate,
    additionalRate: zoneRates.additional,
    totalAmount,
    weight,
    zone
  };
}

/**
 * Calculate excess charges for weight differences
 */
function calculateExcessCharges(originalWeight: number, actualWeight: number, baseRate: number) {
  const weightDiff = actualWeight - originalWeight;
  
  return {
    fw_excess: weightDiff > 0 ? Math.ceil(weightDiff / 0.5) * (baseRate * 0.3) : 0, // 30% of base rate per 500g excess
    rto_excess: 0 // RTO excess would be calculated separately based on shipment status
  };
} 