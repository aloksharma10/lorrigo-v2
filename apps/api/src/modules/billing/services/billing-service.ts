import { FastifyInstance } from 'fastify';
import { ShipmentStatus, CycleType, BillingStatus } from '@lorrigo/db';
import { ChargeProcessingService } from '../../shipments/services/charge-processing.service';
import { redis } from '@/lib/redis';
import { mapShipmentToBilling } from '../utils/billing-mapper';

// Statuses/buckets that make a shipment NOT eligible for billing
const EXCLUDED_BUCKETS = [0, 1, 61, 6, 11, 12];
const EXCLUDED_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.NEW,
  ShipmentStatus.CANCELLED_ORDER,
  ShipmentStatus.CANCELLED_SHIPMENT,
  ShipmentStatus.COURIER_ASSIGNED,
  ShipmentStatus.PICKUP_SCHEDULED,
];

export class BillingService {
  private chargeService: ChargeProcessingService;

  constructor(private fastify: FastifyInstance) {
    this.chargeService = new ChargeProcessingService(fastify);
  }

  /**
   * Entry point for queue worker – processes billing either for a single user or all users.
   */
  async runBilling(userId?: string) {
    const users = userId
      ? [{ id: userId }]
      : await this.fastify.prisma.user.findMany({ select: { id: true } });
    let processed = 0;

    for (const u of users) {
      const count = await this.processUserBilling(u.id);
      processed += count.processedShipments;
    }

    return { processedUsers: users.length, processedShipments: processed };
  }

