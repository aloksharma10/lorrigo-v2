import { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { QueueNames } from '@/lib/queue';
import { NotificationService } from '@/lib/notification';
import { NotificationStatus } from '@/types/notification';
import { redis } from '@/lib/redis';
import { captureException } from '@/lib/sentry';
import { FastifyInstance } from 'fastify';

export class NotificationWorker {
  private worker!: Worker;
  private notificationService: NotificationService;

  constructor(fastify: FastifyInstance) {
    this.notificationService = new NotificationService(fastify);
    this.initializeWorker();
  }

  /**
   * Initialize notification worker
   */
  private initializeWorker(): void {
    this.worker = new Worker(
      QueueNames.NOTIFICATION,
      async (job: Job) => {
        await this.processNotificationJob(job);
      },
      {
        connection: redis,
        concurrency: 5, // Process 5 jobs concurrently
        removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
        removeOnFail: { count: 50 }, // Keep last 50 failed jobs
      }
    );

    // Handle worker events
    this.worker.on('completed', (job: Job) => {
      console.log(`Notification job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(`Notification job ${job?.id} failed:`, err);
      captureException(err);
    });

    this.worker.on('error', (err: Error) => {
      console.error('Notification worker error:', err);
      captureException(err);
    });

    console.log('Notification worker initialized');
  }

  /**
   * Process notification job
   */
  private async processNotificationJob(job: Job): Promise<void> {
    try {
      const { jobId, payload } = job.data;

      // Update job status to processing
      await this.updateJobStatus(jobId, NotificationStatus.PENDING, 'Processing notification');

      // Send notification
      const result = await this.notificationService.sendImmediateNotification(payload);

      if (result.success) {
        // Update job status to sent
        await this.updateJobStatus(jobId, NotificationStatus.SENT, 'Notification sent successfully');
      } else {
        // Update job status to failed
        await this.updateJobStatus(jobId, NotificationStatus.FAILED, result.message);
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error processing notification job:', error);
      captureException(error as Error);
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  /**
   * Update job status in Redis
   */
  private async updateJobStatus(jobId: string, status: NotificationStatus, message?: string): Promise<void> {
    try {
      const jobData = await redis.get(`notification_job:${jobId}`);

      if (jobData) {
        const job = JSON.parse(jobData);
        job.status = status;
        job.sentAt = status === NotificationStatus.SENT ? new Date() : job.sentAt;
        job.error = status === NotificationStatus.FAILED ? message : job.error;

        await redis.setex(
          `notification_job:${jobId}`,
          24 * 60 * 60, // 24 hours
          JSON.stringify(job)
        );
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      captureException(error as Error);
    }
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
export function createNotificationWorker(fastify: FastifyInstance): NotificationWorker {
  return new NotificationWorker(fastify);
}
