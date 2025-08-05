import { FastifyInstance } from 'fastify';
import { ChargeType, TransactionStatus } from '@lorrigo/db';
import { TransactionService, TransactionType } from '../../transactions/services/transaction-service';

interface ChargeProcessingResult {
  success: boolean;
  chargeType: ChargeType;
  amount: number;
  message: string;
  error?: string;
}

/**
 * Unified Charge Processing Service
 * This service handles all shipment charge processing and transaction creation
 * It's designed to work with the consolidated billing approach
 */
export class ChargeProcessingService {
  private transactionService: TransactionService;

  constructor(private fastify: FastifyInstance) {
    this.transactionService = new TransactionService(fastify);
  }

  /**
   * Process shipment charges for shipments that have moved to RTO status
   * This is primarily used by the tracking processor when shipments change to RTO
   */
  async processRtoShipmentCharges(shipment: any): Promise<ChargeProcessingResult[]> {
    const results: ChargeProcessingResult[] = [];

    // Only process RTO charges for shipments that are actually in RTO status
    if (!this.isRtoStatus(shipment.status)) {
      return results;
    }

    // Process RTO charges if not already applied
    if (this.shouldProcessRtoCharge(shipment)) {
      const rtoResult = await this.processRtoCharge(shipment);
      results.push(rtoResult);
    }

    // Process COD refund for RTO shipments if applicable
    if (this.shouldProcessCodRefund(shipment)) {
      const codRefundResult = await this.processCodRefund(shipment);
      results.push(codRefundResult);
    }

    return results;
  }

  /**
   * Check if a charge has already been applied to avoid duplication
   */
  async hasChargeBeenApplied(shipmentId: string, chargeType: ChargeType): Promise<boolean> {
    const existingTx = await this.fastify.prisma.shipmentTransaction.findFirst({
      where: {
        shipment_id: shipmentId,
        charge_type: chargeType,
      },
    });
    return !!existingTx;
  }

  /**
   * Process individual charge types - used by tracking processor
   */
  private async processRtoCharge(shipment: any): Promise<ChargeProcessingResult> {
    try {
      // Get RTO charge from shipment record or pricing
      const rtoAmount = shipment.rto_charge || shipment.pricing?.rto_base_price || 0;

      if (rtoAmount <= 0) {
        return {
          success: true,
          chargeType: ChargeType.RTO_CHARGE,
          amount: 0,
          message: 'No RTO charge applicable',
        };
      }

      // Check if already processed
      const exists = await this.hasChargeBeenApplied(shipment.id, ChargeType.RTO_CHARGE);
      if (exists) {
        return {
          success: true,
          chargeType: ChargeType.RTO_CHARGE,
          amount: rtoAmount,
          message: 'RTO charge already processed',
        };
      }

      // Create transaction
      const txResult = await this.transactionService.createShipmentTransaction({
        amount: rtoAmount,
        type: TransactionType.DEBIT,
        description: `RTO charge for shipment ${shipment.awb || shipment.id}`,
        userId: shipment.order?.user_id || shipment.user_id,
        shipmentId: shipment.id,
        awb: shipment.awb,
        status: TransactionStatus.COMPLETED,
        currency: 'INR',
        merchantTransactionId: `RTO-${shipment.awb || shipment.id}`,
        charge_type: ChargeType.RTO_CHARGE,
      });

      if (txResult.success) {
        return {
          success: true,
          chargeType: ChargeType.RTO_CHARGE,
          amount: rtoAmount,
          message: 'RTO charge processed successfully',
        };
      } else {
        return {
          success: false,
          chargeType: ChargeType.RTO_CHARGE,
          amount: rtoAmount,
          message: 'Failed to process RTO charge',
          error: txResult.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        chargeType: ChargeType.RTO_CHARGE,
        amount: 0,
        message: 'Error processing RTO charge',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async processCodRefund(shipment: any): Promise<ChargeProcessingResult> {
    try {
      // Get COD amount to refund
      const codAmount = shipment.order?.amount_to_collect || shipment.order?.total_amount || 0;

      if (codAmount <= 0) {
        return {
          success: true,
          chargeType: ChargeType.COD_REVERSAL,
          amount: 0,
          message: 'No COD amount to refund',
        };
      }

      // Check if COD refund already processed
      const existingRefund = await this.fastify.prisma.shipmentTransaction.findFirst({
        where: {
          shipment_id: shipment.id,
          charge_type: ChargeType.COD_CHARGE,
          type: TransactionType.CREDIT,
          description: { contains: 'refund' },
        },
      });

      if (existingRefund) {
        return {
          success: true,
          chargeType: ChargeType.COD_REVERSAL,
          amount: codAmount,
          message: 'COD refund already processed',
        };
      }

      // Create refund transaction
      const txResult = await this.transactionService.createShipmentTransaction({
        amount: codAmount,
        type: TransactionType.CREDIT,
        description: `COD refund for RTO shipment ${shipment.awb || shipment.id}`,
        userId: shipment.order?.user_id || shipment.user_id,
        shipmentId: shipment.id,
        awb: shipment.awb,
        status: TransactionStatus.COMPLETED,
        currency: 'INR',
        merchantTransactionId: `COD-REFUND-${shipment.awb || shipment.id}`,
        charge_type: ChargeType.COD_CHARGE,
      });

      if (txResult.success) {
        return {
          success: true,
          chargeType: ChargeType.COD_REVERSAL,
          amount: codAmount,
          message: 'COD refund processed successfully',
        };
      } else {
        return {
          success: false,
          chargeType: ChargeType.COD_REVERSAL,
          amount: codAmount,
          message: 'Failed to process COD refund',
          error: txResult.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        chargeType: ChargeType.COD_REVERSAL,
        amount: 0,
        message: 'Error processing COD refund',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Helper methods for charge eligibility checks
  private isRtoStatus(status: string): boolean {
    return ['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(status);
  }

  private shouldProcessRtoCharge(shipment: any): boolean {
    return this.isRtoStatus(shipment.status) && (shipment.rto_charge > 0 || shipment.pricing?.is_rto_applicable);
  }

  private shouldProcessCodRefund(shipment: any): boolean {
    return (
      this.isRtoStatus(shipment.status) &&
      shipment.order?.payment_method === 'COD' &&
      (shipment.order?.amount_to_collect > 0 || shipment.order?.total_amount > 0)
    );
  }
}
