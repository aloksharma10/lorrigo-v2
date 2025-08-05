import { TransactionStatus } from '@lorrigo/db';

/**
 * Formats a transaction amount for display
 * @param amount Transaction amount
 * @param currency Currency code (default: INR)
 * @returns Formatted amount string
 */
export function formatTransactionAmount(amount: number, currency: string = 'INR'): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });

  return formatter.format(amount);
}

/**
 * Generates a human-readable transaction status
 * @param status Transaction status
 * @returns Human-readable status
 */
export function getTransactionStatusText(status: TransactionStatus): string {
  switch (status) {
    case TransactionStatus.PENDING:
      return 'Pending';
    case TransactionStatus.COMPLETED:
      return 'Completed';
    case TransactionStatus.FAILED:
      return 'Failed';
    case TransactionStatus.REFUNDED:
      return 'Refunded';
    default:
      return 'Unknown';
  }
}

/**
 * Validates a merchant transaction ID format
 * @param merchantTransactionId Merchant transaction ID to validate
 * @returns Boolean indicating if the format is valid
 */
export function isValidMerchantTransactionId(merchantTransactionId: string): boolean {
  // Check if it matches the format: XX-timestamp-randomString
  const regex = /^[A-Z]{2}-\d+-[a-z0-9]+$/;
  return regex.test(merchantTransactionId);
}

/**
 * Calculates the GST components for a transaction amount
 * @param amount Total amount including GST
 * @param gstPercentage GST percentage (default: 18)
 * @returns Object with base amount, CGST, SGST, and IGST
 */
export function calculateGstComponents(amount: number, gstPercentage: number = 18) {
  const gstFactor = gstPercentage / 100;
  const baseAmount = amount / (1 + gstFactor);
  const totalGst = amount - baseAmount;

  return {
    baseAmount: parseFloat(baseAmount.toFixed(2)),
    cgst: parseFloat((totalGst / 2).toFixed(2)),
    sgst: parseFloat((totalGst / 2).toFixed(2)),
    igst: parseFloat(totalGst.toFixed(2)),
    totalAmount: amount,
  };
}

/**
 * Determines if a transaction can be refunded based on its status and age
 * @param status Transaction status
 * @param transactionDate Transaction date
 * @param maxRefundDays Maximum days allowed for refund (default: 30)
 * @returns Boolean indicating if the transaction can be refunded
 */
export function canRefundTransaction(status: TransactionStatus, transactionDate: Date, maxRefundDays: number = 30): boolean {
  if (status !== TransactionStatus.COMPLETED) {
    return false;
  }

  const daysSinceTransaction = Math.floor((Date.now() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));

  return daysSinceTransaction <= maxRefundDays;
}
