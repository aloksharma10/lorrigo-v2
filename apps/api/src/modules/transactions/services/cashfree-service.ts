import { FastifyInstance } from 'fastify';
import { Cashfree, CFEnvironment } from 'cashfree-pg';
import { 
  PaymentGatewayInterface, 
  PaymentLinkResponse, 
  PaymentStatusResponse, 
  PaymentCallbackResponse, 
  PaymentSessionResponse,
  PaymentRefundResponse,
} from '../interfaces/payment-gateway.interface';
import { APP_CONFIG } from '@/config/app';

/**
 * Cashfree payment gateway integration service
 * Implements the PaymentGatewayInterface using Cashfree SDK
 */
export class CashfreeService implements PaymentGatewayInterface {
  private fastify: FastifyInstance;
  private cashfree: Cashfree;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    
    // Initialize Cashfree SDK
    const environment = APP_CONFIG.CASHFREE.ENVIRONMENT === 'PRODUCTION' 
      ? CFEnvironment.PRODUCTION 
      : CFEnvironment.SANDBOX;

    this.cashfree = new Cashfree(
      environment,
      APP_CONFIG.CASHFREE.CLIENT_ID,
      APP_CONFIG.CASHFREE.CLIENT_SECRET
    );
  }

  /**
   * Create refund for an order
   */
  async createRefund(params: { orderId: string; refundId: string; amount: number; reason?: string }): Promise<PaymentRefundResponse> {
    try {
      const payload: any = {
        refund_amount: params.amount,
        refund_id: params.refundId,
        refund_note: params.reason || 'Auto refund for wallet credit failure',
      };
      const resp = await (this.cashfree as any).PGOrderCreateRefund(params.orderId, payload);
      const data = resp?.data || {};
      return { success: true, refundId: data.refund_id || params.refundId, status: (data.refund_status || 'PENDING').toUpperCase() };
    } catch (error: any) {
      this.fastify.log.error(`Error creating refund: ${error?.message || error}`);
      return { success: false, error: error?.message || 'Failed to create refund' };
    }
  }

  /**
   * Fetch refund status
   */
  async fetchRefundStatus(orderId: string, refundId: string): Promise<PaymentRefundResponse> {
    try {
      const resp = await (this.cashfree as any).PGOrderFetchRefund(orderId, refundId);
      const data = resp?.data || {};
      return { success: true, refundId: data.refund_id || refundId, status: (data.refund_status || 'PENDING').toUpperCase(), data };
    } catch (error: any) {
      this.fastify.log.error(`Error fetching refund status: ${error?.message || error}`);
      return { success: false, error: error?.message || 'Failed to fetch refund status' };
    }
  }

   /**
   * Generate a payment link for wallet recharge using Cashfree
   * @param amount Amount to recharge (in rupees)
   * @param merchantTransactionId Unique merchant transaction ID
   * @param userId User ID
   * @param redirectUrl URL to redirect after payment
   * @returns Payment link and details
   */
   async generatePaymentSession(
    amount: number,
    merchantTransactionId: string,
    userId: string,
    redirectUrl: string,
    phone: string,
    email: string
  ): Promise<PaymentSessionResponse> {
    try {
      if (amount <= 0) {
        throw new Error("Invalid amount");
      }
  
      const orderRequest = {
        order_id: merchantTransactionId, // Keep your merchant transaction ID
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: userId,
          customer_phone: phone,
          customer_email: email,
        },
        order_meta: {
          return_url: redirectUrl,
          notify_url: `${process.env.BACKEND_URL || 'https://app.lorrigo.com'}/api/v2/transactions/webhook/cashfree`
        },
      };
  
      this.fastify.log.info(`Creating Cashfree order: ${JSON.stringify(orderRequest)}`);
  
      const orderResponse = await this.cashfree.PGCreateOrder(orderRequest);
      const orderData = orderResponse?.data;

    
      if (orderData?.payment_session_id) {
        return {
          success: true,
          paymentSessionId: orderData.payment_session_id,
          merchantTransactionId: merchantTransactionId, // your ID
          orderId: orderData.order_id, // Cashfree's ID
        };
      }
  
      throw new Error("Failed to create payment order");
    } catch (error: any) {
      this.fastify.log.error(`Error generating Cashfree payment link: ${error.message || error}`);
      return {
        success: false,
        error: error.message || 'Failed to generate payment link',
      };
    }
  }

  /**
   * Generate a payment link for wallet recharge using Cashfree
   * @param amount Amount to recharge (in rupees)
   * @param merchantTransactionId Unique merchant transaction ID
   * @param userId User ID
   * @param redirectUrl URL to redirect after payment
   * @returns Payment link and details
   */
  async generatePaymentLink(
    amount: number,
    merchantTransactionId: string,
    userId: string,
    redirectUrl: string,
    phone: string,
    email: string
  ): Promise<PaymentLinkResponse> {
    try {
      if (amount <= 0) {
        throw new Error("Invalid amount");
      }
  
      const paymentLinkRequest = {
        link_id: merchantTransactionId,
        link_amount: amount,
        link_currency: 'INR',
        link_purpose: 'Wallet Topup',
        customer_details: {
          customer_name: userId,
          customer_phone: phone,
          customer_email: email,
        },
        // link_minimum_partial_amount: 20,
        // link_partial_payments: false,
        // link_expiry_time: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        link_notify: {
          send_sms: true,
          send_email: true
        },
        // link_auto_reminders: false,
        // link_notes: {
        //   key_1: 'value_1',
        //   key_2: 'value_2'
        // },
        // link_meta: {
        //   notify_url: `${process.env.BACKEND_URL || 'https://app.lorrigo.com'}/api/v2/transactions/webhook/cashfree`,
        //   upi_intent: 'true',
        //   return_url: redirectUrl
        // }
      }
  
      this.fastify.log.info(`Creating Cashfree order: ${JSON.stringify(paymentLinkRequest)}`);
  
      const response = await this.cashfree.PGCreateLink(paymentLinkRequest);
      const paymentLinkData = response?.data;
  
      if (paymentLinkData?.link_url) {
        return {
          success: true,
          paymentLink: paymentLinkData.link_url,
          merchantTransactionId: merchantTransactionId, // your ID
          orderId: paymentLinkData.link_id, // Cashfree's ID
        };
      }
  
      throw new Error("Failed to create payment order");
    } catch (error: any) {
      this.fastify.log.error(`Error generating Cashfree payment link: ${error.message || error}`);
      return {
        success: false,
        error: error.message || 'Failed to generate payment link',
      };
    }
  }
  
  // Removed incorrect session status method

  /**
   * Check payment status using Cashfree
   * @param merchantTransactionId Merchant transaction ID (order_id)
   * @returns Payment status details
   */
  async checkPaymentStatus(merchantTransactionId: string): Promise<PaymentStatusResponse> {
    try {
      this.fastify.log.info(`Checking Cashfree payment status for id: ${merchantTransactionId}`);

      // First try order (SDK flow)
      try {
        const orderResp = await this.cashfree.PGFetchOrder(merchantTransactionId);
        if (orderResp && orderResp.data) {
          const orderData = orderResp.data as any;
          const paymentStatus = this.mapCashfreeStatus(orderData.order_status || 'UNKNOWN');
          return {
            success: true,
            paymentStatus,
            gatewayReference: orderData.cf_order_id || orderData.order_id,
            data: orderData,
          };
        }
      } catch (e) {
        // ignore and try link
      }

      // Then try link (payment link flow)
      const response = await this.cashfree.PGFetchLink(merchantTransactionId);

      if (response && response.data) {
        const orderData = response.data as any;
        const paymentStatus = this.mapCashfreeStatus(orderData.link_status || 'UNKNOWN');
        
        return {
          success: true,
          paymentStatus,
          gatewayReference: orderData.link_id,
          data: orderData,
        };
      } else {
        this.fastify.log.error(`Cashfree payment status check failed: ${JSON.stringify(response)}`);
        return {
          success: false,
          paymentStatus: 'FAILURE',
          error: 'Failed to check payment status',
        };
      }
    } catch (error: any) {
      this.fastify.log.error(`Error checking Cashfree payment status: ${error.message || error}`);
      return {
        success: false,
        paymentStatus: 'FAILURE',
        error: error.message || 'Failed to check payment status',
      };
    }
  }

  /**
   * Process payment callback from Cashfree webhook
   * @param callbackData Callback data from Cashfree
   * @returns Processed payment details
   */
  async processPaymentCallback(callbackData: any): Promise<PaymentCallbackResponse> {
    try {
      this.fastify.log.info(`Processing Cashfree callback: ${JSON.stringify(callbackData)}`);

      const { orderId, txStatus, referenceId } = callbackData.data || callbackData;

      if (!orderId || !txStatus) {
        return {
          success: false,
          paymentStatus: 'FAILURE',
          error: 'Invalid callback data - missing required fields',
        };
      }

      const paymentStatus = this.mapCashfreeStatus(txStatus);

      return {
        success: true,
        merchantTransactionId: orderId,
        gatewayReference: referenceId || orderId,
        paymentStatus,
        data: callbackData,
      };
    } catch (error: any) {
      this.fastify.log.error(`Error processing Cashfree callback: ${error.message || error}`);
      return {
        success: false,
        paymentStatus: 'FAILURE',
        error: error.message || 'Failed to process payment callback',
      };
    }
  }

  /**
   * Verify Cashfree webhook signature
   * @param signature Webhook signature from headers
   * @param payload Raw webhook payload
   * @param timestamp Webhook timestamp
   * @returns Boolean indicating if signature is valid
   */
  verifyWebhookSignature(signature: string, payload: string, timestamp?: string): boolean {
    try {
      // Cashfree webhook signature verification
      // The PGVerifyWebhookSignature method returns a PGWebhookEvent object or throws an error
      const result = this.cashfree.PGVerifyWebhookSignature(signature, payload, timestamp || '');
      return !!result; // Convert to boolean - if we get a result without error, it's valid
    } catch (error: any) {
      this.fastify.log.error(`Error verifying Cashfree webhook signature: ${error.message || error}`);
      return false;
    }
  }

  /**
   * Map Cashfree order status to our internal status
   * @param cashfreeStatus Cashfree order status
   * @returns Mapped payment status
   */
  private mapCashfreeStatus(cashfreeStatus: string): 'SUCCESS' | 'FAILURE' | 'PENDING' {
    switch (cashfreeStatus?.toUpperCase()) {
      case 'PAID':
      case 'SUCCESS':
        return 'SUCCESS';
      case 'FAILED':
      case 'CANCELLED':
      case 'EXPIRED':
        return 'FAILURE';
      case 'ACTIVE':
      case 'PENDING':
      default:
        return 'PENDING';
    }
  }

  /**
   * Create payment link for invoice payment
   * @param amount Amount to pay
   * @param merchantTransactionId Unique transaction ID
   * @param userId User ID
   * @param invoiceId Invoice ID
   * @param redirectUrl Redirect URL after payment
   * @returns Payment link response
   */
  async generateInvoicePaymentLink(
    amount: number,
    merchantTransactionId: string,
    userId: string,
    invoiceId: string,
    redirectUrl: string,
    phone: string,
    email: string
  ): Promise<PaymentLinkResponse> {
    try {
      const orderRequest = {
        order_id: merchantTransactionId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: userId,
          customer_phone: phone,
          customer_email: email,
        },
        order_meta: {
          return_url: redirectUrl,
          notify_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/v2/transactions/webhook/cashfree`,
          invoice_id: invoiceId,
        },
      };

      this.fastify.log.info(`Creating Cashfree invoice payment order: ${JSON.stringify(orderRequest)}`);

      const response = await this.cashfree.PGCreateOrder(orderRequest);

      if (response && response.data) {
        const { order_id, payment_session_id } = response.data;
        
        const paymentLink = `https://payments${APP_CONFIG.CASHFREE.ENVIRONMENT === 'SANDBOX' ? '-test' : ''}.cashfree.com/pay/${payment_session_id}`;
        
        return {
          success: true,
          paymentLink,
          merchantTransactionId: order_id,
          orderId: order_id,
        };
      } else {
        this.fastify.log.error(`Cashfree invoice payment order creation failed: ${JSON.stringify(response)}`);
        return {
          success: false,
          error: 'Failed to create invoice payment order',
        };
      }
    } catch (error: any) {
      this.fastify.log.error(`Error generating Cashfree invoice payment link: ${error.message || error}`);
      return {
        success: false,
        error: error.message || 'Failed to generate invoice payment link',
      };
    }
  }
}