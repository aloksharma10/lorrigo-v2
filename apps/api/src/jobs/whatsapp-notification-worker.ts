import { Job, Worker } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';
import { WhatsAppService } from '@/lib/whatsapp';
import { captureException } from '@/lib/sentry';
import { APP_CONFIG } from '@/config/app';

// WhatsApp notification job types
export enum WhatsAppJobTypes {
  SEND_NDR_NOTIFICATION = 'send-ndr-notification',
  SEND_TEMPLATE_MESSAGE = 'send-template-message',
  SEND_TEXT_MESSAGE = 'send-text-message',
}



export interface NDRNotificationJobData {
  ndrOrderId: string;
  orderId?: string;
  shipmentId?: string;
  awb?: string;
  userId?: string;
}

export interface TemplateMessageJobData {
  phoneNumber: string;
  templateId: string;
  variables: string[];
  buttonVariables?: string[];
  media?: string;
  metadata?: Record<string, any>;
}

export interface TextMessageJobData {
  phoneNumber: string;
  message: string;
  media?: string;
  metadata?: Record<string, any>;
}

export class WhatsAppNotificationWorker {
  private worker!: Worker;
  private whatsappService: WhatsAppService;

  constructor(private fastify: FastifyInstance) {
    this.whatsappService = new WhatsAppService(fastify);
    this.initializeWorker();
  }

  /**
   * Initialize WhatsApp notification worker
   */
  private initializeWorker(): void {
    console.log('Initializing WhatsApp notification worker with queue:', QueueNames.WHATSAPP_NOTIFICATION);
    this.worker = new Worker(
      QueueNames.WHATSAPP_NOTIFICATION,
      async (job: Job) => {
        await this.processWhatsAppJob(job);
      },
      {
        connection: redis,
        prefix: APP_CONFIG.REDIS.PREFIX,
        concurrency: 5, // Process 5 WhatsApp notifications concurrently
        removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
        removeOnFail: { count: 500 }, // Keep last 500 failed jobs for debugging
      }
    );

    // Handle worker events
    this.worker.on('completed', (job: Job) => {
      this.fastify.log.info(`WhatsApp notification job ${job.id} completed successfully`, {
        jobType: job.name,
        jobData: job.data,
      });
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      this.fastify.log.error(`WhatsApp notification job ${job?.id} failed:`, {
        error: err.message,
        jobType: job?.name,
        jobData: job?.data,
      });
      captureException(err);
    });

    this.worker.on('error', (err: Error) => {
      this.fastify.log.error('WhatsApp notification worker error:', err);
      captureException(err);
    });

    this.worker.on('ready', () => {
      console.log('WhatsApp notification worker is ready and listening for jobs');
      this.fastify.log.info('WhatsApp notification worker is ready');
    });

    this.worker.on('stalled', (jobId: string) => {
      console.log('WhatsApp job stalled:', jobId);
      this.fastify.log.warn('WhatsApp job stalled:', { jobId });
    });

    this.fastify.log.info('WhatsApp notification worker initialized');
  }

  /**
   * Process WhatsApp notification job
   */
  private async processWhatsAppJob(job: Job): Promise<void> {
    try {
      this.fastify.log.info(`Processing WhatsApp job: ${job.name}`, {
        jobId: job.id,
        jobData: job.data,
      });

      switch (job.name) {
        case WhatsAppJobTypes.SEND_NDR_NOTIFICATION:
          await this.processNDRNotification(job.data as NDRNotificationJobData);
          break;

        case WhatsAppJobTypes.SEND_TEMPLATE_MESSAGE:
          await this.processTemplateMessage(job.data as TemplateMessageJobData);
          break;

        case WhatsAppJobTypes.SEND_TEXT_MESSAGE:
          await this.processTextMessage(job.data as TextMessageJobData);
          break;

        default:
          throw new Error(`Unknown WhatsApp job type: ${job.name}`);
      }
    } catch (error) {
      this.fastify.log.error('Error processing WhatsApp job:', error);
      captureException(error as Error);
      throw error; // Re-throw to trigger retry mechanism
    }
  }



  /**
   * Process NDR notification job
   */
  private async processNDRNotification(data: NDRNotificationJobData): Promise<void> {
    const { NDRNotificationService } = await import('@/modules/shipments/services/ndr-notification.service');
    const ndrService = new NDRNotificationService(this.fastify);

    const result = await ndrService.handleNDRCreated(
      data.ndrOrderId,
      data.orderId,
      data.shipmentId,
      data.awb
    );

    if (!result.success) {
      throw new Error(`Failed to send NDR notification: ${result.message}`);
    }

    this.fastify.log.info(`NDR notification sent successfully for NDR: ${data.ndrOrderId}`);
  }

  /**
   * Process template message job
   */
  private async processTemplateMessage(data: TemplateMessageJobData): Promise<void> {
    const result = await this.whatsappService.sendTemplateMessage(
      data.phoneNumber,
      data.templateId,
      data.variables,
      data.buttonVariables || [],
      data.media || ''
    );

    if (!result.success) {
      throw new Error(`Failed to send template message: ${result.message}`);
    }

    this.fastify.log.info(`Template message sent successfully to: ${data.phoneNumber}`);
  }

  /**
   * Process text message job
   */
  private async processTextMessage(data: TextMessageJobData): Promise<void> {
    const result = await this.whatsappService.sendTextMessage(
      data.phoneNumber,
      data.message,
      data.media || ''
    );

    if (!result.success) {
      throw new Error(`Failed to send text message: ${result.message}`);
    }

    this.fastify.log.info(`Text message sent successfully to: ${data.phoneNumber}`);
  }

  /**
   * Close worker
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}

// Export worker factory function
export function createWhatsAppNotificationWorker(fastify: FastifyInstance): WhatsAppNotificationWorker {
  return new WhatsAppNotificationWorker(fastify);
}