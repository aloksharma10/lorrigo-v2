import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { TransactionService, TransactionEntityType } from '../services/transaction-service';
import { QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';
import { APP_CONFIG } from '@/config/app';

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
      QueueNames.BULK_OPERATION,
      async (job: Job) => {
        if (job.name === 'bulk-process-transactions') {
          return this.processBulkTransactions(job, fastify);
        }
        return { success: false, error: 'Unknown job type' };
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
  }

  /**
   * Process bulk transactions job
   * @param job Job data
   * @param fastify Fastify instance
   * @returns Job result
   */
  private async processBulkTransactions(job: Job, fastify: FastifyInstance) {
    const { operationId, transactions, entityType } = job.data;

    try {
      // Get the bulk operation record
      const bulkOperation = await fastify.prisma.bulkOperation.findUnique({
        where: { id: operationId },
      });

      if (!bulkOperation) {
        return { success: false, error: 'Bulk operation not found' };
      }

      // Process transactions in batches
      const batchSize = 10;
      const results = [];
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < transactions.length; i += batchSize) {
        // Update progress
        await job.updateProgress(Math.floor((i / transactions.length) * 100));

        // Process batch
        const batch = transactions.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (transaction: any, index: number) => {
            try {
              let result;

              // Process based on entity type
              switch (entityType) {
                case TransactionEntityType.SHIPMENT:
                  result = await this.transactionService.createShipmentTransaction(transaction);
                  break;
                case TransactionEntityType.INVOICE:
                  result = await this.transactionService.createInvoiceTransaction(transaction);
                  break;
                case TransactionEntityType.WALLET:
                  result = await this.transactionService.createWalletRechargeTransaction(transaction);
                  break;
                default:
                  result = { success: false, error: 'Invalid entity type' };
              }

              if (result.success && result.transaction) {
                successCount++;
                return {
                  index: i + index,
                  success: true,
                  transactionId: result.transaction.id,
                  amount: transaction.amount,
                  type: transaction.type,
                };
              } else {
                failedCount++;
                return {
                  index: i + index,
                  success: false,
                  error: result.error || 'Transaction failed',
                  amount: transaction.amount,
                  type: transaction.type,
                };
              }
            } catch (error) {
              failedCount++;
              return {
                index: i + index,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                amount: transaction.amount,
                type: transaction.type,
              };
            }
          })
        );

        results.push(...batchResults);

        // Update bulk operation status
        await fastify.prisma.bulkOperation.update({
          where: { id: operationId },
          data: {
            processed_count: i + batch.length,
            success_count: successCount,
            failed_count: failedCount,
          },
        });
      }

      // Update bulk operation status to completed
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'COMPLETED',
          processed_count: transactions.length,
          success_count: successCount,
          failed_count: failedCount,
        },
      });

      return {
        success: true,
        results,
        successCount,
        failedCount,
        totalProcessed: transactions.length,
      };
    } catch (error) {
      fastify.log.error(`Error processing bulk transactions: ${error}`);

      // Update bulk operation status to failed
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'FAILED',
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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