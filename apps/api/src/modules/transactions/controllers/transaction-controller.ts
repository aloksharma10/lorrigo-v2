import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TransactionService, TransactionType, TransactionEntityType } from '../services/transaction-service';
import { z } from 'zod';
import { Role, TransactionStatus } from '@lorrigo/db';

// Validation schemas
export const CreateShipmentTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum([TransactionType.CREDIT, TransactionType.DEBIT]),
  description: z.string(),
  shipmentId: z.string(),
  awb: z.string().optional(),
  srShipmentId: z.string().optional(),
  paymentId: z.string().optional(),
  currency: z.string().optional(),
  status: z.enum([TransactionStatus.PENDING, TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.REFUNDED]).optional(),
  merchantTransactionId: z.string().optional(),
});

export const CreateInvoiceTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum([TransactionType.CREDIT, TransactionType.DEBIT]),
  description: z.string(),
  invoiceId: z.string(),
  invoiceNumber: z.string().optional(),
  paymentId: z.string().optional(),
  currency: z.string().optional(),
  status: z.enum([TransactionStatus.PENDING, TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.REFUNDED]).optional(),
  merchantTransactionId: z.string().optional(),
});

export const CreateWalletRechargeTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum([TransactionType.CREDIT, TransactionType.DEBIT]),
  description: z.string(),
  paymentId: z.string().optional(),
  currency: z.string().optional(),
  status: z.enum([TransactionStatus.PENDING, TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.REFUNDED]).optional(),
  merchantTransactionId: z.string().optional(),
});

export const RechargeWalletSchema = z.object({
  amount: z.number().positive(),
  redirectUrl: z.string().url().optional(),
  origin: z.string().url(),
});

export const VerifyWalletRechargeSchema = z.object({
  merchantTransactionId: z.string(),
  paymentStatus: z.enum(['SUCCESS', 'FAILURE']).optional(),
  gatewayReference: z.string().optional(),
});

export const GetTransactionHistorySchema = z.object({
  type: z.string().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  transactionType: z.string().optional(),
  status: z.string().optional(),
});

export const PayInvoiceSchema = z.object({
  amount: z.number().positive(),
  invoiceId: z.string(),
  origin: z.string().url(),
});

export const VerifyInvoicePaymentSchema = z.object({
  merchantTransactionId: z.string(),
  invoiceId: z.string(),
});

/**
 * Controller for handling transaction-related routes
 */
export class TransactionController {
  private transactionService: TransactionService;

  constructor(fastify: FastifyInstance) {
    this.transactionService = new TransactionService(fastify);
  }

