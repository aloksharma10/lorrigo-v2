import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';
import { APP_CONFIG } from '@/config/app';
import { BillingCSVRow } from '../services/billing-service';
import { format } from 'date-fns';
import {
  calculatePrice,
  PriceCalculationParams,
  CourierInfo,
  CourierPricing,
  PincodeDetails,
} from '@/utils/calculate-order-price';
import { hasAppliedCharge, addAppliedCharge } from '@/lib/awb-cache';
import { ChargeType } from '@lorrigo/db';

// Generate billing ID function
function generateBillingId(date = new Date()) {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const randomNumber = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
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

    const BATCH_SIZE = 100;
    for (let i = 0; i < billingRows.length; i += BATCH_SIZE) {
      const batch = billingRows.slice(i, i + BATCH_SIZE);
      const awbs = batch.map((row) => row.awb);

      const orders = await fastify.prisma.order.findMany({
        where: {
          shipment: {
            awb: { in: awbs },
          },
        },
        include: {
          shipment: {
            include: {
              courier: {
                include: {
                  channel_config: true,
                },
              },
              tracking_events: {
                orderBy: {
                  created_at: 'desc',
                },
                take: 1,
              },
              pricing: {
                include: {
                  courier_other_zone_pricing: true,
                },
              },
            },
          },
          user: true,
          customer: {
            include: {
              address: true,
            },
          },
          hub: {
            include: {
              address: true,
            },
          },
          package: true,
        },
      });

      const orderMap = new Map();
      orders.forEach((order) => {
        if (order.shipment?.awb) {
          orderMap.set(order.shipment.awb, order);
        }
      });

      for (const row of batch) {
        try {
          const order = orderMap.get(row.awb);

          if (!order || !order.shipment || !order.shipment.pricing) {
            fastify.log.warn(`Order or shipment pricing not found for AWB: ${row.awb}`);
            failedCount++;
            continue;
          }

          // Check for existing charges to prevent duplicates
          const hasForwardCharge = await hasAppliedCharge(row.awb, ChargeType.FORWARD_CHARGE);
          const hasForwardExcessCharge = await hasAppliedCharge(
            row.awb,
            ChargeType.FORWARD_EXCESS_WEIGHT
          );
          const hasRTOCharge = await hasAppliedCharge(row.awb, ChargeType.RTO_CHARGE);
          const hasRTOExcessCharge = await hasAppliedCharge(row.awb, ChargeType.RTO_EXCESS_WEIGHT);

          if (
            hasForwardCharge &&
            hasForwardExcessCharge &&
            (!order.shipment.status.includes('RTO') || (hasRTOCharge && hasRTOExcessCharge))
          ) {
            fastify.log.info(`All applicable charges already applied for AWB ${row.awb}`);
            successCount++;
            continue;
          }

          const existingBilling = await fastify.prisma.billing.findFirst({
            where: {
              order_id: order.id,
              billing_month: billingMonth,
            },
          });

          if (existingBilling) {
            fastify.log.info(
              `Billing record already exists for order ${order.id} in month ${billingMonth}`
            );
            await Promise.all([
              !hasForwardCharge && addAppliedCharge(row.awb, ChargeType.FORWARD_CHARGE),
              !hasForwardExcessCharge &&
                addAppliedCharge(row.awb, ChargeType.FORWARD_EXCESS_WEIGHT),
              order.shipment.status.includes('RTO') &&
                !hasRTOCharge &&
                addAppliedCharge(row.awb, ChargeType.RTO_CHARGE),
              order.shipment.status.includes('RTO') &&
                !hasRTOExcessCharge &&
                addAppliedCharge(row.awb, ChargeType.RTO_EXCESS_WEIGHT),
            ]);
            successCount++;
            continue;
          }

          const shipmentPricing = order.shipment.pricing;

          const params: PriceCalculationParams = {
            weight: Math.max(order.applicable_weight, row.weight),
            weightUnit: 'kg',
            boxLength: order.package?.length || 1,
            boxWidth: order.package?.breadth || 1,
            boxHeight: order.package?.height || 1,
            sizeUnit: 'cm',
            paymentType: order.payment_method === 'COD' ? 1 : 0,
            collectableAmount: order.amount_to_collect || 0,
            pickupPincode: order.hub?.address?.pincode || '',
            deliveryPincode: order.customer?.address?.pincode || '',
            isReversedOrder: order.is_reverse_order,
          };

          const courier: CourierInfo = {
            id: order.shipment.courier?.id || 'unknown',
            name: order.shipment.courier?.name || 'Unknown',
            courier_code: order.shipment.courier?.code || 'unknown',
            is_active: true,
            is_reversed_courier: order.is_reverse_order,
            weight_slab: shipmentPricing.weight_slab || 0.5,
          };

          const courierPricing: CourierPricing = {
            weight_slab: shipmentPricing.weight_slab || 0.5,
            increment_weight: shipmentPricing.increment_weight || 0.5,
            cod_charge_hard: shipmentPricing.cod_charge_hard || 0,
            cod_charge_percent: shipmentPricing.cod_charge_percent || 0,
            is_cod_applicable: shipmentPricing.is_cod_applicable ?? true,
            is_rto_applicable: shipmentPricing.is_rto_applicable ?? true,
            is_fw_applicable: shipmentPricing.is_fw_applicable ?? true,
            is_cod_reversal_applicable: shipmentPricing.is_cod_reversal_applicable ?? true,
            zone_pricing: [
              {
                zone: shipmentPricing.zone,
                base_price: shipmentPricing.base_price,
                increment_price: shipmentPricing.increment_price,
                rto_base_price: shipmentPricing.rto_base_price || 0,
                rto_increment_price: shipmentPricing.rto_increment_price || 0,
                is_rto_same_as_fw: shipmentPricing.is_rto_same_as_fw ?? true,
                flat_rto_charge: shipmentPricing.flat_rto_charge || 0,
              },
              ...shipmentPricing.courier_other_zone_pricing.map((zp: any) => ({
                zone: zp.zone,
                base_price: zp.base_price,
                increment_price: zp.increment_price,
                rto_base_price: zp.rto_base_price,
                rto_increment_price: zp.rto_increment_price,
                is_rto_same_as_fw: zp.is_rto_same_as_fw,
                flat_rto_charge: zp.flat_rto_charge,
              })),
            ],
          };

          const pickupDetails: PincodeDetails = {
            city: order.hub?.address?.city || '',
            state: order.hub?.address?.state || '',
          };
          const deliveryDetails: PincodeDetails = {
            city: order.customer?.address?.city || '',
            state: order.customer?.address?.state || '',
          };

          // calculating price with charged weight provided by admin in the csv
          const priceResult = calculatePrice(
            params,
            courier,
            courierPricing,
            pickupDetails,
            deliveryDetails
          );

          if (!priceResult) {
            fastify.log.warn(`Price calculation failed for AWB: ${row.awb}`);
            failedCount++;
            continue;
          }

          // Calculate excess charges
          const weightDifference = priceResult.final_weight - order.applicable_weight;
          const forwardExcessCharge =
            weightDifference > 0
              ? Math.ceil(weightDifference / shipmentPricing.increment_weight) *
                shipmentPricing.increment_price
              : 0;

          const rtoExcessCharge =
            order.shipment.status.includes('RTO') && weightDifference > 0
              ? Math.ceil(weightDifference / shipmentPricing.increment_weight) *
                (shipmentPricing.rto_increment_price || shipmentPricing.increment_price)
              : 0;

          const appliedCharges: ChargeType[] = [];
          if (!hasForwardCharge) appliedCharges.push(ChargeType.FORWARD_CHARGE);
          if (forwardExcessCharge > 0 && !hasForwardExcessCharge)
            appliedCharges.push(ChargeType.FORWARD_EXCESS_WEIGHT);
          if (order.shipment.status.includes('RTO') && !hasRTOCharge)
            appliedCharges.push(ChargeType.RTO_CHARGE);
          if (rtoExcessCharge > 0 && !hasRTOExcessCharge)
            appliedCharges.push(ChargeType.RTO_EXCESS_WEIGHT);

          await fastify.prisma
            .$transaction(async (prisma) => {
              const billing = await prisma.billing.create({
                data: {
                  code: generateBillingId(),
                  order: { connect: { id: order.id } },
                  billing_date: currentDate,
                  billing_month: billingMonth,
                  billing_amount: Math.round(priceResult.total_price * 100) / 100,
                  charged_weight: priceResult.final_weight,
                  fw_excess_charge: forwardExcessCharge,
                  rto_excess_charge: rtoExcessCharge,
                  zone_change_charge: 0,
                  weight_difference: weightDifference,
                  cod_charge: priceResult.cod_charges,
                  is_forward_applicable: true,
                  is_rto_applicable: order.shipment.status.includes('RTO'),
                  has_weight_dispute: weightDifference > 0,
                  original_weight: order.applicable_weight || 0,
                  base_price: priceResult.base_price,
                  base_weight: shipmentPricing.weight_slab || 0.5,
                  increment_price: priceResult.pricing.zone_pricing[0]?.increment_price || 0,
                  order_weight: order.applicable_weight || 0,
                  order_zone: priceResult.zone,
                  charged_zone: priceResult.zone,
                  courier_name:
                    `${order.shipment?.courier?.name} ${order.shipment?.courier.channel_config?.nickname}` ||
                    'Unknown',
                  payment_status: 'PENDING',
                },
              });

              // Create AWB transaction records for all applied charges
              // await Promise.all(
              //   appliedCharges.map((chargeType) =>
              //     prisma.awbTransaction.create({
              //       data: {
              //         awb: row.awb,
              //         charge_type: chargeType,
              //       },
              //     })
              //   )
              // );

              // Update Redis cache for all applied charges
              await Promise.all(
                appliedCharges.map((chargeType) => addAppliedCharge(row.awb, chargeType))
              );

              // Create weight dispute if applicable
              if (weightDifference > 0) {
                const disputeId = `WD-${format(currentDate, 'yyMM')}-${Math.floor(
                  Math.random() * 100000
                )
                  .toString()
                  .padStart(5, '0')}`;
                await prisma.weightDispute.create({
                  data: {
                    dispute_id: disputeId,
                    order: { connect: { id: order.id } },
                    user: { connect: { id: userId } },
                    charged_order_box_height: order.package?.height,
                    charged_order_box_width: order.package?.breadth,
                    charged_order_box_length: order.package?.length,
                    charged_order_size_unit: 'cm',
                    original_weight: order.applicable_weight,
                    disputed_weight: priceResult.final_weight,
                    status: 'PENDING',
                    courier_name: order.shipment?.courier?.name || 'Unknown',
                    original_charges: priceResult.base_price,
                    forward_excess_amount: forwardExcessCharge,
                    rto_excess_amount: rtoExcessCharge,
                    total_disputed_amount: forwardExcessCharge + rtoExcessCharge,
                    dispute_raised_at: currentDate,
                    deadline_date: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000),
                  },
                });
              }
            })
            .catch((error) => {
              fastify.log.error(`Error processing billing for AWB ${row.awb}: ${error}`);
              failedCount++;
            });

          successCount++;
        } catch (error) {
          fastify.log.error(`Error processing billing for AWB ${row.awb}: ${error}`);
          failedCount++;
        }
      }

      const processedCount = Math.min(i + BATCH_SIZE, billingRows.length);
      const progress = Math.floor((processedCount / billingRows.length) * 100);
      await job.updateProgress(progress);

      await fastify.prisma.bulkOperation.update({
        where: { id: bulkOperationId },
        data: {
          processed_count: processedCount,
          success_count: successCount,
          failed_count: failedCount,
        },
      });
    }

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
    C: { rate: 70, additional: 25 },
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
    zone,
  };
}

/**
 * Calculate excess charges for weight differences
 */
function calculateExcessCharges(originalWeight: number, actualWeight: number, baseRate: number) {
  const weightDiff = actualWeight - originalWeight;

  return {
    fw_excess: weightDiff > 0 ? Math.ceil(weightDiff / 0.5) * (baseRate * 0.3) : 0, // 30% of base rate per 500g excess
    rto_excess: 0, // RTO excess would be calculated separately based on shipment status
  };
}
