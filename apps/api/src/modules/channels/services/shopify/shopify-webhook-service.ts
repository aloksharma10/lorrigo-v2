import crypto from 'crypto';
import { APP_CONFIG } from '@/config/app';

export interface ShopifyCustomerDataRequestPayload {
  shop_id: number;
  shop_domain: string;
  orders_requested: number[];
  customer: {
    id: number;
    email: string;
    phone: string;
  };
  data_request: {
    id: number;
  };
}

export interface ShopifyCustomerRedactPayload {
  shop_id: number;
  shop_domain: string;
  customer: {
    id: number;
    email: string;
    phone: string;
  };
  orders_to_redact: number[];
}

export interface ShopifyShopRedactPayload {
  shop_id: number;
  shop_domain: string;
}

export class ShopifyWebhookService {
  private apiSecret: string;

  constructor() {
    this.apiSecret = APP_CONFIG.VENDOR.SHOPIFY.API_SECRET;
  }

  /**
   * Verify webhook authenticity using HMAC
   * @param body Raw request body
   * @param hmac HMAC header from Shopify
   * @returns boolean indicating if webhook is authentic
   */
  public verifyWebhookHmac(body: string, hmac: string): boolean {
    try {
      const calculatedHmac = crypto.createHmac('sha256', this.apiSecret).update(body, 'utf8').digest('base64');

      return crypto.timingSafeEqual(Buffer.from(calculatedHmac), Buffer.from(hmac));
    } catch (error) {
      console.error('Error verifying webhook HMAC:', error);
      return false;
    }
  }

  /**
   * Parse customer data request webhook payload
   * @param body Raw request body
   * @returns Parsed webhook payload
   */
  public parseCustomerDataRequestPayload(body: string): ShopifyCustomerDataRequestPayload {
    try {
      return JSON.parse(body);
    } catch (error) {
      console.error('Error parsing customer data request payload:', error);
      throw new Error('Invalid customer data request payload');
    }
  }

  /**
   * Parse customer redact webhook payload
   * @param body Raw request body
   * @returns Parsed webhook payload
   */
  public parseCustomerRedactPayload(body: string): ShopifyCustomerRedactPayload {
    try {
      return JSON.parse(body);
    } catch (error) {
      console.error('Error parsing customer redact payload:', error);
      throw new Error('Invalid customer redact payload');
    }
  }

  /**
   * Parse shop redact webhook payload
   * @param body Raw request body
   * @returns Parsed webhook payload
   */
  public parseShopRedactPayload(body: string): ShopifyShopRedactPayload {
    try {
      return JSON.parse(body);
    } catch (error) {
      console.error('Error parsing shop redact payload:', error);
      throw new Error('Invalid shop redact payload');
    }
  }

  /**
   * Generate customer data export for GDPR compliance
   * @param payload Customer data request payload
   * @returns Formatted customer data for export
   */
  public generateCustomerDataExport(payload: ShopifyCustomerDataRequestPayload): any {
    return {
      // Customer information
      customer: {
        id: payload.customer.id,
        email: payload.customer.email,
        phone: payload.customer.phone,
        shop_id: payload.shop_id,
        shop_domain: payload.shop_domain,
      },
      // Orders requested by the customer
      orders_requested: payload.orders_requested,
      // Data request information
      data_request: {
        id: payload.data_request.id,
        requested_at: new Date().toISOString(),
      },
      // App-specific data that you store about this customer
      app_data: {
        // Add any additional data your app stores about this customer
        // Example: analytics, preferences, settings, etc.
        // analytics: await this.getCustomerAnalytics(payload.customer.id),
        // preferences: await this.getCustomerPreferences(payload.customer.id),
        // settings: await this.getCustomerSettings(payload.customer.id),
      },
    };
  }

  /**
   * Log webhook event for audit purposes
   * @param type Webhook type
   * @param shopDomain Shop domain
   * @param payload Webhook payload
   * @param status Processing status
   */
  public async logWebhookEvent(
    type: 'customers/data_request' | 'customers/redact' | 'shop/redact',
    shopDomain: string,
    payload: any,
    status: 'pending' | 'completed' | 'failed' = 'completed'
  ): Promise<void> {
    try {
      // This would typically go to your database
      // For now, we'll just log it
      console.log('Shopify webhook event logged:', {
        type,
        shop_domain: shopDomain,
        status,
        timestamp: new Date().toISOString(),
        payload: JSON.stringify(payload).substring(0, 500) + '...', // Truncate for logging
      });
    } catch (error) {
      console.error('Error logging webhook event:', error);
    }
  }

  /**
   * Validate webhook headers
   * @param headers Request headers
   * @returns boolean indicating if headers are valid
   */
  public validateWebhookHeaders(headers: any): boolean {
    const requiredHeaders = ['x-shopify-hmac-sha256', 'x-shopify-shop-domain', 'x-shopify-topic', 'x-shopify-api-version'];

    return requiredHeaders.every((header) => headers[header]);
  }
}
