import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { APP_CONFIG } from '@/config/app';
import { redis } from '@/lib/redis';
import { initQueueEvents, QueueNames } from '@/lib/queue';
import { BillingService } from '../services/billing-service';

export enum BillingJobType {
  AUTOMATE_BILLING = 'automate-billing',
  RESOLVE_DISPUTES = 'resolve-disputes',
}

interface AutomateBillingData {
  userId?: string; // Optional – if not provided process all users
}

/**
 * Initialize the billing automation queue and workers
 */
export function initBillingQueue(fastify: FastifyInstance, billingService: BillingService) {
  const queue = fastify.queues[QueueNames.BILLING_AUTOMATION];

  if (!queue) {
    fastify.log.error('Billing automation queue not initialized in queue.ts');
    throw new Error('Billing automation queue missing');
  }

  // Monitor queue events
  initQueueEvents(fastify, QueueNames.BILLING_AUTOMATION);

  // Worker
  const worker = new Worker(
    QueueNames.BILLING_AUTOMATION,
    async (job: Job) => {
      fastify.log.info(`Billing worker processing job ${job.id} (${job.name})`);
      switch (job.name) {
        case BillingJobType.AUTOMATE_BILLING: {
          const { userId } = job.data as AutomateBillingData;
          return billingService.runBilling(userId);
        }
        case BillingJobType.RESOLVE_DISPUTES: {
          return billingService.autoResolveDisputes();
        }
        default:
          throw new Error(`Unknown billing job type: ${job.name}`);
      }
    },
    {
      connection: redis,
      prefix: APP_CONFIG.REDIS.PREFIX,
      concurrency: 5,
    }
  );

  return { queue, worker };
} 