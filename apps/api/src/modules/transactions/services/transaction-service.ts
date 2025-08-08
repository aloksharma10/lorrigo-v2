import { FastifyInstance } from 'fastify';
import { PrismaClient, TransactionStatus, ChargeType, Prisma } from '@lorrigo/db';
import { generateId, getFinancialYear } from '@lorrigo/utils';
import { Queue } from 'bullmq';
import { QueueNames } from '@/lib/queue';

/**
 * Type definitions for transaction service
 */
export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  HOLD = 'HOLD',
  HOLD_RELEASE = 'HOLD_RELEASE',
}

export enum TransactionEntityType {
  SHIPMENT = 'SHIPMENT',
  INVOICE = 'INVOICE',
  WALLET = 'WALLET',
  REMITTANCE = 'REMITTANCE',
}

interface BaseTransactionData {
  amount: number;
  type: TransactionType;
  description: string;
  userId: string;
  currency?: string;
  status?: TransactionStatus;
  merchantTransactionId?: string;
}

interface ShipmentTransactionData extends BaseTransactionData {
  shipmentId: string;
  awb?: string;
  srShipmentId?: string;
  transactionId?: string;
  charge_type?: ChargeType;
}

interface InvoiceTransactionData extends BaseTransactionData {
  invoiceId: string;
  invoiceNumber?: string;
  transactionId?: string;
}

interface WalletRechargeTransactionData extends BaseTransactionData {
  transactionId?: string;
  gatewayReference?: string;
}

interface RemittanceTransactionData extends BaseTransactionData {
  remittanceId: string;
  remittanceCode?: string;
  transactionId?: string;
}

interface WalletUpdateResult {
  success: boolean;
  walletId?: string;
  balance?: number;
  error?: string;
}

/**
 * Service for handling all transaction-related operations
 */
export class TransactionService {
  private prisma: PrismaClient;
  private fastify: FastifyInstance;
  private transactionQueue?: Queue;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.prisma = fastify.prisma;

