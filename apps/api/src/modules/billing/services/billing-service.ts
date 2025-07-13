import { FastifyInstance } from 'fastify';
import { 
  BillingStatus, 
  CycleType, 
  ShipmentStatus, 
  TransactionStatus,
  ChargeType,
  WeightDisputeStatus 
} from '@lorrigo/db';
import { redis } from '@/lib/redis';
import { TransactionService, TransactionType } from '@/modules/transactions/services/transaction-service';
import { calculateExcessCharges } from '@/utils/calculate-order-price';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';

interface ManualBillingRequest {
  awbs?: string[];
  startDate?: string;
  endDate?: string;
  userId?: string;
}

interface BillingResult {
  success: boolean;
  billingCycleId?: string;
  processedOrders: number;
  totalAmount: number;
  errors: string[];
}

export class BillingService {
  private transactionService: TransactionService;

  constructor(private fastify: FastifyInstance) {
    this.transactionService = new TransactionService(fastify);
  }

  /**
   * Main billing automation - runs for all users based on their billing cycles
   */
  async runAutomatedBilling(): Promise<{ processedUsers: number; results: BillingResult[] }> {
    const results: BillingResult[] = [];
    
    try {
      // Get users whose billing cycle is due today
      const usersForBilling = await this.getUsersForBilling();
      
      for (const user of usersForBilling) {
        try {
          const result = await this.runBilling(user.id);
          results.push(result);
        } catch (error) {
          this.fastify.log.error(`Billing failed for user ${user.id}: ${error}`);
          results.push({
            success: false,
            processedOrders: 0,
            totalAmount: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error']
          });
        }
      }

      return { processedUsers: usersForBilling.length, results };
    } catch (error) {
      this.fastify.log.error(`Automated billing failed: ${error}`);
      throw error;
    }
  }

  /**
   * Run billing for a specific user based on their cycle
   */
  async runBilling(userId: string): Promise<BillingResult> {
    try {
      // Get user's billing configuration
      const userProfile = await this.fastify.prisma.userProfile.findUnique({
        where: { user_id: userId },
        include: { user: true }
      });

      if (!userProfile) {
        throw new Error(`User profile not found for user ${userId}`);
      }

      // Calculate billing period based on cycle
      const billingPeriod = this.calculateBillingPeriod(
        userProfile.billing_cycle_type,
        userProfile.billing_cycle_start_date,
        userProfile.billing_cycle_end_date
      );

      // Get eligible shipments for billing
      const eligibleShipments = await this.getEligibleShipments(userId, billingPeriod);

      if (eligibleShipments.length === 0) {
        return {
          success: true,
          processedOrders: 0,
          totalAmount: 0,
          errors: []
        };
      }

      // Create UserBilling record for this cycle
      const userBilling = await this.createUserBillingCycle(
        userId,
        userProfile.billing_cycle_type,
        billingPeriod,
        eligibleShipments.length
      );

      let totalAmount = 0;
      const errors: string[] = [];
      let processedCount = 0;

      // Process each shipment
      for (const shipment of eligibleShipments) {
        try {
          const billingAmount = await this.processSingleShipmentBilling(
            shipment,
            userBilling.id
          );
          totalAmount += billingAmount;
          processedCount++;
        } catch (error) {
          errors.push(`Failed to bill shipment ${shipment.awb}: ${error}`);
        }
      }

      // Update UserBilling with final totals
      await this.fastify.prisma.userBilling.update({
        where: { id: userBilling.id },
        data: {
          total_amount: totalAmount,
          processed_orders: processedCount,
          failed_orders: eligibleShipments.length - processedCount,
          status: errors.length === 0 ? BillingStatus.COMPLETED : BillingStatus.FAILED
        }
      });

      return {
        success: errors.length === 0,
        billingCycleId: userBilling.id,
        processedOrders: processedCount,
        totalAmount,
        errors
      };
    } catch (error) {
      this.fastify.log.error(`Billing failed for user ${userId}: ${error}`);
      throw error;
    }
  }

