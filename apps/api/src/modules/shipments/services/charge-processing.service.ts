import { FastifyInstance } from 'fastify';
import { TransactionService, TransactionType, TransactionEntityType } from '@/modules/transactions/services/transaction-service';
import { ShipmentStatus, ChargeType as PrismaChargeType, ChargeType } from '@lorrigo/db';

interface ChargeProcessingResult {
  success: boolean;
  chargeType: ChargeType;
  amount: number;
  message: string;
  error?: string;
}

export class ChargeProcessingService {
  private transactionService: TransactionService;

  constructor(private fastify: FastifyInstance) {
    this.transactionService = new TransactionService(fastify);
  }

  async processShipmentCharges(shipment: any): Promise<ChargeProcessingResult[]> {
    const results: ChargeProcessingResult[] = [];
    if (this.shouldProcessForwardCharge(shipment)) {
      results.push(await this.processForwardCharge(shipment));
    }
    if (this.shouldProcessCodCharge(shipment)) {
      results.push(await this.processCodCharge(shipment));
    }
    if (this.shouldProcessRtoCharge(shipment)) {
      results.push(await this.processRtoCharge(shipment));
    }
    if (this.shouldProcessForwardExcessWeight(shipment)) {
      results.push(await this.processForwardExcessWeight(shipment));
    }
    if (this.shouldProcessRtoExcessWeight(shipment)) {
      results.push(await this.processRtoExcessWeight(shipment));
    }
    if (this.shouldProcessCodReversal(shipment)) {
      results.push(await this.processCodReversal(shipment));
    }
    return results;
  }

  private shouldProcessForwardCharge(shipment: any): boolean {
    return !shipment.forward_charge_processed && shipment.fw_charge && shipment.fw_charge > 0;
  }
  private shouldProcessCodCharge(shipment: any): boolean {
    return !shipment.cod_charge_processed && shipment.cod_charge && shipment.cod_charge > 0 && shipment.order?.payment_mode === 'COD';
  }
  private shouldProcessRtoCharge(shipment: any): boolean {
    return !shipment.rto_charge_processed && shipment.rto_charge && shipment.rto_charge > 0 && (shipment.status === ShipmentStatus.RTO_INITIATED || shipment.status === ShipmentStatus.RTO_IN_TRANSIT);
  }
  private shouldProcessForwardExcessWeight(shipment: any): boolean {
    return !shipment.forward_excess_weight_processed && shipment.forward_excess_weight_charge && shipment.forward_excess_weight_charge > 0;
  }
  private shouldProcessRtoExcessWeight(shipment: any): boolean {
    return !shipment.rto_excess_weight_processed && shipment.rto_excess_weight_charge && shipment.rto_excess_weight_charge > 0 && (shipment.status === ShipmentStatus.RTO_INITIATED || shipment.status === ShipmentStatus.RTO_IN_TRANSIT);
  }
  private shouldProcessCodReversal(shipment: any): boolean {
    return !shipment.cod_reversal_processed && shipment.cod_charge && shipment.cod_charge > 0 && shipment.order?.payment_mode === 'COD' && (shipment.status === ShipmentStatus.RTO_INITIATED || shipment.status === ShipmentStatus.RTO_IN_TRANSIT);
  }