    // Try to get the queue from fastify instance if available
    if (fastify.queues && fastify.queues[QueueNames.BULK_OPERATION]) {
      this.transactionQueue = fastify.queues[QueueNames.BULK_OPERATION];
    }
  }

  /**
   * Create a shipment transaction
   * @param data Transaction data
   * @returns Transaction details or error
   */
  async createShipmentTransaction(data: ShipmentTransactionData) {
    try {
      
      if (data.amount <= 0) {
        return { success: false, error: 'Amount cannot be zero or negative' };
      }

      // Check if transaction already exists to prevent duplicates
      if (data.awb && data.charge_type) {
        const existingTransaction = await this.prisma.shipmentTransaction.findFirst({
          where: {
            shipment_id: data.shipmentId,
            awb: data.awb,
            type: data.type,
            charge_type: data.charge_type,
          },
        });

        if (existingTransaction) {
          this.fastify.log.info(
            `Transaction already exists for shipment ${data.shipmentId}, AWB ${data.awb}, charge type ${data.charge_type}, type ${data.type}`
          );
          return { success: true, transaction: existingTransaction };
        }
      }

      // Get user wallet
      const walletResult = await this.getUserWallet(data.userId);
      if (!walletResult.success) {
        return { success: false, error: walletResult.error };
      }

      // Generate transaction code
      const transactionCode = await this.generateTransactionCode('shipment');

      // Validate shipment exists
      const shipment = await this.prisma.shipment.findUnique({
        where: { id: data.shipmentId },
        select: { id: true, user_id: true },
      });

      if (!shipment) {
        return { success: false, error: 'Shipment not found' };
      }

      if (shipment.user_id !== data.userId) {
        return { success: false, error: 'Unauthorized access to shipment' };
      }

      // Update wallet balance
      const walletUpdateResult = await this.updateWalletBalance(walletResult.walletId!, data.amount, data.type);

      if (!walletUpdateResult.success) {
        return { success: false, error: walletUpdateResult.error };
      }

      // Create transaction record
      const transaction = await this.prisma.shipmentTransaction.create({
        data: {
          before_balance: walletResult.balance,
          after_balance: walletUpdateResult.balance,
          code: transactionCode,
          amount: data.amount,
          type: data.type,
          description: data.description,
          status: data.status || TransactionStatus.COMPLETED,
          merchant_transaction_id: data.merchantTransactionId,
          currency: data.currency || 'INR',
          awb: data.awb,
          sr_shipment_id: data.srShipmentId,
          wallet_id: walletResult.walletId!,
          user_id: data.userId,
          shipment_id: data.shipmentId,
          transaction_id: data.transactionId,
          charge_type: data.charge_type,
        },
      });

      return {
        success: true,
        transaction,
        walletBalance: walletUpdateResult.balance,
      };
    } catch (error) {
      this.fastify.log.error(`Error creating shipment transaction: ${error}`);
      return { success: false, error: 'Failed to create transaction' };
    }
  }

  /**
   * Create an invoice transaction
   * @param data Transaction data
   * @returns Transaction details or error
   */
  async createInvoiceTransaction(data: InvoiceTransactionData) {
    try {
      // Get user wallet
      const walletResult = await this.getUserWallet(data.userId);
      if (!walletResult.success) {
        return { success: false, error: walletResult.error };
      }

      // Generate transaction code
      const transactionCode = await this.generateTransactionCode('invoice');

      // Validate invoice exists
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: data.invoiceId },
        select: { id: true, user_id: true },
      });

      if (!invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      if (invoice.user_id !== data.userId) {
        return { success: false, error: 'Unauthorized access to invoice' };
      }

      // Update wallet balance
      const walletUpdateResult = await this.updateWalletBalance(walletResult.walletId!, data.amount, data.type);

      if (!walletUpdateResult.success) {
        return { success: false, error: walletUpdateResult.error };
      }

      // Create transaction record
      const transaction = await this.prisma.invoiceTransaction.create({
        data: {
          before_balance: walletResult.balance,
          after_balance: walletUpdateResult.balance,
          code: transactionCode,
          amount: data.amount,
          type: data.type,
          description: data.description,
          status: data.status || TransactionStatus.COMPLETED,
          merchant_transaction_id: data.merchantTransactionId,
          currency: data.currency || 'INR',
          invoice_number: data.invoiceNumber,
          wallet_id: walletResult.walletId!,
          user_id: data.userId,
          invoice_id: data.invoiceId,
          transaction_id: data.transactionId,
        },
      });

      return {
        success: true,
        transaction,
        walletBalance: walletUpdateResult.balance,
      };
    } catch (error) {
      this.fastify.log.error(`Error creating invoice transaction: ${error}`);
      return { success: false, error: 'Failed to create transaction' };
    }
  }

  /**
   * Create a remittance transaction
   * @param data Transaction data
   * @returns Transaction details or error
   */
  async createRemittanceTransaction(data: RemittanceTransactionData) {
    try {
      // Get user wallet
      const walletResult = await this.getUserWallet(data.userId);
      if (!walletResult.success) {
        return { success: false, error: walletResult.error };
      }

      // Generate transaction code
      const transactionCode = await this.generateTransactionCode('remittance');

      // Validate remittance exists and belongs to user
      const remittance = await this.prisma.remittance.findUnique({
        where: { id: data.remittanceId },
        select: { 
          id: true, 
          user_id: true, 
          amount: true, 
          status: true, 
          code: true,
          wallet_balance_before: true,
          wallet_balance_after: true
        },
      });

      if (!remittance) {
        return { success: false, error: 'Remittance not found' };
      }

      if (remittance.user_id !== data.userId) {
        return { success: false, error: 'Unauthorized access to remittance' };
      }

      if (remittance.status !== 'PENDING') {
        return { success: false, error: 'Remittance is not in pending status' };
      }

      // Check if amount is valid
      if (data.amount <= 0) {
        return { success: false, error: 'Amount must be greater than 0' };
      }

      if (data.amount > remittance.amount) {
        return { success: false, error: 'Amount cannot be greater than remittance amount' };
      }

      // Check if wallet transfer already done
      if (remittance.wallet_balance_before !== null && remittance.wallet_balance_after !== null) {
        return { success: false, error: 'Wallet transfer already completed for this remittance' };
      }

      // Update wallet balance
      const walletUpdateResult = await this.updateWalletBalance(walletResult.walletId!, data.amount, data.type);

      if (!walletUpdateResult.success) {
        return { success: false, error: walletUpdateResult.error };
      }

      // Create transaction record
      const transaction = await this.prisma.remittanceTransaction.create({
        data: {
          before_balance: walletResult.balance,
          after_balance: walletUpdateResult.balance,
          code: transactionCode,
          amount: data.amount,
          type: data.type,
          description: data.description,
          status: data.status || TransactionStatus.COMPLETED,
          merchant_transaction_id: data.merchantTransactionId || `RT-${remittance.code}`,
          currency: data.currency || 'INR',
          wallet_id: walletResult.walletId!,
          user_id: data.userId,
          remittance_id: data.remittanceId,
          transaction_id: data.transactionId,
        },
      });

      return {
        success: true,
        transaction,
        walletBalance: walletUpdateResult.balance,
      };
    } catch (error) {
      this.fastify.log.error(`Error creating remittance transaction: ${error}`);
      return { success: false, error: 'Failed to create remittance transaction' };
    }
  }

  /**
   * Create a wallet recharge transaction
   * @param data Transaction data
   * @returns Transaction details or error
   */
  async createWalletRechargeTransaction(data: WalletRechargeTransactionData) {
    try {
      // Get user wallet
      const walletResult = await this.getUserWallet(data.userId);
      if (!walletResult.success) {
        return { success: false, error: walletResult.error };
      }

      // Generate transaction code
      const transactionCode = await this.generateTransactionCode('wallet');

      // Update wallet balance (skip for HOLD types as they're handled separately in billing logic)
      let walletUpdateResult;
      if (data.type === TransactionType.HOLD || data.type === TransactionType.HOLD_RELEASE) {
        // Fetch wallet with lock to prevent race conditions
        const wallet = await this.prisma.userWallet.findUnique({
          where: { user_id: data.userId },
        });

        if (!wallet) {
          return { success: false, error: 'User wallet not found' };
        }

        // Calculate new hold amount based on transaction type
        let newHoldAmount: number;
        if (data.type === TransactionType.HOLD) {
          // For HOLD: increase hold_amount, check if sufficient usable funds
          if (wallet.usable_amount < data.amount) {
            return { success: false, error: 'Insufficient usable funds for hold' };
          }
          newHoldAmount = wallet.hold_amount + data.amount;
        } else {
          // For HOLD_RELEASE: decrease hold_amount, ensure non-negative
          newHoldAmount = wallet.hold_amount - data.amount;
          if (newHoldAmount < 0) {
            return { success: false, error: 'Cannot release more than held amount' };
          }
        }

        // Update wallet with new hold_amount and adjust usable_amount
        await this.prisma.userWallet.update({
          where: { id: wallet.id },
          data: {
            hold_amount: newHoldAmount,
            usable_amount: data.type === TransactionType.HOLD ? wallet.usable_amount - data.amount : wallet.usable_amount + data.amount,
          },
        });

        return {
          success: true,
          balance: {
            hold_amount: newHoldAmount,
            usable_amount: data.type === TransactionType.HOLD ? wallet.usable_amount - data.amount : wallet.usable_amount + data.amount,
          },
        };
      } else {
        // Existing logic for other transaction types
        walletUpdateResult = await this.updateWalletBalance(walletResult.walletId!, data.amount, data.type);

        if (!walletUpdateResult.success) {
          return { success: false, error: walletUpdateResult.error };
        }
      }

      // Create transaction record
      const transaction = await this.prisma.walletRechargeTransaction.create({
        data: {
          before_balance: walletResult.balance,
          after_balance: walletUpdateResult.balance,
          code: transactionCode,
          amount: data.amount,
          type: data.type,
          description: data.description,
          status: data.status || TransactionStatus.COMPLETED,
          merchant_transaction_id: data.merchantTransactionId,
          currency: data.currency || 'INR',
          wallet_id: walletResult.walletId!,
          user_id: data.userId,
          transaction_id: data.transactionId,
        },
      });

      return {
        success: true,
        transaction,
        walletBalance: walletUpdateResult.balance,
      };
    } catch (error) {
      this.fastify.log.error(`Error creating wallet recharge transaction: ${error}`);
      return { success: false, error: 'Failed to create transaction' };
    }
  }

  /**
   * Create a transaction of any type
   * This is a generic function that can handle any transaction type
   * @param entityType Type of transaction (SHIPMENT, INVOICE, WALLET, REMITTANCE)
   * @param data Transaction data
   * @returns Transaction details or error
   */
  async createTransaction(entityType: TransactionEntityType, data: ShipmentTransactionData | InvoiceTransactionData | WalletRechargeTransactionData | RemittanceTransactionData) {
    try {
      switch (entityType) {
        case TransactionEntityType.SHIPMENT:
          return this.createShipmentTransaction(data as ShipmentTransactionData);
        case TransactionEntityType.INVOICE:
          return this.createInvoiceTransaction(data as InvoiceTransactionData);
        case TransactionEntityType.WALLET:
          return this.createWalletRechargeTransaction(data as WalletRechargeTransactionData);
        case TransactionEntityType.REMITTANCE:
          return this.createRemittanceTransaction(data as RemittanceTransactionData);
        default:
          return { success: false, error: 'Invalid transaction type' };
      }
    } catch (error) {
      this.fastify.log.error(`Error creating transaction: ${error}`);
      return { success: false, error: 'Failed to create transaction' };
    }
  }

  /**
   * Process a transaction within a database transaction
   * This is useful for operations that need to be atomic
   * @param prisma Prisma client from transaction
   * @param entityType Type of entity (shipment, invoice, wallet)
   * @param data Transaction data
   * @returns Transaction result
   */
  async processTransactionWithinTx(
    prisma: PrismaClient,
    entityType: TransactionEntityType,
    data: ShipmentTransactionData | InvoiceTransactionData | WalletRechargeTransactionData | RemittanceTransactionData
  ) {
    try {
      // Get user wallet
      const wallet = await prisma.userWallet.findUnique({
        where: { user_id: data.userId },
      });

      if (!wallet) {
        return { success: false, error: 'User wallet not found' };
      }

      // Generate transaction code
      let prefix: string;
      switch (entityType) {
        case TransactionEntityType.SHIPMENT:
          prefix = 'ST';
          break;
        case TransactionEntityType.INVOICE:
          prefix = 'IT';
          break;
        case TransactionEntityType.WALLET:
          prefix = 'WT';
          break;
        case TransactionEntityType.REMITTANCE:
          prefix = 'RT';
          break;
        default:
          prefix = 'TR';
          break;
      }

      const transactionCode = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Update wallet balance
      const newBalance = data.type === TransactionType.CREDIT ? wallet.balance + data.amount : wallet.balance - data.amount;

      // Check if balance would go negative
      if (newBalance < 0) {
        // Check if user has permission for negative balance
        const maxNegativeBalance = (await this.prisma.userWallet.findUnique({
          where: { user_id: wallet.user_id },
          select: { max_negative_amount: true },
        })) || { max_negative_amount: 0 };

        if (newBalance < -maxNegativeBalance?.max_negative_amount) {
          return {
            success: false,
            error: `Insufficient funds. Maximum allowed negative balance is ${maxNegativeBalance?.max_negative_amount}`,
          };
        }
      }

      // Update wallet
      await prisma.userWallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      // Create transaction record based on entity type
      let transaction;
      switch (entityType) {
        case TransactionEntityType.SHIPMENT:
          {
            const shipmentData = data as ShipmentTransactionData;
            transaction = await prisma.shipmentTransaction.create({
              data: {
                before_balance: wallet.balance,
                after_balance: newBalance,
                code: transactionCode,
                amount: data.amount,
                type: data.type,
                description: data.description,
                status: data.status || TransactionStatus.COMPLETED,
                merchant_transaction_id: data.merchantTransactionId,
                currency: data.currency || 'INR',
                awb: shipmentData.awb,
                sr_shipment_id: shipmentData?.srShipmentId || '',
                wallet_id: wallet.id,
                user_id: data.userId,
                shipment_id: shipmentData.shipmentId,
                transaction_id: shipmentData.transactionId,
                ...(shipmentData.charge_type ? { charge_type: shipmentData.charge_type } : {}),
              },
            });
          }
          break;
        case TransactionEntityType.INVOICE:
          {
            const invoiceData = data as InvoiceTransactionData;
            transaction = await prisma.invoiceTransaction.create({
              data: {
                before_balance: wallet.balance,
                after_balance: newBalance,
                code: transactionCode,
                amount: data.amount,
                type: data.type,
                description: data.description,
                status: data.status || TransactionStatus.COMPLETED,
                merchant_transaction_id: data.merchantTransactionId,
                currency: data.currency || 'INR',
                invoice_number: invoiceData.invoiceNumber,
                wallet_id: wallet.id,
                user_id: data.userId,
                invoice_id: invoiceData.invoiceId,
                transaction_id: invoiceData.transactionId,
              },
            });
          }
          break;
        case TransactionEntityType.WALLET:
          {
            const walletData = data as WalletRechargeTransactionData;
            transaction = await prisma.walletRechargeTransaction.create({
              data: {
                before_balance: wallet.balance,
                after_balance: newBalance,
                code: transactionCode,
                amount: data.amount,
                type: data.type,
                description: data.description,
                status: data.status || TransactionStatus.COMPLETED,
                merchant_transaction_id: data.merchantTransactionId,
                currency: data.currency || 'INR',
                wallet_id: wallet.id,
                user_id: data.userId,
                transaction_id: walletData.transactionId,
              },
            });
          }
          break;
        case TransactionEntityType.REMITTANCE:
          {
            const remittanceData = data as RemittanceTransactionData;
            transaction = await prisma.remittanceTransaction.create({
              data: {
                before_balance: wallet.balance,
                after_balance: newBalance,
                code: transactionCode,
                amount: data.amount,
                type: data.type,
                description: data.description,
                status: data.status || TransactionStatus.COMPLETED,
                merchant_transaction_id: data.merchantTransactionId || `RT-${remittanceData.remittanceCode || 'REMITTANCE'}`,
                currency: data.currency || 'INR',
                wallet_id: wallet.id,
                user_id: data.userId,
                remittance_id: remittanceData.remittanceId,
                transaction_id: remittanceData.transactionId,
              },
            });
          }
          break;
      }

      return {
        success: true,
        transaction,
        walletBalance: newBalance,
      };
    } catch (error) {
      this.fastify.log.error(`Error processing transaction within TX: ${error}`);
      throw error; // Let the transaction handle the error
    }
  }

  /**
   * Recharge a user's wallet using PhonePe payment gateway
   * @param userId User ID
   * @param amount Amount to recharge
   * @param redirectUrl URL to redirect after payment
   * @returns Payment link and transaction details
   */
  async rechargeWallet(userId: string, amount: number, redirectUrl: string) {
    try {
      // Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, phone: true },
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Get user wallet
      const walletResult = await this.getUserWallet(userId);
      if (!walletResult.success) {
        return { success: false, error: walletResult.error };
      }

      // Generate merchant transaction ID
      const merchantTransactionId = `WT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Create a pending transaction
      const transaction = await this.prisma.walletRechargeTransaction.create({
        data: {
          before_balance: walletResult.balance,
          after_balance: (walletResult.balance || 0) + amount,
          code: await this.generateTransactionCode('wallet'),
          amount,
          type: TransactionType.CREDIT,
          description: `Wallet recharge of ₹${amount}`,
          status: TransactionStatus.PENDING,
          merchant_transaction_id: merchantTransactionId,
          currency: 'INR',
          wallet_id: walletResult.walletId!,
          user_id: userId,
        },
      });

      // Import PhonePe service dynamically to avoid circular dependencies
      const { PhonePeService } = await import('./phonepe-service');
      const phonePeService = new PhonePeService(this.fastify);

      // Generate payment link using PhonePe
      const paymentResult = await phonePeService.generatePaymentLink(amount, merchantTransactionId, userId, `${redirectUrl}/${merchantTransactionId}`);

      if (!paymentResult.success) {
        // If payment link generation fails, mark transaction as failed
        await this.prisma.walletRechargeTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            description: `${transaction.description} - Failed to generate payment link`,
          },
        });

        return { success: false, error: paymentResult.error || 'Failed to generate payment link' };
      }

      return {
        success: true,
        transaction,
        paymentLink: paymentResult.paymentLink,
        merchantTransactionId,
      };
    } catch (error) {
      this.fastify.log.error(`Error initiating wallet recharge: ${error}`);
      return { success: false, error: 'Failed to initiate wallet recharge' };
    }
  }

  /**
   * Verify and process a wallet recharge callback from payment gateway
   * @param merchantTransactionId Merchant transaction ID
   * @param paymentStatus Payment status from gateway
   * @param gatewayReference Gateway reference ID
   * @returns Updated transaction details
   */
  async verifyWalletRecharge(merchantTransactionId: string, paymentStatus: 'SUCCESS' | 'FAILURE', gatewayReference: string) {
    try {
      // Find the pending transaction
      const transaction = await this.prisma.walletRechargeTransaction.findUnique({
        where: { merchant_transaction_id: merchantTransactionId },
        include: { wallet: true },
      });

      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        return { success: false, error: 'Transaction is not in pending state' };
      }

      // Import PhonePe service dynamically to avoid circular dependencies
      const { PhonePeService } = await import('./phonepe-service');
      const phonePeService = new PhonePeService(this.fastify);

      // Verify payment status with PhonePe
      const verificationResult = await phonePeService.checkPaymentStatus(merchantTransactionId);

      // If verification fails, use the provided status
      const finalPaymentStatus = verificationResult.success ? verificationResult.paymentStatus : paymentStatus;

      // Process the transaction based on payment status
      if (finalPaymentStatus === 'SUCCESS') {
        // Update transaction status
        const updatedTransaction = await this.prisma.$transaction(async (prisma) => {
          // Update transaction status
          const updated = await prisma.walletRechargeTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.COMPLETED,
              merchant_transaction_id: merchantTransactionId,
            },
          });

          // Update wallet balance
          await prisma.userWallet.update({
            where: { id: transaction.wallet_id },
            data: {
              balance: { increment: transaction.amount },
            },
          });

          return updated;
        });

        return {
          success: true,
          transaction: updatedTransaction,
          message: 'Wallet recharged successfully',
        };
      } else {
        // Mark transaction as failed
        const updatedTransaction = await this.prisma.walletRechargeTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            merchant_transaction_id: merchantTransactionId,
          },
        });

        return {
          success: false,
          transaction: updatedTransaction,
          error: 'Payment failed',
        };
      }
    } catch (error) {
      this.fastify.log.error(`Error verifying wallet recharge: ${error}`);
      return { success: false, error: 'Failed to verify wallet recharge' };
    }
  }

  /**
   * Get user's wallet balance
   * @param userId User ID
   * @returns Wallet balance
   */
  async getWalletBalance(userId: string) {
    try {
      const wallet = await this.prisma.userWallet.findUnique({
        where: { user_id: userId },
      });

      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      return {
        success: true,
        balance: wallet.balance,
        hold_amount: wallet.hold_amount,
        usable_amount: wallet.usable_amount,
        max_negative_amount: wallet.max_negative_amount,
        available_amount: wallet.available_amount,
        can_create_shipment: wallet.usable_amount > 0,
      };
    } catch (error) {
      this.fastify.log.error(`Error getting wallet balance: ${error}`);
      return { success: false, error: 'Failed to get wallet balance' };
    }
  }

  /**
   * Get user's transaction history
   * @param userId User ID
   * @param type Transaction type (shipment, invoice, wallet)
   * @param page Page number
   * @param limit Items per page
   * @returns Transaction history
   */
  async getTransactionHistory(
    userId: string | undefined,
    type?: TransactionEntityType | TransactionEntityType[],
    page: number = 1,
    limit: number = 10,
    search?: string,
    dateRange?: {
      startDate: string;
      endDate: string;
    },
    transactionType?: TransactionType | TransactionType[],
    status?: TransactionStatus | TransactionStatus[]
  ) {
    try {
      const skip = (page - 1) * limit;
      let transactions: any[] = [];
      let total = 0;

      const dateRangeClause = dateRange
        ? {
            created_at: {
              gte: new Date(dateRange.startDate),
              lte: new Date(dateRange.endDate),
            },
          }
        : {};

      const searchClause = search
        ? {
            OR: [
              { description: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
              { code: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            ],
          }
        : {};

      // Build additional filters
      const additionalFilters: any = {};
      if (transactionType) {
        if (Array.isArray(transactionType)) {
          additionalFilters.type = { in: transactionType };
        } else {
          additionalFilters.type = transactionType;
        }
      }
      if (status) {
        if (Array.isArray(status)) {
          additionalFilters.status = { in: status };
        } else {
          additionalFilters.status = status;
        }
      }

      const whereClause = userId
        ? {
            user_id: userId,
            ...dateRangeClause,
            ...searchClause,
            ...additionalFilters,
          }
        : {
            ...dateRangeClause,
            ...searchClause,
            ...additionalFilters,
          };
      // Get transactions based on type
      if (!type || type.includes(TransactionEntityType.SHIPMENT)) {
        const shipmentTransactions = await this.prisma.shipmentTransaction.findMany({
          where: { ...whereClause, awb: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          skip,
          // take: type ? limit : Math.floor(limit / 3),
          orderBy: { created_at: 'desc' },
          include: {
            shipment: {
              select: {
                code: true,
                awb: true,
                status: true,
              },
            },
          },
        });

        const shipmentCount = await this.prisma.shipmentTransaction.count({
          where: whereClause,
        });

        transactions = [
          ...transactions,
          ...shipmentTransactions.map((t) => ({
            ...t,
            entity_type: TransactionEntityType.SHIPMENT,
          })),
        ];

        if (type === TransactionEntityType.SHIPMENT) {
          total = shipmentCount;
        } else {
          total += shipmentCount;
        }
      }

      if (!type || type.includes(TransactionEntityType.INVOICE)) {
        const invoiceTransactions = await this.prisma.invoiceTransaction.findMany({
          where: whereClause,
          skip,
          // take: type ? limit : Math.floor(limit / 3),
          orderBy: { created_at: 'desc' },
          include: {
            invoice: {
              select: {
                code: true,
                invoice_number: true,
                amount: true,
              },
            },
          },
        });

        const invoiceCount = await this.prisma.invoiceTransaction.count({
          where: whereClause,
        });

        transactions = [
          ...transactions,
          ...invoiceTransactions.map((t) => ({
            ...t,
            entity_type: TransactionEntityType.INVOICE,
          })),
        ];

        if (type && type.includes(TransactionEntityType.INVOICE)) {
          total = invoiceCount;
        } else {
          total += invoiceCount;
        }
      }

      if (!type || type.includes(TransactionEntityType.WALLET)) {
        const walletTransactions = await this.prisma.walletRechargeTransaction.findMany({
          where: whereClause,
          skip,
          // take: type ? limit : Math.floor(limit / 3),
          orderBy: { created_at: 'desc' },
        });

        const walletCount = await this.prisma.walletRechargeTransaction.count({
          where: whereClause,
        });

        transactions = [
          ...transactions,
          ...walletTransactions.map((t) => ({
            ...t,
            entity_type: TransactionEntityType.WALLET,
          })),
        ];

        if (type === TransactionEntityType.WALLET) {
          total = walletCount;
        } else {
          total += walletCount;
        }
      }

      if (!type || type.includes(TransactionEntityType.REMITTANCE)) {
        const remittanceTransactions = await this.prisma.remittanceTransaction.findMany({
          where: whereClause,
          skip,
          // take: type ? limit : Math.floor(limit / 3),
          orderBy: { created_at: 'desc' },
          include: {
            remittance: {
              select: {
                code: true,
                amount: true,
                status: true,
              },
            },
          },
        });

        const remittanceCount = await this.prisma.remittanceTransaction.count({
          where: whereClause,
        });

        transactions = [
          ...transactions,
          ...remittanceTransactions.map((t) => ({
            ...t,
            entity_type: TransactionEntityType.REMITTANCE,
          })),
        ];

        if (type === TransactionEntityType.REMITTANCE) {
          total = remittanceCount;
        } else {
          total += remittanceCount;
        }
      }

      // Sort combined transactions by created_at
      transactions.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

      // If we're getting all types, we need to slice the combined result
      if (!type) {
        transactions = transactions.slice(0, limit);
      }

      return {
        success: true,
        transactions,
        _stats: {
          total_debit: transactions.filter((t) => t.type === TransactionType.DEBIT).reduce((acc, t) => acc + t.amount, 0),
          total_credit: transactions.filter((t) => t.type === TransactionType.CREDIT).reduce((acc, t) => acc + t.amount, 0),
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.fastify.log.error(`Error getting transaction history: ${error}`);
      return { success: false, error: 'Failed to get transaction history' };
    }
  }

  /**
   * Process bulk transactions
   * @param transactions Array of transactions to process
   * @param entityType Type of entity (shipment, invoice, wallet)
   * @returns Job ID for tracking
   */
  async processBulkTransactions(transactions: any[], entityType: TransactionEntityType) {
    try {
      // Process transactions in batches
      const batchSize = 100;
      const results = [];
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);

        // Process batch sequentially to maintain wallet balance consistency
        const batchResults = [];
        for (let j = 0; j < batch.length; j++) {
          const transaction = batch[j];
          const index = j;

          try {
            let result;
            switch (entityType) {
              case TransactionEntityType.SHIPMENT:
                result = await this.createShipmentTransaction(transaction);
                break;
              case TransactionEntityType.INVOICE:
                result = await this.createInvoiceTransaction(transaction);
                break;
              case TransactionEntityType.WALLET:
                result = await this.createWalletRechargeTransaction(transaction);
                break;
              case TransactionEntityType.REMITTANCE:
                result = await this.createRemittanceTransaction(transaction);
                break;
              default:
                result = { success: false, error: 'Invalid entity type' };
            }

            if (result.success && result.transaction) {
              successCount++;
              batchResults.push({
                index: i + index,
                success: true,
                transactionId: result.transaction.id,
                amount: transaction.amount,
                type: transaction.type,
                walletBalance: result.walletBalance,
              });
            } else {
              failedCount++;
              batchResults.push({
                index: i + index,
                success: false,
                error: result.error || 'Transaction failed',
                amount: transaction.amount,
                type: transaction.type,
              });
            }
          } catch (error) {
            failedCount++;
            batchResults.push({
              index: i + index,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              amount: transaction.amount,
              type: transaction.type,
            });
          }
        }

        results.push(...batchResults);
      }

      return {
        success: true,
        results,
        successCount,
        failedCount,
        totalProcessed: transactions.length,
      };
    } catch (error) {
      this.fastify.log.error(`Error processing bulk transactions: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user's wallet or create if it doesn't exist
   * @param userId User ID
   * @returns Wallet ID or error
   */
  private async getUserWallet(userId: string): Promise<WalletUpdateResult> {
    try {
      // Step 1: Get user + wallet_type in one lightweight call
      const userWithProfile = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          profile: {
            select: { wallet_type: true },
          },
          wallet: {
            select: {
              id: true,
              balance: true,
            },
          },
        },
      });

      if (!userWithProfile) {
        return { success: false, error: 'User not found' };
      }

      const { name, profile, wallet: existingWallet } = userWithProfile;

      // Step 2: Restrict postpaid users early
      // if (profile?.wallet_type === 'POSTPAID') {
      //   return { success: false, error: 'Postpaid users cannot have a wallet' };
      // }

      // Step 3: If wallet already exists, return it
      if (existingWallet) {
        return {
          success: true,
          walletId: existingWallet.id,
          balance: existingWallet.balance,
        };
      }

      // Step 4: Count how many wallets created this financial year
      const now = new Date();
      const financialYearStart = new Date(now.getFullYear(), 3, 1); // Assuming FY starts April 1
      const financialYearEnd = new Date(now.getFullYear() + 1, 2, 31); // March 31

      const lastWalletSequenceNumber = await this.prisma.userWallet.count({
        where: {
          created_at: {
            gte: financialYearStart,
            lte: financialYearEnd,
          },
        },
      });

      // Step 5: Generate wallet code
      const walletCode = generateId({
        tableName: 'wallet',
        entityName: name,
        lastUsedFinancialYear: getFinancialYear(now),
        lastSequenceNumber: lastWalletSequenceNumber,
      }).id;

      // Step 6: Create the wallet
      const newWallet = await this.prisma.userWallet.create({
        data: {
          code: walletCode,
          balance: 0,
          user_id: userId,
        },
      });

      return {
        success: true,
        walletId: newWallet.id,
        balance: newWallet.balance,
      };
    } catch (error) {
      this.fastify.log.error(`Error getting user wallet: ${error}`);
      return { success: false, error: 'Failed to get or create user wallet' };
    }
  }

  /**
   * Update wallet balance
   * @param walletId Wallet ID
   * @param amount Amount to update
   * @param type Transaction type (CREDIT or DEBIT)
   * @returns Updated balance or error
   */
  private async updateWalletBalance(walletId: string, amount: number, type: TransactionType): Promise<WalletUpdateResult> {
    try {
      const wallet = await this.prisma.userWallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      // Calculate new balance
      const newBalance = type === TransactionType.CREDIT ? wallet.balance + amount : wallet.balance - amount;

      // Check if balance would go negative
      if (newBalance < 0) {
        // Check if user has permission for negative balance
        const maxNegativeBalance = (await this.prisma.userWallet.findUnique({
          where: { user_id: wallet.user_id },
          select: { max_negative_amount: true },
        })) || { max_negative_amount: 0 };

        if (newBalance < -maxNegativeBalance?.max_negative_amount) {
          return {
            success: false,
            error: `Insufficient funds. Maximum allowed negative balance is ${maxNegativeBalance?.max_negative_amount}`,
          };
        }
      }

      // Update wallet balance
      const updatedWallet = await this.prisma.userWallet.update({
        where: { id: walletId },
        data: { balance: newBalance },
      });

      return { success: true, balance: updatedWallet.balance };
    } catch (error) {
      this.fastify.log.error(`Error updating wallet balance: ${error}`);
      return { success: false, error: 'Failed to update wallet balance' };
    }
  }

  /**
   * Generate a unique transaction code
   * @param type Transaction type (shipment, invoice, wallet)
   * @returns Transaction code
   */
  private async generateTransactionCode(type: string): Promise<string> {
    let prefix: string;
    let table: any;

    switch (type) {
      case 'shipment':
        prefix = 'ST';
        table = this.prisma.shipmentTransaction;
        break;
      case 'invoice':
        prefix = 'IT';
        table = this.prisma.invoiceTransaction;
        break;
      case 'wallet':
        prefix = 'WT';
        table = this.prisma.walletRechargeTransaction;
        break;
      case 'remittance':
        prefix = 'RT';
        table = this.prisma.remittanceTransaction;
        break;
      default:
        prefix = 'TR';
        table = this.prisma.shipmentTransaction; // Default to shipment
    }

    const lastSequenceNumber = await table.count({
      where: {
        created_at: {
          gte: new Date(new Date().getFullYear(), 0, 1),
          lte: new Date(new Date().getFullYear(), 11, 31),
        },
      },
    });

    return generateId({
      tableName: type,
      entityName: type,
      lastUsedFinancialYear: getFinancialYear(new Date()),
      lastSequenceNumber,
    }).id;
  }

  /**
   * Refetch failed transactions
   * @param userId User ID
   * @returns Updated transactions
   */
  async refetchFailedTransactions(userId: string) {
    try {
      // Get recent failed wallet recharge transactions (last day)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const failedTransactions = await this.prisma.walletRechargeTransaction.findMany({
        where: {
          user_id: userId,
          status: TransactionStatus.FAILED,
          created_at: {
            gte: oneDayAgo,
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 5, // Limit to 5 most recent failed transactions
      });

      if (failedTransactions.length === 0) {
        return {
          success: true,
          message: 'No failed transactions found',
          transactions: [],
        };
      }

      // Process each failed transaction
      const updatedTransactions = [];
      for (const transaction of failedTransactions) {
        if (!transaction.merchant_transaction_id) continue;

        // Import PhonePe service dynamically to avoid circular dependencies
        const { PhonePeService } = await import('./phonepe-service');
        const phonePeService = new PhonePeService(this.fastify);

        // Check payment status with PhonePe
        const statusResult = await phonePeService.checkPaymentStatus(transaction.merchant_transaction_id);

        if (!statusResult.success) continue;

        if (statusResult.paymentStatus === 'SUCCESS') {
          // Update transaction and wallet balance
          await this.prisma.$transaction(async (prisma) => {
            // Update transaction status
            await prisma.walletRechargeTransaction.update({
              where: { id: transaction.id },
              data: {
                status: TransactionStatus.COMPLETED,
              },
            });

            // Update wallet balance
            await prisma.userWallet.update({
              where: { id: transaction.wallet_id },
              data: {
                balance: { increment: transaction.amount },
              },
            });
          });

          updatedTransactions.push({
            ...transaction,
            status: TransactionStatus.COMPLETED,
          });
        }
      }

      return {
        success: true,
        transactions: updatedTransactions,
      };
    } catch (error) {
      this.fastify.log.error(`Error refetching failed transactions: ${error}`);
      return { success: false, error: 'Failed to refetch transactions' };
    }
  }

  /**
   * Pay invoice using payment gateway
   * @param userId User ID
   * @param amount Amount to pay
   * @param invoiceId Invoice ID
   * @param origin Origin URL for redirect
   * @returns Payment link and transaction details
   */
  async payInvoice(userId: string, amount: number, invoiceId: string, origin: string) {
    try {
      // Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Get user wallet
      const walletResult = await this.getUserWallet(userId);
      if (!walletResult.success) {
        return { success: false, error: walletResult.error };
      }

      // Validate invoice exists and belongs to user
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, user_id: true, is_paid: true, amount: true },
      });

      if (!invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      if (invoice.user_id !== userId) {
        return { success: false, error: 'Unauthorized access to invoice' };
      }

      if (invoice.is_paid) {
        return { success: false, error: 'Invoice is already paid' };
      }

      // Generate merchant transaction ID
      const merchantTransactionId = `IV-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Create a pending transaction
      const transaction = await this.prisma.invoiceTransaction.create({
        data: {
          code: await this.generateTransactionCode('invoice'),
          amount,
          type: TransactionType.DEBIT,
          description: `Payment for invoice`,
          status: TransactionStatus.PENDING,
          merchant_transaction_id: merchantTransactionId,
          currency: 'INR',
          wallet_id: walletResult.walletId!,
          user_id: userId,
          invoice_id: invoiceId,
        },
      });

      // Import PhonePe service dynamically to avoid circular dependencies
      const { PhonePeService } = await import('./phonepe-service');
      const phonePeService = new PhonePeService(this.fastify);

      // Generate payment link using PhonePe
      const redirectUrl = `${origin}/seller/invoice/callback/${invoiceId}`;
      const paymentResult = await phonePeService.generatePaymentLink(amount, merchantTransactionId, userId, redirectUrl);

      if (!paymentResult.success) {
        // If payment link generation fails, mark transaction as failed
        await this.prisma.invoiceTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            description: `Payment for invoice - Failed to generate payment link`,
          },
        });

        return { success: false, error: paymentResult.error || 'Failed to generate payment link' };
      }

      return {
        success: true,
        transaction,
        paymentLink: paymentResult.paymentLink,
        merchantTransactionId,
      };
    } catch (error) {
      this.fastify.log.error(`Error initiating invoice payment: ${error}`);
      return { success: false, error: 'Failed to initiate invoice payment' };
    }
  }

  /**
   * Verify and process an invoice payment
   * @param userId User ID
   * @param merchantTransactionId Merchant transaction ID
   * @param invoiceId Invoice ID
   * @returns Updated invoice details
   */
  async verifyInvoicePayment(userId: string, merchantTransactionId: string, invoiceId: string) {
    try {
      // Find the pending transaction
      const transaction = await this.prisma.invoiceTransaction.findFirst({
        where: {
          merchant_transaction_id: merchantTransactionId,
          invoice_id: invoiceId,
          user_id: userId,
        },
      });

      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      // Validate invoice exists and belongs to user
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, user_id: true, is_paid: true },
      });

      if (!invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      if (invoice.user_id !== userId) {
        return { success: false, error: 'Unauthorized access to invoice' };
      }

      // Import PhonePe service dynamically to avoid circular dependencies
      const { PhonePeService } = await import('./phonepe-service');
      const phonePeService = new PhonePeService(this.fastify);

      // Verify payment status with PhonePe
      const verificationResult = await phonePeService.checkPaymentStatus(merchantTransactionId);

      if (!verificationResult.success) {
        return { success: false, error: 'Failed to verify payment status' };
      }

      // Process the transaction based on payment status
      if (verificationResult.paymentStatus === 'SUCCESS') {
        // Update transaction and invoice status
        const [updatedTransaction, updatedInvoice] = await this.prisma.$transaction([
          // Update transaction status
          this.prisma.invoiceTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.COMPLETED,
            },
          }),

          // Update invoice status
          this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
              is_paid: true,
              updated_at: new Date(),
            },
          }),
        ]);

        return {
          success: true,
          transaction: updatedTransaction,
          invoice: updatedInvoice,
          message: 'Invoice paid successfully',
        };
      } else {
        // Mark transaction as failed
        const updatedTransaction = await this.prisma.invoiceTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
          },
        });

        return {
          success: false,
          transaction: updatedTransaction,
          error: 'Payment failed',
        };
      }
    } catch (error) {
      this.fastify.log.error(`Error verifying invoice payment: ${error}`);
      return { success: false, error: 'Failed to verify invoice payment' };
    }
  }
}