  /**
   * Manual billing - admin can specify AWBs or date range
   */
  async generateManualBilling(request: ManualBillingRequest): Promise<BillingResult> {
    try {
      if (!request.userId) {
        throw new Error('User ID is required for manual billing');
      }

      let eligibleShipments;

      if (request.awbs && request.awbs.length > 0) {
        // Billing by specific AWBs
        eligibleShipments = await this.getShipmentsByAwbs(request.awbs, request.userId);
      } else if (request.startDate && request.endDate) {
        // Billing by date range
        const billingPeriod = {
          start: new Date(request.startDate),
          end: new Date(request.endDate)
        };
        eligibleShipments = await this.getEligibleShipments(request.userId, billingPeriod);
      } else {
        throw new Error('Either AWBs or date range must be provided');
      }

      if (eligibleShipments.length === 0) {
        return {
          success: true,
          processedOrders: 0,
          totalAmount: 0,
          errors: []
        };
      }

      // Create manual UserBilling record
      const userBilling = await this.createUserBillingCycle(
        request.userId,
        CycleType.MANUAL,
        {
          start: new Date(request.startDate || Date.now()),
          end: new Date(request.endDate || Date.now())
        },
        eligibleShipments.length
      );

      let totalAmount = 0;
      const errors: string[] = [];
      let processedCount = 0;

      // Process each shipment
      for (const shipment of eligibleShipments) {
        try {
          const billingAmount = await this.processSingleShipmentBilling(
            shipment,
            userBilling.id,
            true // isManual
          );
          totalAmount += billingAmount;
          processedCount++;
        } catch (error) {
          errors.push(`Failed to bill shipment ${shipment.awb}: ${error}`);
        }
      }

      // Update UserBilling with final totals
      await this.fastify.prisma.userBilling.update({
        where: { id: userBilling.id },
        data: {
          total_amount: totalAmount,
          processed_orders: processedCount,
          failed_orders: eligibleShipments.length - processedCount,
          status: errors.length === 0 ? BillingStatus.COMPLETED : BillingStatus.FAILED
        }
      });

      return {
        success: errors.length === 0,
        billingCycleId: userBilling.id,
        processedOrders: processedCount,
        totalAmount,
        errors
      };
    } catch (error) {
      this.fastify.log.error(`Manual billing failed: ${error}`);
      throw error;
    }
  }

