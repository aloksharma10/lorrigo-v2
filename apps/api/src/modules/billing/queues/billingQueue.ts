import { Worker, Queue, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { QueueNames } from '@/lib/queue';
import { BillingService } from '../services/billing-service';
import { APP_CONFIG } from '@/config/app';

export enum BillingJobType {
  AUTOMATE_BILLING = 'automate-billing',
  RESOLVE_DISPUTES = 'resolve-disputes',
  PROCESS_WEIGHT_CSV = 'process-weight-csv',
  MANUAL_BILLING = 'manual-billing'
}

interface BillingJobData {
  userId?: string;
  csvData?: Array<{
    AWB: string;
    Charged_Weight: number;
    evidence_url?: string;
  }>;
  operationId?: string;
  manualBillingData?: {
    awbs?: string[];
    startDate?: string;
    endDate?: string;
    userId?: string;
  };
}

export function initBillingQueue(fastify: FastifyInstance, billingService: BillingService) {
  const queue = new Queue(QueueNames.BILLING_AUTOMATION, {
    connection: fastify.redis,
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  // Log queue status for debugging
  fastify.log.info(`Initializing billing queue: ${QueueNames.BILLING_AUTOMATION}`);

  const worker = new Worker(
    QueueNames.BILLING_AUTOMATION,
    async (job: Job<BillingJobData>) => {
      const { name, data } = job;
      fastify.log.info(`Processing billing job: ${name}`, { jobId: job.id });
      console.log('Job data:', data, name);

      try {
        let result;
        switch (name) {
          case BillingJobType.AUTOMATE_BILLING:
            result = await handleAutomateBilling(fastify, billingService, job);
            break;
          
          case BillingJobType.RESOLVE_DISPUTES:
            result = await handleResolveDisputes(fastify, billingService, job);
            break;
          
          case BillingJobType.PROCESS_WEIGHT_CSV:
            fastify.log.info(`Starting weight CSV processing job: ${job.id}`);
            result = await handleProcessWeightCSV(fastify, billingService, job);
            break;
          
          case BillingJobType.MANUAL_BILLING:
            result = await handleManualBilling(fastify, billingService, job);
            break;
          
          default:
            throw new Error(`Unknown billing job type: ${name}`);
        }
        
        fastify.log.info(`Billing job ${name} processed successfully`, { jobId: job.id });
        return result;
      } catch (error) {
        fastify.log.error(`Billing job ${name} failed:`, error);
        throw error;
      }
    },
    {
      connection: fastify.redis,
      concurrency: 5,
      prefix: APP_CONFIG.REDIS.PREFIX,
      limiter: {
        max: 5, // Maximum number of jobs to process per time window
        duration: 1000, // Time window in ms (1 second)
      },
      // Custom backoff strategy for retries
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          const baseDelay = 5000; // 5 seconds
          const maxDelay = 300000; // 5 minutes
          // Exponential backoff with full jitter
          const expDelay = Math.min(maxDelay, baseDelay * Math.pow(2, attemptsMade));
          return Math.floor(Math.random() * expDelay);
        },
      },
      maxStalledCount: 2, // Consider a job stalled after 2 checks
      stalledInterval: 15000, // Check for stalled jobs every 15 seconds
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    fastify.log.info(`Billing job ${job.name} completed`, {
      jobId: job.id,
      data: job.returnvalue,
    });
  });

  worker.on('failed', (job, err) => {
    fastify.log.error(`Billing job ${job?.name} failed`, {
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    fastify.log.error('Billing worker error:', err);
  });

  // Log that the worker is ready
  fastify.log.info(`Billing worker initialized with concurrency: 5`);

  return { queue, worker };
}

async function handleAutomateBilling(
  fastify: FastifyInstance,
  billingService: BillingService,
  job: Job<BillingJobData>
) {
  fastify.log.info('Starting automated billing process');
  
  const result = await billingService.runAutomatedBilling();
  
  fastify.log.info(`Automated billing completed: ${result.processedUsers} users processed`);
  
  return {
    success: true,
    processedUsers: result.processedUsers,
    results: result.results,
    timestamp: new Date().toISOString(),
  };
}

async function handleResolveDisputes(
  fastify: FastifyInstance,
  billingService: BillingService,
  job: Job<BillingJobData>
) {
  fastify.log.info('Starting dispute resolution process');
  
  const result = await billingService.autoResolveExpiredDisputes();
  
  fastify.log.info(`Dispute resolution completed: ${result.resolved} disputes resolved`);
  
  return {
    success: true,
    resolved: result.resolved,
    errors: result.errors,
    timestamp: new Date().toISOString(),
  };
}

async function handleProcessWeightCSV(
  fastify: FastifyInstance,
  billingService: BillingService,
  job: Job<BillingJobData>
) {
  const { csvData, operationId } = job.data;
  
  fastify.log.info(`Weight CSV job started with operationId: ${operationId}`);
  
  if (!csvData || !operationId) {
    const error = 'CSV data and operation ID are required';
    fastify.log.error(error);
    throw new Error(error);
  }

  fastify.log.info(`Processing weight CSV with ${csvData.length} rows`);
  
  try {
    // Update operation status to processing
    await fastify.prisma.bulkOperation.update({
      where: { id: operationId },
      data: { status: 'PROCESSING' }
    });

    // Validate CSV data
    if (!Array.isArray(csvData)) {
      throw new Error('CSV data must be an array');
    }

    // Log sample data for debugging
    fastify.log.info(`Sample data: ${JSON.stringify(csvData.slice(0, 2))}`);

    // Process CSV data in batches to avoid memory issues
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < csvData.length; i += batchSize) {
      batches.push(csvData.slice(i, i + batchSize));
    }
    
    fastify.log.info(`Processing ${batches.length} batches of weight dispute data`);
    
    let totalProcessed = 0;
    let totalDisputes = 0;
    let totalErrors: any[] = [];
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      fastify.log.info(`Processing batch ${i + 1}/${batches.length}`);
      const batchData = batches[i];
      if (!batchData) continue;
      
      const batchResult = await billingService.processWeightDisputeCSV(batchData);
      totalProcessed += batchResult.processed;
      totalDisputes += batchResult.disputes;
      totalErrors = [...totalErrors, ...batchResult.errors];
      
      // Update progress
      await fastify.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processed_count: totalProcessed,
          success_count: totalDisputes,
          failed_count: totalErrors.length
        }
      });
    }

    // Update operation with final results
    await fastify.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: totalErrors.length === 0 ? 'COMPLETED' : 'COMPLETED_WITH_ERRORS',
        processed_count: totalProcessed,
        success_count: totalDisputes,
        failed_count: totalErrors.length,
        results: JSON.stringify({
          processed: totalProcessed,
          disputes: totalDisputes,
          errors: totalErrors.slice(0, 100) // Limit errors to avoid DB size issues
        })
      }
    });

    fastify.log.info(`Weight CSV processing completed: ${totalDisputes}/${totalProcessed} disputes created, ${totalErrors.length} errors`);
    
    return {
      success: true,
      processed: totalProcessed,
      disputes: totalDisputes,
      errors: totalErrors.length
    };
  } catch (error) {
    fastify.log.error(`Error processing weight CSV: ${error}`);
    
    // Update operation as failed
    await fastify.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    
    throw error;
  }
}

async function handleManualBilling(
  fastify: FastifyInstance,
  billingService: BillingService,
  job: Job<BillingJobData>
) {
  const { manualBillingData } = job.data;
  
  if (!manualBillingData) {
    throw new Error('Manual billing data is required');
  }

  fastify.log.info('Starting manual billing process', manualBillingData);
  
  const result = await billingService.generateManualBilling(manualBillingData);
  
  fastify.log.info(`Manual billing completed: ${result.processedOrders} orders processed`);
  
  return {
    success: result.success,
    billingCycleId: result.billingCycleId,
    processedOrders: result.processedOrders,
    totalAmount: result.totalAmount,
    errors: result.errors,
  };
} 