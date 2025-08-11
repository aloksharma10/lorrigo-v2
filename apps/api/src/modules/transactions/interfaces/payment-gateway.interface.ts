/**
 * Payment Gateway Interface
 * Defines the contract that all payment gateway services must implement
 */
export interface PaymentGatewayInterface {

  /**
   * Generate a payment session for wallet recharge
   * @param amount Amount to recharge
   * @param merchantTransactionId Unique merchant transaction ID
   * @param userId User ID
   * @param redirectUrl URL to redirect after payment
   * @returns Payment session id
   */
  generatePaymentSession(
    amount: number,
    merchantTransactionId: string,
    userId: string,
    redirectUrl: string,
    phone: string,
    email: string
  ): Promise<PaymentSessionResponse>;

  /**
   * Generate a payment link for wallet recharge
   * @param amount Amount to recharge
   * @param merchantTransactionId Unique merchant transaction ID
   * @param userId User ID
   * @param redirectUrl URL to redirect after payment
   * @returns Payment link and transaction details
   */
  generatePaymentLink(
    amount: number,
    merchantTransactionId: string,
    userId: string,
    redirectUrl: string,
    phone: string,
    email: string
  ): Promise<PaymentLinkResponse>;

  /**
   * Check payment status
   * @param merchantTransactionId Merchant transaction ID
   * @returns Payment status details
   */
  checkPaymentStatus(merchantTransactionId: string): Promise<PaymentStatusResponse>;

  /**
   * Process payment callback/webhook
   * @param callbackData Callback data from payment gateway
   * @returns Processed payment details
   */
  processPaymentCallback(callbackData: any): Promise<PaymentCallbackResponse>;

  /**
   * Verify webhook signature (if supported)
   * @param signature Webhook signature
   * @param payload Webhook payload
   * @param timestamp Webhook timestamp
   * @returns Boolean indicating if signature is valid
   */
  verifyWebhookSignature?(signature: string, payload: string, timestamp?: string): boolean;

  /**
   * Create a refund on the gateway for a successful order
   */
  createRefund?(params: {
    orderId: string; // merchantTransactionId we used as order_id
    refundId: string; // unique id we generate
    amount: number; // refund amount
    reason?: string;
  }): Promise<PaymentRefundResponse>;

  /**
   * Fetch refund status
   */
  fetchRefundStatus?(orderId: string, refundId: string): Promise<PaymentRefundResponse>;
}

/**
 * Response interface for payment link generation
 */
export interface PaymentLinkResponse {
  success: boolean;
  paymentLink?: string;
  merchantTransactionId?: string;
  orderId?: string; // Cashfree uses orderId
  error?: string;
}

/**
 * Response interface for payment link generation
 */
export interface PaymentSessionResponse {
  success: boolean;
  paymentSessionId?: string;
  merchantTransactionId?: string;
  orderId?: string; // Cashfree uses orderId
  error?: string;
}

/**
 * Response interface for payment status check
 */
export interface PaymentStatusResponse {
  success: boolean;
  paymentStatus: 'SUCCESS' | 'FAILURE' | 'PENDING';
  gatewayReference?: string;
  data?: any;
  error?: string;
}

/**
 * Response interface for payment callback processing
 */
export interface PaymentCallbackResponse {
  success: boolean;
  merchantTransactionId?: string;
  gatewayReference?: string;
  paymentStatus: 'SUCCESS' | 'FAILURE' | 'PENDING';
  data?: any;
  error?: string;
}

/**
 * Refund response
 */
export interface PaymentRefundResponse {
  success: boolean;
  refundId?: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILURE';
  data?: any;
  error?: string;
}

/**
 * Payment gateway types
 */
export enum PaymentGatewayType {
  CASHFREE = 'CASHFREE',
  PHONEPE = 'PHONEPE',
}