  /**
   * Process weight dispute CSV upload
   */
  async processWeightDisputeCSV(csvData: Array<{
    AWB: string;
    Charged_Weight: number;
    evidence_url?: string;
  }>): Promise<{ processed: number; disputes: number; errors: string[] }> {
    let processed = 0;
    let disputes = 0;
    const errors: string[] = [];

    this.fastify.log.info(`Processing ${csvData.length} rows from weight dispute CSV`);
    
    if (!csvData || csvData.length === 0) {
      this.fastify.log.error('No CSV data provided or empty CSV');
      errors.push('No CSV data provided or empty CSV');
      return { processed, disputes, errors };
    }

    // Log a sample of the data for debugging
    this.fastify.log.info(`Sample data: ${JSON.stringify(csvData.slice(0, 2))}`);

    for (const row of csvData) {
      try {
        if (!row.AWB) {
          this.fastify.log.warn(`Missing AWB in row: ${JSON.stringify(row)}`);
          errors.push(`Missing AWB in row`);
          continue;
        }

        this.fastify.log.info(`Processing AWB: ${row.AWB}, Charged Weight: ${row.Charged_Weight}`);
        
        const shipment = await this.fastify.prisma.shipment.findFirst({
          where: { awb: row.AWB },
          include: { 
            order: true,
            courier: {
              include: { channel_config: true }
            },
            pricing: {
              include: { courier_other_zone_pricing: true }
            }
          }
        });

        if (!shipment) {
          this.fastify.log.warn(`Shipment not found for AWB: ${row.AWB}`);
          errors.push(`Shipment not found for AWB: ${row.AWB}`);
          continue;
        }

        const chargedWeight = row.Charged_Weight;
        const originalWeight = shipment.order.applicable_weight;

        this.fastify.log.info(`AWB: ${row.AWB}, Original Weight: ${originalWeight}, Charged Weight: ${chargedWeight}`);

        if (chargedWeight > originalWeight) {
          // Create dispute
          const dispute = await this.createWeightDispute(shipment, chargedWeight, row.evidence_url);
          this.fastify.log.info(`Created dispute ${dispute.dispute_id} for AWB ${row.AWB}`);
          disputes++;
        } else {
          this.fastify.log.info(`No dispute needed for AWB ${row.AWB}, charged weight (${chargedWeight}) <= original weight (${originalWeight})`);
        }

        processed++;
      } catch (error) {
        const errorMessage = `Error processing AWB ${row.AWB}: ${error instanceof Error ? error.message : String(error)}`;
        this.fastify.log.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    this.fastify.log.info(`CSV processing completed: ${processed} processed, ${disputes} disputes created, ${errors.length} errors`);
    return { processed, disputes, errors };
  }

  /**
   * Auto-resolve disputes after 7 days
   */
  async autoResolveExpiredDisputes(): Promise<{ resolved: number; errors: string[] }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const expiredDisputes = await this.fastify.prisma.weightDispute.findMany({
      where: {
        status: WeightDisputeStatus.PENDING,
        dispute_raised_at: { lte: sevenDaysAgo },
        seller_action_taken: false
      },
      include: { order: true }
    });

    let resolved = 0;
    const errors: string[] = [];

    for (const dispute of expiredDisputes) {
      try {
        // Apply disputed charges to wallet
        if (dispute.wallet_hold_applied) {
          await this.transactionService.createShipmentTransaction({
            amount: dispute.total_disputed_amount,
            type: TransactionType.DEBIT,
            description: `Auto-resolved weight dispute for AWB ${dispute.order.code}`,
            userId: dispute.user_id,
            shipmentId: dispute.order.id,
            awb: dispute.order.code,
            status: TransactionStatus.COMPLETED,
            currency: 'INR',
            merchantTransactionId: `AUTO-DISPUTE-${dispute.dispute_id}`,
            charge_type: ChargeType.FORWARD_EXCESS_WEIGHT
          });
        }

        // Update dispute status
        await this.fastify.prisma.weightDispute.update({
          where: { id: dispute.id },
          data: {
            status: WeightDisputeStatus.RESOLVED,
            auto_resolved_at: new Date(),
            resolution: 'Auto-resolved after 7 days - charges applied'
          }
        });

        resolved++;
      } catch (error) {
        errors.push(`Failed to resolve dispute ${dispute.dispute_id}: ${error}`);
      }
    }

    return { resolved, errors };
  }

  /**
   * Accept a weight dispute
   */
  async acceptDispute(
    disputeId: string,
    options: {
      resolution: string;
      final_weight?: number;
      revised_charges?: number;
      resolved_by: string;
    }
  ): Promise<any> {
    const { resolution, final_weight, revised_charges, resolved_by } = options;

    // Get the dispute
    const dispute = await this.fastify.prisma.weightDispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          select: {
            id: true,
            user_id: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Update the dispute
    const updatedDispute = await this.fastify.prisma.weightDispute.update({
      where: { id: disputeId },
      data: {
        status: WeightDisputeStatus.RESOLVED,
        resolution,
        final_weight: final_weight || dispute.disputed_weight,
        revised_charges: revised_charges,
        resolved_by,
        resolution_date: new Date(),
        seller_action_taken: true,
      },
    });

    // Update the billing record if it exists
    const billingRecord = await this.fastify.prisma.billing.findFirst({
      where: { order_id: dispute.order_id },
    });

    if (billingRecord) {
      await this.fastify.prisma.billing.update({
        where: { id: billingRecord.id },
        data: {
          charged_weight: final_weight || dispute.disputed_weight,
          has_weight_dispute: false, // Dispute is resolved
          paid_amount: billingRecord.disputed_amount + billingRecord.disputed_amount,
          updated_at: new Date(),
        },
      });
    }

    return updatedDispute;
  }

  /**
   * Reject a weight dispute
   */
  async rejectDispute(
    disputeId: string,
    options: {
      resolution: string;
      resolved_by: string;
    }
  ): Promise<any> {
    const { resolution, resolved_by } = options;

    // Get the dispute
    const dispute = await this.fastify.prisma.weightDispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Update the dispute
    const updatedDispute = await this.fastify.prisma.weightDispute.update({
      where: { id: disputeId },
      data: {
        status: 'REJECTED',
        resolution,
        resolved_by,
        resolution_date: new Date(),
      },
    });

    return updatedDispute;
  }

  /**
   * Raise a weight dispute (seller provides evidence)
   */
  async raiseDispute(
    disputeId: string,
    options: {
      comment: string;
      evidence_urls: string[];
      raised_by: string;
    }
  ): Promise<any> {
    const { comment, evidence_urls, raised_by } = options;

    // Get the dispute
    const dispute = await this.fastify.prisma.weightDispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Update the dispute
    const updatedDispute = await this.fastify.prisma.weightDispute.update({
      where: { id: disputeId },
      data: {
        status: 'RAISED_BY_SELLER',
        seller_response: comment,
        seller_evidence_urls: evidence_urls,
        seller_action_taken: true,
        updated_at: new Date(),
      },
    });

    return updatedDispute;
  }

  /**
   * Save a dispute image to the server
   */
  async saveDisputeImage(fileStream: any, filePath: string): Promise<string> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });

      // Create write stream
      const writeStream = fs.createWriteStream(path.join(process.cwd(), filePath));

      // Pipe the file to the write stream
      await pipeline(fileStream, writeStream);

      // Return the file path
      return filePath;
    } catch (error) {
      this.fastify.log.error(`Error saving dispute image: ${error}`);
      throw new Error('Failed to save image');
    }
  }

  // Private helper methods

  private async getUsersForBilling() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = today.getDate();

    return this.fastify.prisma.user.findMany({
      where: {
        is_active: true,
        profile: {
          OR: [
            // Daily billing
            { billing_cycle_type: CycleType.DAILY },
            // Weekly billing (check if today matches the configured day)
            {
              billing_cycle_type: CycleType.WEEKLY,
              remittance_days_of_week: { has: dayOfWeek }
            },
            // Monthly billing (check if today matches the configured day)
            {
              billing_cycle_type: CycleType.MONTHLY,
              billing_cycle_start_date: { not: null }
            }
          ]
        }
      },
      include: { profile: true }
    });
  }

  private calculateBillingPeriod(
    cycleType: CycleType,
    startDate: Date | null,
    endDate: Date | null
  ) {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (cycleType) {
      case CycleType.DAILY:
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;

      case CycleType.WEEKLY:
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;

      case CycleType.MONTHLY:
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;

      default:
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate);
        } else {
          // Fallback to last 30 days
          start = new Date(now);
          start.setDate(start.getDate() - 30);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
        }
    }

    return { start, end };
  }

  private async getEligibleShipments(userId: string, period: { start: Date; end: Date }) {
    // Excluded buckets for billing
    const excludedBuckets = [0, 1, 6, 11, 12, 61];
    
    return this.fastify.prisma.shipment.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: period.start,
          lte: period.end
        },
        bucket: { notIn: excludedBuckets },
        status: {
          notIn: [
            ShipmentStatus.NEW,
            ShipmentStatus.CANCELLED_SHIPMENT,
            ShipmentStatus.CANCELLED_ORDER,
            ShipmentStatus.COURIER_ASSIGNED,
            ShipmentStatus.PICKUP_SCHEDULED
          ]
        }
      },
      include: {
        order: {
          include: { weight_dispute: true }
        },
        courier: {
          include: { channel_config: true }
        },
        pricing: {
          include: { courier_other_zone_pricing: true }
        }
      }
    });
  }

  private async getShipmentsByAwbs(awbs: string[], userId: string) {
    const excludedBuckets = [0, 1, 6, 11, 12, 61];
    
    return this.fastify.prisma.shipment.findMany({
      where: {
        user_id: userId,
        awb: { in: awbs },
        bucket: { notIn: excludedBuckets }
      },
      include: {
        order: {
          include: { weight_dispute: true }
        },
        courier: {
          include: { channel_config: true }
        },
        pricing: {
          include: { courier_other_zone_pricing: true }
        }
      }
    });
  }

  private async createUserBillingCycle(
    userId: string,
    cycleType: CycleType,
    period: { start: Date; end: Date },
    totalOrders: number
  ) {
    const code = `UB-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    
    return this.fastify.prisma.userBilling.create({
      data: {
        code,
        user_id: userId,
        cycle_type: cycleType,
        cycle_start_date: period.start,
        cycle_end_date: period.end,
        cycle_days: Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)),
        total_orders: totalOrders,
        status: BillingStatus.PROCESSING
      }
    });
  }

  private async processSingleShipmentBilling(
    shipment: any,
    billingCycleId: string,
    isManual = false
  ): Promise<number> {
    const cacheKey = `billing:${shipment.awb}:${billingCycleId}`;
    
    // Check if already billed using Redis
    const cached = await redis.get(cacheKey);
    if (cached) {
      return 0; // Already processed
    }

    // Check for existing weight dispute
    const weightDispute = await this.fastify.prisma.weightDispute.findFirst({
      where: {
        order_id: shipment.order_id,
        status: { 
          in: [WeightDisputeStatus.PENDING, WeightDisputeStatus.RAISED_BY_SELLER] 
        }
      }
    });

    let totalCharges = 0;
    let fwExcessCharge = 0;
    let rtoExcessCharge = 0;
    let chargedWeight = shipment.order.applicable_weight;
    let hasWeightDispute = false;

    const isRto = this.isRtoStatus(shipment.status);

    // Calculate base charges
    const forwardCharge = shipment.fw_charge || 0;
    const codCharge = isRto ? 0 : shipment.cod_charge || 0;
    let rtoCharge = isRto ? shipment.rto_charge : 0;

    // If there's an active weight dispute, use dispute-related charges
    if (weightDispute) {
      chargedWeight = weightDispute.disputed_weight;
      fwExcessCharge = weightDispute.forward_excess_amount || 0;
      rtoExcessCharge = weightDispute.rto_excess_amount || 0;
      hasWeightDispute = true;
    }

    // Check if RTO charges need to be applied
    if (isRto && shipment.rto_charge > 0) {
      const rtoApplied = await this.checkRtoChargeApplied(shipment.id);
      if (!rtoApplied) {
        rtoCharge = shipment.rto_charge;
        // Apply RTO transaction
        await this.transactionService.createShipmentTransaction({
          amount: rtoCharge,
          type: TransactionType.DEBIT,
          description: `RTO charge for shipment ${shipment.awb}`,
          userId: shipment.user_id,
          shipmentId: shipment.id,
          awb: shipment.awb,
          status: TransactionStatus.COMPLETED,
          currency: 'INR',
          merchantTransactionId: `RTO-${shipment.awb}-${Date.now()}`,
          charge_type: ChargeType.RTO_CHARGE
        });
      }
    }

    // Handle COD refund for RTO shipments
    if (isRto && shipment.order.payment_method === 'COD' && shipment.order.amount_to_collect > 0) {
      const codRefunded = await this.checkCodRefunded(shipment.id);
      if (!codRefunded) {
        await this.transactionService.createShipmentTransaction({
          amount: shipment.order.amount_to_collect,
          type: TransactionType.CREDIT,
          description: `COD refund for RTO shipment ${shipment.awb}`,
          userId: shipment.user_id,
          shipmentId: shipment.id,
          awb: shipment.awb,
          status: TransactionStatus.COMPLETED,
          currency: 'INR',
          merchantTransactionId: `COD-REFUND-${shipment.awb}-${Date.now()}`,
          charge_type: ChargeType.COD_REVERSAL
        });
      }
    }

    // Calculate total charges including dispute amounts
    totalCharges = forwardCharge + codCharge + rtoCharge + fwExcessCharge + rtoExcessCharge;

    // Create billing record
    const billingCode = `BL-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    
    await this.fastify.prisma.billing.create({
      data: {
        code: billingCode,
        order_id: shipment.order_id,
        awb: shipment.awb,
        billing_date: new Date(),
        billing_month: new Date().toISOString().slice(0, 7),
        original_weight: shipment.order.applicable_weight,
        charged_weight: chargedWeight,
        has_weight_dispute: hasWeightDispute,
        paid_amount: hasWeightDispute ? (forwardCharge + rtoCharge + codCharge) : 0,
        billing_amount: totalCharges,
        fw_charge: forwardCharge,
        cod_charge: codCharge,
        rto_charge: rtoCharge,
        fw_excess_charge: fwExcessCharge,
        rto_excess_charge: rtoExcessCharge,
        is_forward_applicable: forwardCharge > 0,
        is_rto_applicable: rtoCharge > 0,
        pending_amount: hasWeightDispute ? (fwExcessCharge + rtoExcessCharge) : 0,
        disputed_amount: hasWeightDispute ? (fwExcessCharge + rtoExcessCharge) : 0,
        base_price: shipment.pricing?.base_price || 0,
        increment_price: shipment.pricing?.increment_price || 0,
        base_weight: shipment.pricing?.weight_slab || 0.5,
        order_weight: shipment.order.applicable_weight,
        order_zone: shipment.order_zone,
        courier_name: `${shipment.courier?.name} ${shipment.courier?.channel_config?.nickname || ''}`,
        billing_cycle_id: billingCycleId,
        cycle_type: isManual ? CycleType.MANUAL : CycleType.MONTHLY,
        is_manual_billing: isManual,
        payment_status: BillingStatus.COMPLETED
      }
    });

    // Cache the billing to prevent duplicate processing
    await redis.setex(cacheKey, 86400, 'processed'); // 24 hours

    return totalCharges;
  }

  private async createWeightDispute(shipment: any, chargedWeight: number, evidenceUrl?: string) {
    const originalWeight = shipment.order.applicable_weight;
    const weightDiff = chargedWeight - originalWeight;
    const isRto = this.isRtoStatus(shipment.status);

    // Calculate excess charges
    let fwExcess = 0;
    let rtoExcess = 0;

    if (shipment.pricing && shipment.pricing.courier_other_zone_pricing) {
      const zoneP = shipment.pricing.courier_other_zone_pricing.find((z: any) => z.zone === shipment.order_zone) || 
                   shipment.pricing.courier_other_zone_pricing[0];
      
      if (zoneP) {
        const excessCharges = calculateExcessCharges(weightDiff, shipment.pricing, zoneP);
        fwExcess = excessCharges.fwExcess;
        rtoExcess = isRto ? excessCharges.rtoExcess : 0;
      }
    }

    const totalDisputed = fwExcess + rtoExcess;
    const disputeId = `WD-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Date.now().toString().slice(-6)}`;

    // Create dispute
    const dispute = await this.fastify.prisma.weightDispute.create({
      data: {
        wallet_hold_applied: true,
        dispute_id: disputeId,
        order_id: shipment.order_id,
        user_id: shipment.user_id,
        charged_order_box_height: 0, // Using charged weight as height for now
        original_weight: originalWeight,
        disputed_weight: chargedWeight,
        status: WeightDisputeStatus.PENDING,
        original_charges: shipment.shipping_charge || 0,
        forward_excess_amount: fwExcess,
        rto_excess_amount: rtoExcess,
        total_disputed_amount: totalDisputed,
        evidence_urls: evidenceUrl ? [evidenceUrl] : [],
        courier_name: `${shipment.courier?.name} ${shipment.courier?.channel_config?.nickname || ''}`,
        deadline_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }
    });

    const existingBilling = await this.fastify.prisma.billing.findFirst({
      where: { order_id: shipment.order_id }
    });

    if (existingBilling) {
      await this.fastify.prisma.billing.update({
        where: { id: existingBilling.id },
        data: {
          awb: shipment.awb,
          charged_weight: chargedWeight,
          weight_difference: weightDiff,
          fw_excess_charge: fwExcess,
          rto_excess_charge: rtoExcess,
          has_weight_dispute: true,
          billing_amount: existingBilling.billing_amount + totalDisputed,
          pending_amount: existingBilling.pending_amount + totalDisputed,
          disputed_amount: existingBilling.disputed_amount + totalDisputed,
          paid_amount: existingBilling.paid_amount,
          updated_at: new Date()
        }
      });
      
      this.fastify.log.info(`Updated billing record for AWB ${shipment.awb} with weight dispute information`);
    }

    // Create hold transaction for disputed amount
    if (totalDisputed > 0) {
      await this.transactionService.createShipmentTransaction({
        amount: totalDisputed,
        type: TransactionType.HOLD,
        description: `Wallet hold for weight dispute ${disputeId}`,
        userId: shipment.user_id,
        shipmentId: shipment.id,
        awb: shipment.awb,
        status: TransactionStatus.COMPLETED,
        currency: 'INR',
        merchantTransactionId: `HOLD-${shipment.awb}-${Date.now()}`,
        charge_type: ChargeType.FORWARD_EXCESS_WEIGHT
      });

      // Update dispute to mark hold as applied
      await this.fastify.prisma.weightDispute.update({
        where: { id: dispute.id },
        data: { wallet_hold_applied: true, status: WeightDisputeStatus.PENDING }
      });
    }

    return dispute;
  }

  private isRtoStatus(status: string): boolean {
    return ['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(status);
  }

  private async checkRtoChargeApplied(shipmentId: string): Promise<boolean> {
    const transaction = await this.fastify.prisma.shipmentTransaction.findFirst({
      where: {
        shipment_id: shipmentId,
        charge_type: ChargeType.RTO_CHARGE
      }
    });
    return !!transaction;
  }

  private async checkCodRefunded(shipmentId: string): Promise<boolean> {
    const transaction = await this.fastify.prisma.shipmentTransaction.findFirst({
      where: {
        shipment_id: shipmentId,
        charge_type: ChargeType.COD_REVERSAL,
        type: TransactionType.CREDIT
      }
    });
    return !!transaction;
  }
}