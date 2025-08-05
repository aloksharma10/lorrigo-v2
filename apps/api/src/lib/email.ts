import nodemailer from 'nodemailer';
import { APP_CONFIG } from '@/config/app';
import { captureException } from './sentry';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';

export class EmailService {
  private transporter: nodemailer.Transporter | undefined;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.initializeTransporter();
    this.loadTemplates();
  }

  /**
   * Initialize nodemailer transporter
   */
  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: APP_CONFIG.NOTIFICATION.EMAIL.HOST,
      port: APP_CONFIG.NOTIFICATION.EMAIL.PORT,
      secure: APP_CONFIG.NOTIFICATION.EMAIL.SECURE,
      auth: {
        user: APP_CONFIG.NOTIFICATION.EMAIL.USER,
        pass: APP_CONFIG.NOTIFICATION.EMAIL.PASSWORD,
      },
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        console.error('Email service connection error:', error);
        captureException(error as Error);
      } else {
        console.log('Email service is ready');
      }
    });
  }

  /**
   * Load email templates from the template directory
   */
  private loadTemplates(): void {
    try {
      const templateDir = path.join(process.cwd(), './src/template');

      if (!fs.existsSync(templateDir)) {
        console.warn('Template directory not found');
        return;
      }

      const templateFiles = fs.readdirSync(templateDir).filter((file) => file.endsWith('.html'));

      for (const file of templateFiles) {
        const templateName = path.basename(file, '.html');
        const templatePath = path.join(templateDir, file);
        const templateContent = fs.readFileSync(templatePath, 'utf-8');

        this.templates.set(templateName, Handlebars.compile(templateContent));
        console.log(`Loaded email template: ${templateName}`);
      }
    } catch (error) {
      console.error('Error loading email templates:', error);
      captureException(error as Error);
    }
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(
    to: string,
    templateName: string,
    templateData: Record<string, any>,
    options?: {
      subject?: string;
      from?: string;
      attachments?: any;
    }
  ): Promise<{ success: boolean; message: string; messageId?: string }> {
    try {
      const template = this.templates.get(templateName);

      if (!template) {
        return {
          success: false,
          message: `Template '${templateName}' not found`,
        };
      }

      const html = template(templateData);
      const subject = options?.subject || this.getDefaultSubject(templateName);

      return await this.sendEmail({
        to,
        subject,
        html,
        from: options?.from,
        attachments: options?.attachments,
      });
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to send template email',
      };
    }
  }

  /**
   * Send custom email
   */
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    attachments?: any;
  }): Promise<{ success: boolean; message: string; messageId?: string }> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: options.from || `${APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME} <${APP_CONFIG.NOTIFICATION.EMAIL.FROM}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const info = await this.transporter?.sendMail(mailOptions);

      return {
        success: true,
        message: 'Email sent successfully',
        messageId: info.messageId,
      };
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to send email',
      };
    }
  }

  /**
   * Send OTP email
   */
  async sendOTPEmail(
    to: string,
    otp: string,
    type: string,
    options?: {
      userName?: string;
      expiryMinutes?: number;
    }
  ): Promise<{ success: boolean; message: string; messageId?: string }> {
    const templateData = {
      otp,
      type,
      userName: options?.userName || 'User',
      expiryMinutes: options?.expiryMinutes || APP_CONFIG.NOTIFICATION.OTP.EXPIRY_MINUTES,
      supportEmail: APP_CONFIG.NOTIFICATION.EMAIL.FROM,
      companyName: APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME,
    };

    return await this.sendTemplateEmail(to, 'otp-email', templateData, {
      subject: `${APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME} - Your OTP for ${type}`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    options?: {
      userName?: string;
      expiryHours?: number;
    }
  ): Promise<{ success: boolean; message: string; messageId?: string }> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const templateData = {
      resetUrl,
      userName: options?.userName || 'User',
      expiryHours: options?.expiryHours || 24,
      supportEmail: APP_CONFIG.NOTIFICATION.EMAIL.FROM,
      companyName: APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME,
    };

    return await this.sendTemplateEmail(to, 'password-reset', templateData, {
      subject: `${APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME} - Password Reset Request`,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    to: string,
    options: {
      userName: string;
      loginUrl?: string;
    }
  ): Promise<{ success: boolean; message: string; messageId?: string }> {
    const templateData = {
      userName: options.userName,
      loginUrl: options.loginUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      supportEmail: APP_CONFIG.NOTIFICATION.EMAIL.FROM,
      companyName: APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME,
    };

    return await this.sendTemplateEmail(to, 'welcome', templateData, {
      subject: `Welcome to ${APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME}!`,
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(
    to: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      total: number;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
      shippingAddress: string;
      estimatedDelivery?: string;
    },
    options?: {
      userName?: string;
    }
  ): Promise<{ success: boolean; message: string; messageId?: string }> {
    const templateData = {
      ...orderData,
      userName: options?.userName || 'Customer',
      supportEmail: APP_CONFIG.NOTIFICATION.EMAIL.FROM,
      companyName: APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME,
    };

    return await this.sendTemplateEmail(to, 'order-confirmation', templateData, {
      subject: `${APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME} - Order Confirmation #${orderData.orderNumber}`,
    });
  }

  /**
   * Get default subject for template
   */
  private getDefaultSubject(templateName: string): string {
    const subjects: Record<string, string> = {
      'otp-email': `${APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME} - Your OTP`,
      'password-reset': `${APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME} - Password Reset`,
      welcome: `Welcome to ${APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME}!`,
      'order-confirmation': `${APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME} - Order Confirmation`,
    };

    return subjects[templateName] || `${APP_CONFIG.NOTIFICATION.EMAIL.FROM_NAME} - Notification`;
  }

  /**
   * Test email connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter?.verify();
      return true;
    } catch (error) {
      captureException(error as Error);
      return false;
    }
  }

  /**
   * Get email service status
   */
  async getStatus(): Promise<{
    connected: boolean;
    host: string;
    port: number;
    secure: boolean;
  }> {
    return {
      connected: await this.testConnection(),
      host: APP_CONFIG.NOTIFICATION.EMAIL.HOST,
      port: APP_CONFIG.NOTIFICATION.EMAIL.PORT,
      secure: APP_CONFIG.NOTIFICATION.EMAIL.SECURE,
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
