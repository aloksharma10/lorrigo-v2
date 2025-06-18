import { FastifyInstance } from 'fastify';
import axios from 'axios';
import crypto from 'crypto';
import { APP_CONFIG } from '@/config/app';

/**
 * PhonePe payment gateway integration service
 */
export class PhonePeService {
  private fastify: FastifyInstance;
  private apiBaseUrl: string;
  private merchantId: string;
  private saltKey: string;
  private saltIndex: string;
  // private isProduction: boolean;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    
    // Get PhonePe configuration from environment
    // this.isProduction = process.env.NODE_ENV === 'production';

    this.apiBaseUrl = APP_CONFIG.PHONEPE.API_BASEURL;
    this.merchantId = APP_CONFIG.PHONEPE.MERCHANT_ID;
    this.saltKey = APP_CONFIG.PHONEPE.SALT_KEY;
    this.saltIndex = APP_CONFIG.PHONEPE.SALT_INDEX;

  }

  /**
   * Generate a payment link for wallet recharge
   * @param amount Amount to recharge
   * @param merchantTransactionId Merchant transaction ID
   * @param userId User ID
   * @param redirectUrl URL to redirect after payment
   * @returns Payment link and details
   */
  async generatePaymentLink(
    amount: number,
    merchantTransactionId: string,
    userId: string,
    redirectUrl: string
  ) {
    try {
      // Prepare payload
      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId,
        merchantUserId: userId,
        amount: amount * 100, // PhonePe expects amount in paise
        redirectUrl,
        callbackUrl: redirectUrl,
        redirectMode: 'REDIRECT',
        paymentInstrument: {
          type: 'PAY_PAGE',
        },
      };

      // Convert payload to base64
      const payloadString = JSON.stringify(payload);
      const payloadBase64 = Buffer.from(payloadString).toString('base64');

      // Generate checksum (SHA256 hash of base64 payload + '/pg/v1/pay' + salt key)
      const checksum = this.generateChecksum(payloadBase64, '/pg/v1/pay');

      // Prepare request headers and body
      const headers = {
        'Content-Type': 'application/json',
        'X-VERIFY': `${checksum}###${this.saltIndex}`,
      };

      const requestBody = {
        request: payloadBase64,
      };

      // Make API call to PhonePe
      const response = await axios.post(
        `${this.apiBaseUrl}/pg/v1/pay`,
        requestBody,
        { headers }
      );

      // Check response
      if (response.data.success) {
        return {
          success: true,
          paymentLink: response.data.data.instrumentResponse.redirectInfo.url,
          merchantTransactionId,
        };
      } else {
        this.fastify.log.error(`PhonePe payment link generation failed: ${JSON.stringify(response.data)}`);
        return {
          success: false,
          error: response.data.message || 'Failed to generate payment link',
        };
      }
    } catch (error) {
      this.fastify.log.error(`Error generating PhonePe payment link: ${error}`);
      return {
        success: false,
        error: 'Failed to generate payment link',
      };
    }
  }

  /**
   * Check payment status
   * @param merchantTransactionId Merchant transaction ID
   * @returns Payment status details
   */
  async checkPaymentStatus(merchantTransactionId: string) {
    try {
      // Generate checksum for status check
      const checksum = this.generateChecksum('', `/pg/v1/status/${this.merchantId}/${merchantTransactionId}`);

      // Prepare request headers
      const headers = {
        'Content-Type': 'application/json',
        'X-VERIFY': `${checksum}###${this.saltIndex}`,
        'X-MERCHANT-ID': this.merchantId,
      };

      // Make API call to PhonePe
      const response = await axios.get(
        `${this.apiBaseUrl}/pg/v1/status/${this.merchantId}/${merchantTransactionId}`,
        { headers }
      );

      // Check response
      if (response.data.success) {
        const paymentStatus = response.data.data.responseCode;
        const gatewayReference = response.data.data.transactionId;
        
        return {
          success: true,
          paymentStatus: paymentStatus === 'SUCCESS' ? 'SUCCESS' : 'FAILURE',
          gatewayReference,
          data: response.data.data,
        };
      } else {
        this.fastify.log.error(`PhonePe payment status check failed: ${JSON.stringify(response.data)}`);
        return {
          success: false,
          error: response.data.message || 'Failed to check payment status',
        };
      }
    } catch (error) {
      this.fastify.log.error(`Error checking PhonePe payment status: ${error}`);
      return {
        success: false,
        error: 'Failed to check payment status',
      };
    }
  }

  /**
   * Process payment callback from PhonePe
   * @param callbackData Callback data from PhonePe
   * @returns Processed payment details
   */
  async processPaymentCallback(callbackData: any) {
    try {
      // Verify callback data
      const { merchantTransactionId, transactionId, status } = callbackData;
      
      if (!merchantTransactionId || !transactionId || !status) {
        return {
          success: false,
          error: 'Invalid callback data',
        };
      }

      // Verify callback signature if provided
      if (callbackData.signature) {
        const isValid = this.verifyCallbackSignature(callbackData);
        if (!isValid) {
          return {
            success: false,
            error: 'Invalid callback signature',
          };
        }
      }

      // Return processed payment details
      return {
        success: true,
        merchantTransactionId,
        gatewayReference: transactionId,
        paymentStatus: status === 'SUCCESS' ? 'SUCCESS' : 'FAILURE',
        data: callbackData,
      };
    } catch (error) {
      this.fastify.log.error(`Error processing PhonePe callback: ${error}`);
      return {
        success: false,
        error: 'Failed to process payment callback',
      };
    }
  }

  /**
   * Generate a checksum for PhonePe API calls
   * @param payload Payload in base64 format
   * @param apiEndpoint API endpoint
   * @returns Checksum string
   */
  private generateChecksum(payload: string, apiEndpoint: string): string {
    const data = payload + apiEndpoint + this.saltKey;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify callback signature from PhonePe
   * @param callbackData Callback data from PhonePe
   * @returns Boolean indicating if signature is valid
   */
  private verifyCallbackSignature(callbackData: any): boolean {
    try {
      const { signature, ...dataWithoutSignature } = callbackData;
      const dataString = JSON.stringify(dataWithoutSignature);
      const expectedSignature = crypto
        .createHash('sha256')
        .update(dataString + this.saltKey)
        .digest('hex');
      
      return signature === expectedSignature;
    } catch (error) {
      this.fastify.log.error(`Error verifying callback signature: ${error}`);
      return false;
    }
  }
} 