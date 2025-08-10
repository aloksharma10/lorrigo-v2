import axios, { AxiosResponse } from 'axios';
import { FastifyInstance } from 'fastify';
import { captureException } from '@/lib/sentry';
import { APP_CONFIG } from '@/config/app';

export interface WhatsAppMessage {
  destination_number: string;
  message?: string;
  template_id?: string;
  device_id?: string;
  variables?: string[];
  button_variable?: string[];
  media?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
  button_variables?: string[];
}

export class WhatsAppService {
  private fastify: FastifyInstance;
  private baseUrl: string;
  private appKey: string;
  private authKey: string;
  private deviceId: string;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.baseUrl = APP_CONFIG.WHATSAPP.API_URL || 'https://web.wabridge.com/api';
    this.appKey = APP_CONFIG.WHATSAPP.APP_KEY || '';
    this.authKey = APP_CONFIG.WHATSAPP.AUTH_KEY || '';
    this.deviceId = APP_CONFIG.WHATSAPP.DEVICE_ID || 'DEVICE_ID';

    if (!this.appKey || !this.authKey) {
      throw new Error('WhatsApp credentials not configured. Please set WHATSAPP_APP_KEY and WHATSAPP_AUTH_KEY environment variables.');
    }
  }

  /**
   * Send WhatsApp message using template
   */
  async sendTemplateMessage(
    phoneNumber: string,
    templateId: string,
    variables: string[] = [],
    buttonVariables: string[] = [],
    media: string = ''
  ): Promise<WhatsAppResponse> {
    try {
      // Format phone number (ensure it starts with country code)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const payload = {
        'app-key': this.appKey,
        'auth-key': this.authKey,
        destination_number: formattedPhone,
        template_id: templateId,
        device_id: this.deviceId,
        variables,
        button_variable: buttonVariables,
        media,
        message: '', // Empty for template messages
      };

      const response: AxiosResponse = await axios.post(`${this.baseUrl}/createmessage`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      });

      // Check if the response indicates success
      if (response.data?.success !== false) {
        return {
          success: true,
          message: 'WhatsApp message sent successfully',
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: response.data?.message || 'Failed to send WhatsApp message',
          error: response.data?.message,
        };
      }
    } catch (error: any) {
      captureException(error);

      const errorMessage = error.response?.data?.message || error.message || 'Failed to send WhatsApp message';

      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
  }

  /**
   * Send plain text WhatsApp message
   */
  async sendTextMessage(phoneNumber: string, message: string, media: string = ''): Promise<WhatsAppResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const payload = {
        'app-key': this.appKey,
        'auth-key': this.authKey,
        destination_number: formattedPhone,
        template_id: '', // Empty for text messages
        device_id: this.deviceId,
        variables: [],
        button_variable: [],
        media,
        message,
      };

      const response: AxiosResponse = await axios.post(`${this.baseUrl}/createmessage`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      if (response.data?.success !== false) {
        return {
          success: true,
          message: 'WhatsApp message sent successfully',
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: response.data?.message || 'Failed to send WhatsApp message',
          error: response.data?.message,
        };
      }
    } catch (error: any) {
      captureException(error);

      const errorMessage = error.response?.data?.message || error.message || 'Failed to send WhatsApp message';

      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
  }

  /**
   * Format phone number to ensure proper format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let formatted = phoneNumber.replace(/\D/g, '');

    // If it starts with 0, replace with 91 (India country code)
    if (formatted.startsWith('0')) {
      formatted = '91' + formatted.substring(1);
    }

    // If it doesn't start with 91 and is 10 digits, add 91 prefix
    if (!formatted.startsWith('91') && formatted.length === 10) {
      formatted = '91' + formatted;
    }

    return formatted;
  }

  /**
   * Validate WhatsApp configuration
   */
  isConfigured(): boolean {
    return !!(this.appKey && this.authKey && this.deviceId);
  }

  /**
   * Get WhatsApp service status
   */
  getStatus(): {
    configured: boolean;
    baseUrl: string;
    deviceId: string;
  } {
    return {
      configured: this.isConfigured(),
      baseUrl: this.baseUrl,
      deviceId: this.deviceId,
    };
  }
}

// WhatsApp message templates for different tracking events
export const WhatsAppTemplates = {
  // Customer notifications
  COURIER_ASSIGNED: {
    id: APP_CONFIG.WHATSAPP.TEMPLATE_READY_FOR_DISPATCH || '',
    name: 'ready_for_dispatch',
    message:
      'Hi {{1}}, Your order **#{{2}}** containing *{{3}}* is ready for dispatch with {{4}}. Lorrigo ensures your parcels move fast, safe, and cost-efficiently.',
    variables: ['customer_name', 'order_number', 'items_description', 'courier_name'],
  },
  PICKED_UP: {
    id: APP_CONFIG.WHATSAPP.TEMPLATE_ORDER_SHIPPED || '',
    name: 'order_shipped',
    message:
      'Hi {{1}}, Your order **#{{2}}** with *{{3}}* has been shipped via {{4}}. 📦 Expected Delivery: {{5}} With Lorrigo, you enjoy faster deliveries & live tracking across India.',
    variables: ['customer_name', 'order_number', 'items_description', 'courier_name', 'expected_delivery'],
  },
  OUT_FOR_DELIVERY: {
    id: APP_CONFIG.WHATSAPP.TEMPLATE_OUT_FOR_DELIVERY || '',
    name: 'out_for_delivery',
    message:
      'Hi {{1}}, Your order **#{{2}}** with *{{3}}* is out for delivery today. Track live: {{4}} Lorrigo helps ensure your parcels reach you on time, every time.',
    variables: ['customer_name', 'order_number', 'items_description', 'tracking_url'],
  },
  DELIVERED: {
    id: APP_CONFIG.WHATSAPP.TEMPLATE_ORDER_DELIVERED || '',
    name: 'order_delivered',
    message:
      'Hi {{1}}, Your order **#{{2}}** containing *{{3}}* has been successfully delivered. We hope you enjoyed your shopping experience. From store to your door — Lorrigo delivers happiness.',
    variables: ['customer_name', 'order_number', 'items_description'],
  },
  // Seller notifications
  NDR_NOTIFICATION: {
    id: APP_CONFIG.WHATSAPP.TEMPLATE_NDR_NOTIFICATION || '',
    name: 'ndr_notification',
    message: 'Action Required! Your shipment {awb} for order {order_number} is in NDR. Reason: {ndr_reason}. Please take action in your dashboard.',
    variables: ['awb', 'order_number', 'ndr_reason'],
  },
} as const;

export type WhatsAppTemplateKey = keyof typeof WhatsAppTemplates;
