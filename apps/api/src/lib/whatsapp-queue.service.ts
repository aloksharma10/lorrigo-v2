import { FastifyInstance } from 'fastify';
import { addJob, QueueNames, queues } from '@/lib/queue';
import { TrackingNotificationData } from '@/types/notification';
import { 
  WhatsAppJobTypes, 
  TrackingNotificationJobData,
  NDRNotificationJobData,
  TemplateMessageJobData,
  TextMessageJobData
} from '@/jobs/whatsapp-notification-worker';
import { captureException } from '@/lib/sentry';

export class WhatsAppQueueService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Queue tracking notification job
   */
  async queueTrackingNotification(
    event: 'courier_assigned' | 'picked_up' | 'out_for_delivery' | 'delivered',
    trackingData: TrackingNotificationData,
    options?: {
      priority?: number;
      delay?: number;
      shipmentId?: string;
      userId?: string;
    }
  ): Promise<{ success: boolean; jobId?: string; message: string }> {
    try {
      const jobData: TrackingNotificationJobData = {
        event,
        trackingData,
        shipmentId: options?.shipmentId,
        userId: options?.userId,
      };

      const job = await addJob(
        QueueNames.WHATSAPP_NOTIFICATION,
        WhatsAppJobTypes.SEND_TRACKING_NOTIFICATION,
        jobData,
        {
          priority: options?.priority || 1,
          delay: options?.delay || 0,
          attempts: 5,
        }
      );

      this.fastify.log.info(`Tracking notification queued for order: ${trackingData.orderNumber}`, {
        jobId: job.id,
        event,
      });

      return {
        success: true,
        jobId: job.id,
        message: 'Tracking notification queued successfully',
      };
    } catch (error) {
      captureException(error as Error);
      this.fastify.log.error('Failed to queue tracking notification:', error);
      
      return {
        success: false,
        message: 'Failed to queue tracking notification',
      };
    }
  }

  /**
   * Queue NDR notification job
   */
  async queueNDRNotification(
    ndrOrderId: string,
    options?: {
      priority?: number;
      delay?: number;
      orderId?: string;
      shipmentId?: string;
      awb?: string;
      userId?: string;
    }
  ): Promise<{ success: boolean; jobId?: string; message: string }> {
    try {
      const jobData: NDRNotificationJobData = {
        ndrOrderId,
        orderId: options?.orderId,
        shipmentId: options?.shipmentId,
        awb: options?.awb,
        userId: options?.userId,
      };

      const job = await addJob(
        QueueNames.WHATSAPP_NOTIFICATION,
        WhatsAppJobTypes.SEND_NDR_NOTIFICATION,
        jobData,
        {
          priority: options?.priority || 2, // Higher priority for NDR
          delay: options?.delay || 0,
          attempts: 5,
        }
      );

      this.fastify.log.info(`NDR notification queued for NDR: ${ndrOrderId}`, {
        jobId: job.id,
      });

      return {
        success: true,
        jobId: job.id,
        message: 'NDR notification queued successfully',
      };
    } catch (error) {
      captureException(error as Error);
      this.fastify.log.error('Failed to queue NDR notification:', error);
      
      return {
        success: false,
        message: 'Failed to queue NDR notification',
      };
    }
  }

  /**
   * Queue template message job
   */
  async queueTemplateMessage(
    phoneNumber: string,
    templateId: string,
    variables: string[],
    options?: {
      priority?: number;
      delay?: number;
      buttonVariables?: string[];
      media?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ success: boolean; jobId?: string; message: string }> {
    try {
      const jobData: TemplateMessageJobData = {
        phoneNumber,
        templateId,
        variables,
        buttonVariables: options?.buttonVariables,
        media: options?.media,
        metadata: options?.metadata,
      };

      const job = await addJob(
        QueueNames.WHATSAPP_NOTIFICATION,
        WhatsAppJobTypes.SEND_TEMPLATE_MESSAGE,
        jobData,
        {
          priority: 1,
          delay: options?.delay || 0,
          attempts: 3,
        }
      );

      this.fastify.log.info(`Template message queued for: ${phoneNumber} ${templateId} ${job.id}`, {
        jobId: job.id,
        templateId,
      });

      return {
        success: true,
        jobId: job.id,
        message: 'Template message queued successfully',
      };
    } catch (error) {
      captureException(error as Error);
      this.fastify.log.error('Failed to queue template message:', error);
      
      return {
        success: false,
        message: 'Failed to queue template message',
      };
    }
  }

  /**
   * Queue text message job
   */
  async queueTextMessage(
    phoneNumber: string,
    message: string,
    options?: {
      priority?: number;
      delay?: number;
      media?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ success: boolean; jobId?: string; message: string }> {
    try {
      const jobData: TextMessageJobData = {
        phoneNumber,
        message,
        media: options?.media,
        metadata: options?.metadata,
      };

      const job = await addJob(
        QueueNames.WHATSAPP_NOTIFICATION,
        WhatsAppJobTypes.SEND_TEXT_MESSAGE,
        jobData,
        {
          priority: options?.priority || 3,
          delay: options?.delay || 0,
          attempts: 3,
        }
      );

      this.fastify.log.info(`Text message queued for: ${phoneNumber}`, {
        jobId: job.id,
      });

      return {
        success: true,
        jobId: job.id,
        message: 'Text message queued successfully',
      };
    } catch (error) {
      captureException(error as Error);
      this.fastify.log.error('Failed to queue text message:', error);
      
      return {
        success: false,
        message: 'Failed to queue text message',
      };
    }
  }

  /**
   * Queue bulk tracking notifications
   */
  async queueBulkTrackingNotifications(
    notifications: Array<{
      event: 'courier_assigned' | 'picked_up' | 'out_for_delivery' | 'delivered';
      trackingData: TrackingNotificationData;
      shipmentId?: string;
      userId?: string;
    }>,
    options?: {
      priority?: number;
      delay?: number;
    }
  ): Promise<{ success: boolean; queuedCount: number; errors: string[] }> {
    const results = {
      success: true,
      queuedCount: 0,
      errors: [] as string[],
    };

    for (const notification of notifications) {
      try {
        const result = await this.queueTrackingNotification(
          notification.event,
          notification.trackingData,
          {
            priority: options?.priority,
            delay: options?.delay,
            shipmentId: notification.shipmentId,
            userId: notification.userId,
          }
        );

        if (result.success) {
          results.queuedCount++;
        } else {
          results.errors.push(`Failed to queue notification for order ${notification.trackingData.orderNumber}: ${result.message}`);
        }
      } catch (error) {
        results.errors.push(`Error queuing notification for order ${notification.trackingData.orderNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (results.errors.length > 0) {
      results.success = false;
    }

    this.fastify.log.info(`Bulk tracking notifications queued: ${results.queuedCount} successful, ${results.errors.length} failed`);

    return results;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const queue = queues[QueueNames.WHATSAPP_NOTIFICATION];
      
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    } catch (error) {
      captureException(error as Error);
      this.fastify.log.error('Failed to get WhatsApp queue stats:', error);
      
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }
  }
}