  /**
   * Create a shipment transaction
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async createShipmentTransaction(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const data = request.body as z.infer<typeof CreateShipmentTransactionSchema>;

      const result = await this.transactionService.createShipmentTransaction({
        ...data,
        userId,
      });

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(`Error creating shipment transaction: ${error}`);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create shipment transaction',
      });
    }
  }

  /**
   * Create an invoice transaction
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async createInvoiceTransaction(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const data = request.body as z.infer<typeof CreateInvoiceTransactionSchema>;

      const result = await this.transactionService.createInvoiceTransaction({
        ...data,
        userId,
      });

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(`Error creating invoice transaction: ${error}`);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create invoice transaction',
      });
    }
  }

  /**
   * Create a wallet recharge transaction
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async createWalletRechargeTransaction(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const data = request.body as z.infer<typeof CreateWalletRechargeTransactionSchema>;

      const result = await this.transactionService.createWalletRechargeTransaction({
        ...data,
        userId,
      });

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(`Error creating wallet recharge transaction: ${error}`);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create wallet recharge transaction',
      });
    }
  }

  /**
   * Recharge wallet using payment gateway
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async rechargeWallet(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const { amount, origin, redirectUrl } = request.body as z.infer<typeof RechargeWalletSchema>;

      // Use origin from request body if provided, otherwise use redirectUrl
      const finalRedirectUrl = `${origin}/seller/wallet/callback`;

      const result = await this.transactionService.rechargeWallet(userId, amount, finalRedirectUrl);

      if (!result.success) {
        return reply.code(400).send(result);
      }

      // Format response to match old application
      return reply.code(200).send({
        valid: true,
        message: 'Wallet recharge initiated successfully',
        url: result.paymentLink,
        merchantTransactionId: result.merchantTransactionId,
        transaction: result.transaction,
      });
    } catch (error) {
      request.log.error(`Error recharging wallet: ${error}`);
      return reply.code(500).send({
        valid: false,
        message: 'Failed to recharge wallet',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify wallet recharge from payment gateway callback
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async verifyWalletRecharge(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { merchantTransactionId } = request.query as z.infer<typeof VerifyWalletRechargeSchema>;

      // In the old application, we only needed merchantTransactionId
      // The service will handle checking the payment status with PhonePe
      const result = await this.transactionService.verifyWalletRecharge(
        merchantTransactionId,
        undefined as any, // Let the service determine the payment status
        undefined as any // Let the service determine the gateway reference
      );

      if (!result.success) {
        return reply.code(400).send({
          valid: false,
          message: result.error,
        });
      }

      return reply.code(200).send({
        valid: true,
        message: 'Wallet recharged successfully',
        transaction: result.transaction,
      });
    } catch (error) {
      request.log.error(`Error verifying wallet recharge: ${error}`);
      return reply.code(500).send({
        valid: false,
        message: 'Failed to verify wallet recharge',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get wallet balance
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async getWalletBalance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const result = await this.transactionService.getWalletBalance(userId);

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(`Error getting wallet balance: ${error}`);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get wallet balance',
      });
    }
  }

  /**
   * Get transaction history
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async getTransactionHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      let userId = (request.query as any).userId || request.userPayload!.id;
      const isAdmin = request.userPayload!.role === Role.ADMIN;
      const query = request.query as z.infer<typeof GetTransactionHistorySchema>;

      // if (isAdmin) {
      //   userId = undefined as any;
      // }

      // Parse comma-separated values and cast to proper types
      const entityType = query.type ? (query.type.split(',') as TransactionEntityType[]) : undefined;
      const transactionType = query.transactionType ? (query.transactionType.split(',') as TransactionType[]) : undefined;
      const status = query.status ? (query.status.split(',') as TransactionStatus[]) : undefined;

      // Create dateRange object from separate parameters
      const dateRange =
        query.startDate && query.endDate
          ? {
              startDate: query.startDate,
              endDate: query.endDate,
            }
          : undefined;

      const result = await this.transactionService.getTransactionHistory(
        userId,
        entityType,
        query.page,
        query.limit,
        query.search,
        dateRange,
        transactionType,
        status
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(`Error getting transaction history: ${error}`);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get transaction history',
      });
    }
  }

  /**
   * Refetch failed transactions
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async refetchFailedTransactions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const result = await this.transactionService.refetchFailedTransactions(userId);

      if (!result.success) {
        return reply.code(400).send({
          valid: false,
          message: result.error,
        });
      }

      return reply.code(200).send({
        valid: true,
        message: 'Failed transactions refetched successfully',
        transactions: result.transactions,
      });
    } catch (error) {
      request.log.error(`Error refetching failed transactions: ${error}`);
      return reply.code(500).send({
        valid: false,
        message: 'Failed to refetch transactions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Pay invoice using payment gateway
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async payInvoice(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const { amount, invoiceId, origin } = request.body as z.infer<typeof PayInvoiceSchema>;

      const result = await this.transactionService.payInvoice(userId, amount, invoiceId, origin);

      if (!result.success) {
        return reply.code(400).send({
          valid: false,
          message: result.error,
        });
      }

      return reply.code(200).send({
        valid: true,
        message: 'Invoice payment initiated',
        url: result.paymentLink,
        merchantTransactionId: result.merchantTransactionId,
      });
    } catch (error) {
      request.log.error(`Error initiating invoice payment: ${error}`);
      return reply.code(500).send({
        valid: false,
        message: 'Failed to initiate invoice payment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify invoice payment
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async verifyInvoicePayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const { merchantTransactionId, invoiceId } = request.query as z.infer<typeof VerifyInvoicePaymentSchema>;

      const result = await this.transactionService.verifyInvoicePayment(userId, merchantTransactionId, invoiceId);

      if (!result.success) {
        return reply.code(400).send({
          valid: false,
          message: result.error,
        });
      }

      return reply.code(200).send({
        valid: true,
        message: 'Invoice paid successfully',
        updateInvoice: result.invoice,
      });
    } catch (error) {
      request.log.error(`Error verifying invoice payment: ${error}`);
      return reply.code(500).send({
        valid: false,
        message: 'Failed to verify invoice payment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
