import { FastifyInstance } from 'fastify';
import { 
  NotificationType, 
  NotificationPayload, 
  NotificationPriority, 
  NotificationStatus,
  OTPPayload,
  OTPVerificationPayload,
  SystemNotification,
  NotificationJob
} from '@/types/notification';
import { emailService } from './email';
import { otpService } from './otp';
import { addJob, QueueNames } from './queue';
import { captureException } from './sentry';
import { v4 as uuidv4 } from 'uuid';
import { redis } from './redis';
import { APP_CONFIG } from '@/config/app';

export class NotificationService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Send notification through specified channel
   */
  async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string; jobId?: string }> {
    try {
      const jobId = uuidv4();
      const job: NotificationJob = {
        id: jobId,
        payload,
        attempts: 0,
        maxAttempts: 3,
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
      };

      // Store job in Redis for tracking
      await redis.setex(
        `notification_job:${jobId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(job)
      );

      // Add to notification queue
      await addJob(
        QueueNames.NOTIFICATION,
        'send-notification',
        { jobId, payload },
        {
          priority: this.getPriorityValue(payload.priority),
          attempts: 3,
        }
      );

      return {
        success: true,
        message: 'Notification queued successfully',
        jobId,
      };
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to queue notification',
      };
    }
  }

  /**
   * Send immediate notification (bypass queue)
   */
  async sendImmediateNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
    try {
      switch (payload.type) {
        case NotificationType.EMAIL:
          return await this.sendEmailNotification(payload);
        
        case NotificationType.SYSTEM:
          return await this.sendSystemNotification(payload);
        
        default:
          return {
            success: false,
            message: `Unsupported notification type: ${payload.type}`,
          };
      }
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to send immediate notification',
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
    try {
      const result = await emailService.sendEmail({
        to: payload.recipient,
        subject: payload.subject || 'Notification',
        html: payload.message,
      });

      return result;
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to send email notification',
      };
    }
  }

  /**
   * Send system notification
   */
  private async sendSystemNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
    try {
      // Store system notification in Redis for real-time delivery
      const notification: SystemNotification = {
        userId: payload.recipient,
        title: payload.subject || 'System Notification',
        message: payload.message,
        type: 'info',
        data: payload.metadata,
      };

      await redis.lpush(
        `system_notifications:${payload.recipient}`,
        JSON.stringify(notification)
      );

      // Set expiry for system notifications (7 days)
      await redis.expire(`system_notifications:${payload.recipient}`, 7 * 24 * 60 * 60);

      return {
        success: true,
        message: 'System notification sent successfully',
      };
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to send system notification',
      };
    }
  }

  /**
   * Generate and send OTP
   */
  async generateAndSendOTP(payload: OTPPayload): Promise<{ success: boolean; message: string; otpId?: string }> {
    try {
      // Generate OTP
      const otpResult = await otpService.generateOTP(payload);
      
      if (!otpResult.success) {
        return otpResult;
      }

      // Get OTP data to send
      const otpKey = `otp:${payload.identifier}:${payload.type}`;
      const otpDataString = await redis.get(otpKey);
      
      if (!otpDataString) {
        return {
          success: false,
          message: 'Failed to retrieve OTP data',
        };
      }

      const otpData = JSON.parse(otpDataString);

      // Send OTP through email
      if (payload.identifierType === 'email') {
        const sendResult = await emailService.sendOTPEmail(
          payload.identifier,
          otpData.otp,
          payload.type,
          {
            userName: payload.metadata?.userName,
            expiryMinutes: APP_CONFIG.NOTIFICATION.OTP.EXPIRY_MINUTES,
          }
        );

        if (!sendResult.success) {
          // If sending failed, invalidate the OTP
          await otpService.invalidateOTP(payload.identifier, payload.type);
          return sendResult;
        }
      } else {
        return {
          success: false,
          message: 'Only email OTP is supported',
        };
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        otpId: otpResult.otpId,
      };
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to generate and send OTP',
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(payload: OTPVerificationPayload): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      return await otpService.verifyOTP(payload);
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to verify OTP',
      };
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(payload: OTPPayload): Promise<{ success: boolean; message: string; otpId?: string }> {
    try {
      const resendResult = await otpService.resendOTP(payload);
      
      if (!resendResult.success) {
        return resendResult;
      }

      // Get updated OTP data
      const otpKey = `otp:${payload.identifier}:${payload.type}`;
      const otpDataString = await redis.get(otpKey);
      
      if (!otpDataString) {
        return {
          success: false,
          message: 'Failed to retrieve OTP data',
        };
      }

      const otpData = JSON.parse(otpDataString);

      // Send new OTP via email
      if (payload.identifierType === 'email') {
        const sendResult = await emailService.sendOTPEmail(
          payload.identifier,
          otpData.otp,
          payload.type,
          {
            userName: payload.metadata?.userName,
            expiryMinutes: APP_CONFIG.NOTIFICATION.OTP.EXPIRY_MINUTES,
          }
        );

        if (!sendResult.success) {
          return sendResult;
        }
      } else {
        return {
          success: false,
          message: 'Only email OTP is supported',
        };
      }

      return {
        success: true,
        message: 'OTP resent successfully',
        otpId: resendResult.otpId,
      };
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to resend OTP',
      };
    }
  }

  /**
   * Get system notifications for user
   */
  async getSystemNotifications(userId: string, limit: number = 50): Promise<SystemNotification[]> {
    try {
      const notifications = await redis.lrange(`system_notifications:${userId}`, 0, limit - 1);
      return notifications.map(n => JSON.parse(n));
    } catch (error) {
      captureException(error as Error);
      return [];
    }
  }

  /**
   * Mark system notification as read
   */
  async markNotificationAsRead(userId: string, notificationIndex: number): Promise<boolean> {
    try {
      const notifications = await redis.lrange(`system_notifications:${userId}`, 0, -1);
      
      if (notificationIndex >= notifications.length) {
        return false;
      }

      const notification: SystemNotification = JSON.parse(notifications[notificationIndex] || '{}');
      notification.data = { ...notification.data, read: true };

      await redis.lset(
        `system_notifications:${userId}`,
        notificationIndex,
        JSON.stringify(notification)
      );

      return true;
    } catch (error) {
      captureException(error as Error);
      return false;
    }
  }

  /**
   * Clear all system notifications for user
   */
  async clearSystemNotifications(userId: string): Promise<boolean> {
    try {
      await redis.del(`system_notifications:${userId}`);
      return true;
    } catch (error) {
      captureException(error as Error);
      return false;
    }
  }

  /**
   * Get notification job status
   */
  async getNotificationJobStatus(jobId: string): Promise<NotificationJob | null> {
    try {
      const jobData = await redis.get(`notification_job:${jobId}`);
      return jobData ? JSON.parse(jobData) : null;
    } catch (error) {
      captureException(error as Error);
      return null;
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<{
    email: { connected: boolean };
    redis: { connected: boolean };
  }> {
    try {
      const emailStatus = await emailService.getStatus();

      return {
        email: { connected: emailStatus.connected },
        redis: { connected: redis.status === 'ready' },
      };
    } catch (error) {
      captureException(error as Error);
      return {
        email: { connected: false },
        redis: { connected: false },
      };
    }
  }

  /**
   * Convert priority enum to numeric value
   */
  private getPriorityValue(priority?: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 1;
      case NotificationPriority.HIGH:
        return 2;
      case NotificationPriority.NORMAL:
        return 3;
      case NotificationPriority.LOW:
        return 4;
      default:
        return 3;
    }
  }
} 