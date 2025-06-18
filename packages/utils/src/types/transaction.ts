import { TransactionStatus } from '@lorrigo/db';

/**
 * Shared types for transaction operations across frontend and backend
 */

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum TransactionEntityType {
  SHIPMENT = 'SHIPMENT',
  INVOICE = 'INVOICE',
  WALLET = 'WALLET',
}

export interface BaseTransaction {
  id: string;
  code: string;
  amount: number;
  type: string;
  description: string;
  status: TransactionStatus;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface ShipmentTransaction extends BaseTransaction {
  wallet_id: string;
  user_id: string;
  shipment_id: string;
  awb?: string;
  sr_shipment_id?: string;
  payment_id?: string;
  merchant_transaction_id?: string;
}

export interface InvoiceTransaction extends BaseTransaction {
  wallet_id: string;
  user_id: string;
  invoice_id: string;
  invoice_number?: string;
  payment_id?: string;
  merchant_transaction_id?: string;
}

export interface WalletRechargeTransaction extends BaseTransaction {
  wallet_id: string;
  user_id: string;
  payment_id?: string;
  merchant_transaction_id?: string;
}

export interface CreateShipmentTransactionRequest {
  amount: number;
  type: TransactionType;
  description: string;
  shipmentId: string;
  awb?: string;
  srShipmentId?: string;
  paymentId?: string;
  currency?: string;
  status?: TransactionStatus;
  merchantTransactionId?: string;
}

export interface CreateInvoiceTransactionRequest {
  amount: number;
  type: TransactionType;
  description: string;
  invoiceId: string;
  invoiceNumber?: string;
  paymentId?: string;
  currency?: string;
  status?: TransactionStatus;
  merchantTransactionId?: string;
}

export interface CreateWalletRechargeTransactionRequest {
  amount: number;
  type: TransactionType;
  description: string;
  paymentId?: string;
  currency?: string;
  status?: TransactionStatus;
  merchantTransactionId?: string;
}

export interface RechargeWalletRequest {
  amount: number;
  redirectUrl: string;
}

export interface TransactionResponse {
  success: boolean;
  transaction?: BaseTransaction;
  walletBalance?: number;
  error?: string;
}

export interface WalletBalanceResponse {
  success: boolean;
  balance?: number;
  walletId?: string;
  walletCode?: string;
  error?: string;
}

export interface TransactionHistoryResponse {
  success: boolean;
  transactions?: BaseTransaction[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface WalletRechargeResponse {
  success: boolean;
  transaction?: WalletRechargeTransaction;
  paymentLink?: string;
  merchantTransactionId?: string;
  error?: string;
}

export interface VerifyWalletRechargeRequest {
  merchantTransactionId: string;
  paymentStatus: 'SUCCESS' | 'FAILURE';
  gatewayReference: string;
} 