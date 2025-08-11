import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { TransactionService } from '../services/transaction-service';
import { QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';
import { APP_CONFIG } from '@/config/app';

export enum TransactionJobType {
  BULK_PROCESS_TRANSACTIONS = 'bulk-process-transactions',
  REFUND_CHECK = 'refund-check',
  ABANDONED_SWEEP = 'abandoned-sweep',
}
/**
 * Worker for processing transaction-related background jobs
 */
export class TransactionWorker {
  private worker: Worker;
  private transactionService: TransactionService;

  constructor(fastify: FastifyInstance) {
    this.transactionService = new TransactionService(fastify);

    // Create a worker for processing bulk transactions
    this.worker = new Worker(
      QueueNames.TRANSACTION_QUEUE,
      async (job: Job) => {
        switch (job.name) {
          case TransactionJobType.BULK_PROCESS_TRANSACTIONS:
            return this.transactionService.processBulkTransactions(job.data.transactions, job.data.entityType);
          case TransactionJobType.REFUND_CHECK:
            return this.transactionService.processRefundCheck(job.data);
          case TransactionJobType.ABANDONED_SWEEP:
            return this.transactionService.sweepAbandonedPendingTransactions();
          default:
            return { success: false, error: 'Unknown job type' };
        }
      },
      {
        connection: redis,
        prefix: APP_CONFIG.REDIS.PREFIX || 'lorrigo',
        concurrency: 5, // Process 5 jobs at a time
      }
    );

    // Set up event handlers
    this.setupEventHandlers(fastify);
  }

  /**
   * Set up event handlers for the worker
   * @param fastify Fastify instance for logging
   */
  private setupEventHandlers(fastify: FastifyInstance) {
    this.worker.on('completed', (job) => {
      fastify.log.info(`Transaction job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      fastify.log.error(`Transaction job ${job?.id} failed: ${err.message}`);
    });

    this.worker.on('error', (err) => {
      fastify.log.error(`Transaction worker error: ${err.message}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await this.worker.close();
      fastify.log.info('Transaction worker closed');
    });

    // Schedule periodic abandoned sweep if queue available
    try {
      const queue = (fastify as any).queues?.[QueueNames.TRANSACTION_QUEUE];
      if (queue) {
        queue.add(
          TransactionJobType.ABANDONED_SWEEP,
          {},
          {
            repeat: { every: 5 * 60 * 1000 }, // every 5 minutes
            removeOnComplete: true,
            removeOnFail: 10,
          }
        );
        fastify.log.info('Scheduled ABANDONED_SWEEP repeat job');
      }
    } catch (e) {
      fastify.log.error(`Failed to schedule ABANDONED_SWEEP: ${e}`);
    }
  }
}

/**
 * Initialize the transaction worker
 * @param fastify Fastify instance
 */
export function initTransactionWorker(fastify: FastifyInstance) {
  return new TransactionWorker(fastify);
}
