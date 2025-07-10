import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';
import { APP_CONFIG } from '@/config/app';
import { BillingStatus, CycleType } from '@lorrigo/db';
import {
  calculatePrice,
  PriceCalculationParams,
  CourierInfo,
  CourierPricing,
  PincodeDetails,
} from '@/utils/calculate-order-price';
import { hasAppliedCharge, addAppliedCharge } from '@/lib/awb-cache';
import { ChargeType } from '@lorrigo/db';

export enum AutomationJobType {
  RUN_DUE_CYCLES = 'run-due-cycles',
}

interface AutomationJobData {
  runDate: string;
}

export function initBillingAutomationWorker(fastify: FastifyInstance) {
  const worker = new Worker(
    QueueNames.BILLING_AUTOMATION,
    async (job: Job<AutomationJobData>) => {
      fastify.log.info(`Running automatic billing cycles job ${job.id}`);
      return runDueCycles(fastify);
    },
    {
      connection: redis,
      prefix: APP_CONFIG.REDIS.PREFIX,
      concurrency: 1,
    }
  );

  worker.on('completed', (job) => fastify.log.info(`Automation job ${job.id} completed`));
  worker.on('failed', (job, err) => fastify.log.error(`Automation job ${job?.id} failed: ${err}`));

  return { worker };
}

async function runDueCycles(fastify: FastifyInstance) {
  const now = new Date();
  // Find cycles that are due
  const dueCycles = await fastify.prisma.billingCycle.findMany({
    where: {
      is_active: true,
      next_cycle_date: { lte: now },
    },
  });

  let processedCycles = 0;

  for (const cycle of dueCycles) {
    try {
      await fastify.prisma.billingCycle.update({
        where: { id: cycle.id },
        data: { status: BillingStatus.PROCESSING },
      });

      const orders = await fastify.prisma.order.findMany({
        where: {
          user_id: cycle.user_id,
          created_at: {
            gte: cycle.cycle_start_date,
            lte: cycle.cycle_end_date,
          },
          billing: {
            none: {},
          },
        },
        include: {
          package: true,
          shipment: {
            include: {
              courier: true,
              tracking_events: {
                orderBy: { created_at: 'desc' },
                take: 1,
              },
            },
          },
          customer: { include: { address: true } },
          hub: { include: { address: true } },
          user: true,
        },
      });

      let processedOrders = 0;
      let failedOrders = 0;
      let totalAmount = 0;

      for (const order of orders) {
        try {
          if (!order.shipment) {
            failedOrders++;
            continue;
          }

          const awb = order.shipment.awb;
          if (!awb) {
            failedOrders++;
            continue;
          }

          // Check duplicate
          if (await hasAppliedCharge(awb, ChargeType.FORWARD_CHARGE)) {
            processedOrders++;
            continue;
          }

          // Fetch shipment pricing
          const shipmentPricing = await fastify.prisma.shipmentPricing.findUnique({
            where: { shipment_id: order.shipment.id },
          });
          if (!shipmentPricing) {
            failedOrders++;
            continue;
          }

          // Build params similar to CSV worker
          const params: PriceCalculationParams = {
            weight: order.package.weight || 0,
            weightUnit: 'kg',
            boxLength: order.package.length || 1,
            boxWidth: order.package.breadth || 1,
            boxHeight: order.package.height || 1,
            sizeUnit: 'cm',
            paymentType: order.payment_mode === 'COD' ? 1 : 0,
            collectableAmount: order.total_amount || 0,
            pickupPincode: order.hub?.address?.pincode || '',
            deliveryPincode: order.customer?.address?.pincode || '',
            isReversedOrder: false,
          };

          const courier: CourierInfo = {
            id: order.shipment.courier?.id || 'unknown',
            name: order.shipment.courier?.name || 'Unknown',
            courier_code: order.shipment.courier?.code || 'unknown',
            is_active: true,
            is_reversed_courier: false,
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
            is_cod_reversal_applicable: false,
            zone_pricing: [
              {
                zone: shipmentPricing.zone,
                base_price: shipmentPricing.base_price,
                increment_price: shipmentPricing.increment_price,
                rto_base_price: shipmentPricing.rto_base_price || 0,
                rto_increment_price: shipmentPricing.rto_increment_price || 0,
                is_rto_same_as_fw: shipmentPricing.is_rto_same_as_fw ?? true,
              },
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

          const result = calculatePrice(
            params,
            courier,
            courierPricing,
            pickupDetails,
            deliveryDetails
          );
          if (!result) {
            failedOrders++;
            continue;
          }

          await fastify.prisma.billing.create({
            data: {
              code: `BL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              order_id: order.id,
              billing_date: now,
              billing_month: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`,
              billing_amount: Math.round(result.total_price * 100) / 100,
              charged_weight: result.final_weight,
              fw_excess_charge: 0,
              rto_excess_charge: 0,
              zone_change_charge: 0,
              cod_charge: result.cod_charges,
              is_forward_applicable: shipmentPricing.is_fw_applicable,
              is_rto_applicable: shipmentPricing.is_rto_applicable,
              original_weight: order.package.weight || 0,
              base_price: result.base_price,
              base_weight: shipmentPricing.weight_slab || 0.5,
              increment_price: result.pricing.zone_pricing[0]?.increment_price || 0,
              order_weight: order.package.weight || 0,
              order_zone: result.zone,
              charged_zone: result.zone,
              courier_name: order.shipment.courier?.name || 'Unknown',
              billing_cycle_id: cycle.id,
              cycle_type: cycle.cycle_type,
              is_processed: true,
              payment_status: 'NOT_PAID',
            },
          });

          await addAppliedCharge(awb, ChargeType.FORWARD_CHARGE);
          processedOrders++;
          totalAmount += result.total_price;
        } catch (err) {
          fastify.log.error(`Failed billing order ${order.id}: ${err}`);
          failedOrders++;
        }
      }

      await fastify.prisma.billingCycle.update({
        where: { id: cycle.id },
        data: {
          status: BillingStatus.COMPLETED,
          processed_orders: processedOrders,
          failed_orders: failedOrders,
          total_orders: orders.length,
          total_amount: Math.round(totalAmount * 100) / 100,
        },
      });

      // Prepare next cycle dates
      const newStart = new Date(cycle.cycle_end_date);
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(newStart);
      newEnd.setDate(newEnd.getDate() + cycle.cycle_days);
      const nextDate = new Date(newEnd);
      nextDate.setDate(nextDate.getDate());

      await fastify.prisma.billingCycle.create({
        data: {
          code: `BC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          user_id: cycle.user_id,
          cycle_type: cycle.cycle_type,
          cycle_days: cycle.cycle_days,
          cycle_start_date: newStart,
          cycle_end_date: newEnd,
          next_cycle_date: nextDate,
          status: BillingStatus.PENDING,
          is_active: true,
        },
      });

      processedCycles++;
    } catch (err) {
      fastify.log.error(`Automatic billing cycle failed for ${cycle.id}: ${err}`);
      await fastify.prisma.billingCycle.update({
        where: { id: cycle.id },
        data: { status: BillingStatus.FAILED },
      });
    }
  }

  return { processedCycles };
}
