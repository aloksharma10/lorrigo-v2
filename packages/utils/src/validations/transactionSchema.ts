import { z } from 'zod';
import { TransactionType } from '../types/transaction';
import { TransactionStatus } from '@lorrigo/db';

/**
 * Validation schema for creating a shipment transaction
 */
export const CreateShipmentTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum([TransactionType.CREDIT, TransactionType.DEBIT], {
    errorMap: () => ({ message: 'Type must be either CREDIT or DEBIT' }),
  }),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  shipmentId: z.string().uuid('Invalid shipment ID'),
  awb: z.string().optional(),
  srShipmentId: z.string().optional(),
  paymentId: z.string().uuid('Invalid payment ID').optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter code').optional().default('INR'),
  status: z
    .enum([
      TransactionStatus.PENDING,
      TransactionStatus.COMPLETED,
      TransactionStatus.FAILED,
      TransactionStatus.REFUNDED,
    ])
    .optional()
    .default(TransactionStatus.COMPLETED),
  merchantTransactionId: z.string().optional(),
});

/**
 * Validation schema for creating an invoice transaction
 */
export const CreateInvoiceTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum([TransactionType.CREDIT, TransactionType.DEBIT], {
    errorMap: () => ({ message: 'Type must be either CREDIT or DEBIT' }),
  }),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  invoiceId: z.string().uuid('Invalid invoice ID'),
  invoiceNumber: z.string().optional(),
  paymentId: z.string().uuid('Invalid payment ID').optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter code').optional().default('INR'),
  status: z
    .enum([
      TransactionStatus.PENDING,
      TransactionStatus.COMPLETED,
      TransactionStatus.FAILED,
      TransactionStatus.REFUNDED,
    ])
    .optional()
    .default(TransactionStatus.COMPLETED),
  merchantTransactionId: z.string().optional(),
});

/**
 * Validation schema for creating a wallet recharge transaction
 */
export const CreateWalletRechargeTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum([TransactionType.CREDIT, TransactionType.DEBIT], {
    errorMap: () => ({ message: 'Type must be either CREDIT or DEBIT' }),
  }),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  paymentId: z.string().uuid('Invalid payment ID').optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter code').optional().default('INR'),
  status: z
    .enum([
      TransactionStatus.PENDING,
      TransactionStatus.COMPLETED,
      TransactionStatus.FAILED,
      TransactionStatus.REFUNDED,
    ])
    .optional()
    .default(TransactionStatus.COMPLETED),
  merchantTransactionId: z.string().optional(),
});

/**
 * Validation schema for recharging a wallet
 */
export const RechargeWalletSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(1, 'Minimum recharge amount is 1')
    .max(100000, 'Maximum recharge amount is 100,000'),
  redirectUrl: z.string().url('Invalid redirect URL'),
});

/**
 * Validation schema for verifying a wallet recharge
 */
export const VerifyWalletRechargeSchema = z.object({
  merchantTransactionId: z.string().min(1, 'Merchant transaction ID is required'),
  paymentStatus: z.enum(['SUCCESS', 'FAILURE'], {
    errorMap: () => ({ message: 'Payment status must be either SUCCESS or FAILURE' }),
  }),
  gatewayReference: z.string().min(1, 'Gateway reference is required'),
});

/**
 * Validation schema for getting transaction history
 */
export const GetTransactionHistorySchema = z.object({
  type: z
    .enum(['SHIPMENT', 'INVOICE', 'WALLET'], {
      errorMap: () => ({ message: 'Type must be either SHIPMENT, INVOICE, or WALLET' }),
    })
    .optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
});

/**
 * Export all transaction schemas
 */
export const TransactionSchemas = {
  CreateShipmentTransactionSchema,
  CreateInvoiceTransactionSchema,
  CreateWalletRechargeTransactionSchema,
  RechargeWalletSchema,
  VerifyWalletRechargeSchema,
  GetTransactionHistorySchema,
}; 