  /**
   * Process billing for single user – determines cycle from UserProfile
   */
  async processUserBilling(userId: string): Promise<{ processedShipments: number }> {
    // Fetch user profile for cycle dates
    const profile = await this.fastify.prisma.userProfile.findUnique({
      where: { user_id: userId },
    });
    if (!profile) {
      throw new Error('User profile not found');
    }

    const { billing_cycle_start_date, billing_cycle_end_date, billing_cycle_type } = profile as any;
    if (!billing_cycle_start_date || !billing_cycle_end_date) {
      throw new Error('Billing cycle dates not configured');
    }

    // Get or create UserBilling summary record
    let userBilling = await this.fastify.prisma.userBilling.findFirst({
      where: {
        user_id: userId,
        cycle_start_date: billing_cycle_start_date,
        cycle_end_date: billing_cycle_end_date,
      },
    });

    if (!userBilling) {
      userBilling = await this.fastify.prisma.userBilling.create({
        data: {
          code: `UB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          cycle_type: billing_cycle_type || CycleType.MONTHLY,
          cycle_start_date: billing_cycle_start_date,
          cycle_end_date: billing_cycle_end_date,
          status: BillingStatus.PROCESSING,
          is_active: false,
        },
      });
    }

    // Get eligible shipments
    const shipments = await this.fastify.prisma.shipment.findMany({
      where: {
        user_id: userId,
        created_at: { gte: billing_cycle_start_date, lte: billing_cycle_end_date },
        bucket: { notIn: EXCLUDED_BUCKETS },
        status: { notIn: EXCLUDED_STATUSES },
      },
      include: {
        order: true,
        pricing: true,
        courier: { include: { channel_config: true } },
      },
    });

    let processed = 0;
    let billingAmount = 0;

    for (const shipment of shipments) {
      const cacheKey = `billing:processed:${shipment.awb}:${Date.now()}`;
      if (await redis.get(cacheKey)) continue; // Skip if already processed

      // Check Billing table to avoid duplication
      const existing = await this.fastify.prisma.billing.findFirst({
        where: { order_id: shipment.order_id },
      });
      if (existing) {
        await redis.set(cacheKey, '1', 'EX', 60 * 60 * 24); // Cache for one day
        continue;
      }

      // Process RTO and COD charges
      await this.chargeService.processRtoShipmentCharges(shipment);

      // Map shipment to billing data
      const billingData = mapShipmentToBilling(shipment, shipment.pricing || {}, {
        code: `BL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        billing_date: new Date(),
        billing_month: new Date().toISOString().slice(0, 7),
        billing_cycle_id: userBilling.id,
        is_manual_billing: false,
      });

      // Create billing record
      await this.fastify.prisma.billing.create({ data: billingData as any });
      billingAmount += billingData.billing_amount;
      await redis.set(cacheKey, '1', 'EX', 60 * 60 * 24); // Cache for one day
      processed++;
    }

    // Update UserBilling summary
    await this.fastify.prisma.userBilling.update({
      where: { id: userBilling.id },
      data: {
        total_orders: processed,
        processed_orders: processed,
        total_amount: billingAmount,
        status: BillingStatus.COMPLETED,
      },
    });

    return { processedShipments: processed };
  }
  /**
   * Generate billing manually either by explicit AWB list or by date range
   */
  async generateManualBilling(params: {
    awbs?: string[];
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) {
    const { awbs, startDate, endDate, userId } = params;
    if (!awbs && !(startDate && endDate)) {
      throw new Error('Provide either awbs array or startDate & endDate');
    }

    const where: any = {
      bucket: { notIn: EXCLUDED_BUCKETS },
      status: { notIn: EXCLUDED_STATUSES },
    };

    if (userId) where.user_id = userId;
    if (awbs) {
      where.awb = { in: awbs };
    } else {
      where.created_at = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }

    const shipments = await this.fastify.prisma.shipment.findMany({
      where,
      include: { order: true, pricing: true, courier: { include: { channel_config: true } } },
    });

    let processed = 0;
    let billingAmount = 0;
    // create UserBilling summary for manual run
    const userBilling = await this.fastify.prisma.userBilling.create({
      data: {
        code: `UB-M-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId || 'GLOBAL',
        cycle_type: CycleType.MANUAL,
        cycle_start_date: awbs ? new Date() : new Date(startDate as string),
        cycle_end_date: awbs ? new Date() : new Date(endDate as string),
        status: BillingStatus.PROCESSING,
        is_active: false,
      },
    });

    for (const shipment of shipments) {
      const cacheKey = `billing:manual:${shipment.awb}:${Date.now()}`;
      if (awbs && (await redis.get(cacheKey))) continue;

      await this.chargeService.processRtoShipmentCharges(shipment);

      const billingData = mapShipmentToBilling(shipment, shipment.pricing || {}, {
        code: `BL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        billing_date: new Date(),
        billing_month: new Date().toISOString().slice(0, 7),
        billing_cycle_id: userBilling.id,
        is_manual_billing: false,
      });

      await this.fastify.prisma.billing.create({ data: billingData as any });
      billingAmount += billingData.billing_amount;
      await redis.set(cacheKey, '1', 'EX', 60 * 60);
      processed++;
    }

    await this.fastify.prisma.userBilling.update({
      where: { id: userBilling.id },
      data: {
        total_orders: processed,
        processed_orders: processed,
        total_amount: billingAmount,
        status: BillingStatus.COMPLETED,
      },
    });

    return { processedShipments: processed };
  }

  /**
   * Automatically resolve disputes older than 7 days
   */
  async autoResolveDisputes() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const disputes = await this.fastify.prisma.weightDispute.findMany({
      where: {
        status: 'PENDING',
        dispute_raised_at: { lt: sevenDaysAgo },
      },
      include: { order: true },
    });

    for (const dispute of disputes) {
      // Apply disputed amount to wallet via TransactionService inside ChargeProcessingService
      // For now mark resolved and deduct.
      await this.fastify.prisma.weightDispute.update({
        where: { id: dispute.id },
        data: {
          status: 'RESOLVED',
          auto_resolved_at: new Date(),
          resolution: 'Auto-resolved after 7 days',
        },
      });
    }

    return { resolved: disputes.length };
  }
}