  private async processForwardCharge(shipment: any): Promise<ChargeProcessingResult> {
    try {
      const amount = shipment.fw_charge;
      const existingTx = await this.fastify.prisma.shipmentTransaction.findFirst({
        where: { shipment_id: shipment.id, charge_type: PrismaChargeType.FORWARD_CHARGE },
      });
      if (existingTx) {
        return { success: true, chargeType: ChargeType.FORWARD_CHARGE, amount, message: 'Forward charge already processed' };
      }
      const txResult = await this.transactionService.createTransaction(TransactionEntityType.SHIPMENT, {
        amount,
        type: TransactionType.DEBIT,
        description: `Forward charge for shipment ${shipment.id}`,
        userId: shipment.order.user_id,
        shipmentId: shipment.id,
        awb: shipment.awb,
        status: 'COMPLETED',
        currency: 'INR',
        merchantTransactionId: `FW-${shipment.awb}`,
        charge_type: PrismaChargeType.FORWARD_CHARGE,
      });
      if (txResult.success) {
        await this.fastify.prisma.shipment.update({ where: { id: shipment.id }, data: { forward_charge_processed: true } });
        return { success: true, chargeType: ChargeType.FORWARD_CHARGE, amount, message: 'Forward charge processed successfully' };
      } else {
        return { success: false, chargeType: ChargeType.FORWARD_CHARGE, amount, message: 'Failed to process forward charge', error: txResult.error };
      }
    } catch (error) {
      return { success: false, chargeType: ChargeType.FORWARD_CHARGE, amount: shipment.fw_charge || 0, message: 'Error processing forward charge', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  private async processCodCharge(shipment: any): Promise<ChargeProcessingResult> {
    try {
      const amount = shipment.cod_charge;
      const existingTx = await this.fastify.prisma.shipmentTransaction.findFirst({
        where: { shipment_id: shipment.id, charge_type: PrismaChargeType.COD_CHARGE },
      });
      if (existingTx) {
        return { success: true, chargeType: ChargeType.COD_CHARGE, amount, message: 'COD charge already processed' };
      }
      const txResult = await this.transactionService.createTransaction(TransactionEntityType.SHIPMENT, {
        amount,
        type: TransactionType.DEBIT,
        description: `COD charge for shipment ${shipment.id}`,
        userId: shipment.order.user_id,
        shipmentId: shipment.id,
        awb: shipment.awb,
        status: 'COMPLETED',
        currency: 'INR',
        merchantTransactionId: `COD-${shipment.id}`,
        charge_type: PrismaChargeType.COD_CHARGE,
      });
      if (txResult.success) {
        await this.fastify.prisma.shipment.update({ where: { id: shipment.id }, data: { cod_charge_processed: true } });
        return { success: true, chargeType: ChargeType.COD_CHARGE, amount, message: 'COD charge processed successfully' };
      } else {
        return { success: false, chargeType: ChargeType.COD_CHARGE, amount, message: 'Failed to process COD charge', error: txResult.error };
      }
    } catch (error) {
      return { success: false, chargeType: ChargeType.COD_CHARGE, amount: shipment.cod_charge || 0, message: 'Error processing COD charge', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  private async processRtoCharge(shipment: any): Promise<ChargeProcessingResult> {
    try {
      const amount = shipment.rto_charge;
      const existingTx = await this.fastify.prisma.shipmentTransaction.findFirst({
        where: { shipment_id: shipment.id, charge_type: PrismaChargeType.RTO_CHARGE },
      });
      if (existingTx) {
        return { success: true, chargeType: ChargeType.RTO_CHARGE, amount, message: 'RTO charge already processed' };
      }
      const txResult = await this.transactionService.createTransaction(TransactionEntityType.SHIPMENT, {
        amount,
        type: TransactionType.DEBIT,
        description: `RTO charge for shipment ${shipment.id}`,
        userId: shipment.order.user_id,
        shipmentId: shipment.id,
        awb: shipment.awb,
        status: 'COMPLETED',
        currency: 'INR',
        merchantTransactionId: `RTO-${shipment.id}`,
        charge_type: PrismaChargeType.RTO_CHARGE,
      });
      if (txResult.success) {
        await this.fastify.prisma.shipment.update({ where: { id: shipment.id }, data: { rto_charge_processed: true } });
        return { success: true, chargeType: ChargeType.RTO_CHARGE, amount, message: 'RTO charge processed successfully' };
      } else {
        return { success: false, chargeType: ChargeType.RTO_CHARGE, amount, message: 'Failed to process RTO charge', error: txResult.error };
      }
    } catch (error) {
      return { success: false, chargeType: ChargeType.RTO_CHARGE, amount: shipment.rto_charge || 0, message: 'Error processing RTO charge', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  private async processForwardExcessWeight(shipment: any): Promise<ChargeProcessingResult> {
    try {
      const amount = shipment.forward_excess_weight_charge;
      const existingTx = await this.fastify.prisma.shipmentTransaction.findFirst({
        where: { shipment_id: shipment.id, charge_type: PrismaChargeType.FORWARD_EXCESS_WEIGHT },
      });
      if (existingTx) {
        return { success: true, chargeType: ChargeType.FORWARD_EXCESS_WEIGHT, amount, message: 'Forward excess weight charge already processed' };
      }
      const txResult = await this.transactionService.createTransaction(TransactionEntityType.SHIPMENT, {
        amount,
        type: TransactionType.DEBIT,
        description: `Forward excess weight charge for shipment ${shipment.id}`,
        userId: shipment.order.user_id,
        shipmentId: shipment.id,
        awb: shipment.awb,
        status: 'COMPLETED',
        currency: 'INR',
        merchantTransactionId: `FEW-${shipment.id}`,
        charge_type: PrismaChargeType.FORWARD_EXCESS_WEIGHT,
      });
      if (txResult.success) {
        await this.fastify.prisma.shipment.update({ where: { id: shipment.id }, data: { forward_excess_weight_processed: true } });
        return { success: true, chargeType: ChargeType.FORWARD_EXCESS_WEIGHT, amount, message: 'Forward excess weight charge processed successfully' };
      } else {
        return { success: false, chargeType: ChargeType.FORWARD_EXCESS_WEIGHT, amount, message: 'Failed to process forward excess weight charge', error: txResult.error };
      }
    } catch (error) {
      return { success: false, chargeType: ChargeType.FORWARD_EXCESS_WEIGHT, amount: shipment.forward_excess_weight_charge || 0, message: 'Error processing forward excess weight charge', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  private async processRtoExcessWeight(shipment: any): Promise<ChargeProcessingResult> {
    try {
      const amount = shipment.rto_excess_weight_charge;
      const existingTx = await this.fastify.prisma.shipmentTransaction.findFirst({
        where: { shipment_id: shipment.id, charge_type: PrismaChargeType.RTO_EXCESS_WEIGHT },
      });
      if (existingTx) {
        return { success: true, chargeType: ChargeType.RTO_EXCESS_WEIGHT, amount, message: 'RTO excess weight charge already processed' };
      }
      const txResult = await this.transactionService.createTransaction(TransactionEntityType.SHIPMENT, {
        amount,
        type: TransactionType.DEBIT,
        description: `RTO excess weight charge for shipment ${shipment.id}`,
        userId: shipment.order.user_id,
        shipmentId: shipment.id,
        awb: shipment.awb,
        status: 'COMPLETED',
        currency: 'INR',
        merchantTransactionId: `REW-${shipment.id}`,
        charge_type: PrismaChargeType.RTO_EXCESS_WEIGHT,
      });
      if (txResult.success) {
        await this.fastify.prisma.shipment.update({ where: { id: shipment.id }, data: { rto_excess_weight_processed: true } });
        return { success: true, chargeType: ChargeType.RTO_EXCESS_WEIGHT, amount, message: 'RTO excess weight charge processed successfully' };
      } else {
        return { success: false, chargeType: ChargeType.RTO_EXCESS_WEIGHT, amount, message: 'Failed to process RTO excess weight charge', error: txResult.error };
      }
    } catch (error) {
      return { success: false, chargeType: ChargeType.RTO_EXCESS_WEIGHT, amount: shipment.rto_excess_weight_charge || 0, message: 'Error processing RTO excess weight charge', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  private async processCodReversal(shipment: any): Promise<ChargeProcessingResult> {
    try {
      const amount = shipment.cod_charge;
      const existingTx = await this.fastify.prisma.shipmentTransaction.findFirst({
        where: { shipment_id: shipment.id, charge_type: PrismaChargeType.COD_REVERSAL },
      });
      if (existingTx) {
        return { success: true, chargeType: ChargeType.COD_REVERSAL, amount, message: 'COD reversal already processed' };
      }
      const txResult = await this.transactionService.createTransaction(TransactionEntityType.SHIPMENT, {
        amount,
        type: TransactionType.CREDIT,
        description: `COD reversal for RTO shipment ${shipment.id}`,
        userId: shipment.order.user_id,
        shipmentId: shipment.id,
        awb: shipment.awb,
        status: 'COMPLETED',
        currency: 'INR',
        merchantTransactionId: `COD-REV-${shipment.id}`,
        charge_type: PrismaChargeType.COD_REVERSAL,
      });
      if (txResult.success) {
        await this.fastify.prisma.shipment.update({ where: { id: shipment.id }, data: { cod_reversal_processed: true } });
        return { success: true, chargeType: ChargeType.COD_REVERSAL, amount, message: 'COD reversal processed successfully' };
      } else {
        return { success: false, chargeType: ChargeType.COD_REVERSAL, amount, message: 'Failed to process COD reversal', error: txResult.error };
      }
    } catch (error) {
      return { success: false, chargeType: ChargeType.COD_REVERSAL, amount: shipment.cod_charge || 0, message: 'Error processing COD reversal', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
} 