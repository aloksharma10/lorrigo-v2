import { Queue, Worker, QueueEvents, Job, JobsOptions } from 'bullmq';
import { APP_CONFIG } from '@/config/app';
import { redis } from './redis';
import { FastifyInstance } from 'fastify';

// Define queue names
export enum QueueNames {
  SHIPMENT_TRACKING = 'shipment-tracking',
  NOTIFICATION = 'notification',
  BULK_OPERATION = 'bulk-operation',
  REPORT_GENERATION = 'report-generation',
  REMITTANCE_PROCESSING = 'remittance-processing',
  NDR_PROCESSING = 'ndr-processing',
}

// Queue connection options
const connectionOptions = {
  connection: redis,
  prefix: APP_CONFIG.REDIS.PREFIX,
};

// Queue configuration with default settings
const queueConfig = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000, // Keep last 1000 failed jobs
  },
};

// Create queues
export const queues = {
  [QueueNames.SHIPMENT_TRACKING]: new Queue(QueueNames.SHIPMENT_TRACKING, {
    ...connectionOptions,
    defaultJobOptions: {
      ...queueConfig.defaultJobOptions,
      // Tracking jobs should be processed in order
      lifo: false,
    },
  }),
  [QueueNames.NOTIFICATION]: new Queue(QueueNames.NOTIFICATION, {
    ...connectionOptions,
    defaultJobOptions: {
      ...queueConfig.defaultJobOptions,
      // Notifications should be processed quickly
      priority: 2,
    },
  }),
  [QueueNames.BULK_OPERATION]: new Queue(QueueNames.BULK_OPERATION, {
    ...connectionOptions,
    defaultJobOptions: {
      ...queueConfig.defaultJobOptions,
      // Bulk operations can take longer
      attempts: 5,
    },
  }),
  [QueueNames.REPORT_GENERATION]: new Queue(QueueNames.REPORT_GENERATION, {
    ...connectionOptions,
    defaultJobOptions: {
      ...queueConfig.defaultJobOptions,
      // Reports are less critical
      priority: 3,
    },
  }),
  [QueueNames.REMITTANCE_PROCESSING]: new Queue(QueueNames.REMITTANCE_PROCESSING, {
    ...connectionOptions,
    defaultJobOptions: {
      ...queueConfig.defaultJobOptions,
      // Financial operations need more retries
      attempts: 5,
    },
  }),
  [QueueNames.NDR_PROCESSING]: new Queue(QueueNames.NDR_PROCESSING, {
    ...connectionOptions,
    defaultJobOptions: {
      ...queueConfig.defaultJobOptions,
      // NDR actions should be processed with high priority and retries
      priority: 1,
      attempts: 3,
    },
  }),
};

// Set up repeatable jobs schedulers (using the same Queue instances)
export const setupSchedulers = async (): Promise<void> => {
  // We're using the same Queue instances for scheduling
  console.log('Setting up job schedulers');
  
  try {
    // Clean up any orphaned repeat jobs
    await cleanupOrphanedRepeatJobs();
    
    // Additional safety: pause all queues briefly during cleanup
    for (const queueName of Object.values(QueueNames)) {
      await queues[queueName].pause();
    }
    
    // Give Redis time to process any pending operations
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Resume all queues
    for (const queueName of Object.values(QueueNames)) {
      await queues[queueName].resume();
    }
    
    console.log('Job schedulers setup complete');
  } catch (error) {
    console.error('Error setting up job schedulers:', error);
  }
};

/**
 * Clean up orphaned repeat jobs that might cause the "Missing key for job repeat" error
 */
export const cleanupOrphanedRepeatJobs = async (): Promise<void> => {
  console.log('Cleaning up orphaned repeat jobs');
  
  try {
    const prefix = APP_CONFIG.REDIS.PREFIX || '';
    
    // Get all repeat job keys
    const repeatKeys = await redis.keys(`${prefix}:repeat:*`);
    
    for (const key of repeatKeys) {
      const parts = key.split(':');
      const jobId = parts[parts.length - 1];
      
      // For each repeat key, check if the corresponding job exists
      for (const queueName of Object.values(QueueNames)) {
        const jobKey = `${prefix}:${queueName}:${jobId}`;
        const exists = await redis.exists(jobKey);
        
        if (!exists) {
          // If job doesn't exist, check if there's a corresponding repeat job key
          const repeatJobKey = `${prefix}:repeat:${queueName}:${jobId}`;
          const repeatExists = await redis.exists(repeatJobKey);
          
          if (repeatExists) {
            // Remove the orphaned repeat job key
            console.log(`Removing orphaned repeat job key: ${repeatJobKey}`);
            await redis.del(repeatJobKey);
          }
        }
      }
    }
    
    // Also check for orphaned repeat job hashes
    const repeatJobHashes = await redis.keys(`${prefix}:*:repeat:*`);
    for (const hashKey of repeatJobHashes) {
      const exists = await redis.exists(hashKey);
      if (exists) {
        const jobId = hashKey.split(':').pop();
        if (jobId) {
          const jobExists = await redis.exists(`${prefix}:${jobId}`);
          if (!jobExists) {
            console.log(`Removing orphaned repeat job hash: ${hashKey}`);
            await redis.del(hashKey);
          }
        }
      }
    }
    
    console.log('Orphaned repeat jobs cleanup completed');
  } catch (error) {
    console.error('Error cleaning up orphaned repeat jobs:', error);
  }
};

/**
 * Helper function to add a job to a queue with optimized options
 * @param queueName Queue name from QueueNames enum
 * @param jobName Name of the job
 * @param data Job data
 * @param options Job options
 * @returns Promise resolving to the created job
 */
export const addJob = async (
  queueName: QueueNames,
  jobName: string,
  data: unknown,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
    repeat?: {
      pattern?: string;
      every?: number;
      limit?: number;
      immediately?: boolean;
    };
    jobId?: string;
  }
): Promise<Job> => {
  // Generate a unique job ID if not provided
  const jobId = options?.jobId || `${jobName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Merge options with defaults
  const jobOptions: JobsOptions = {
    delay: options?.delay,
    priority: options?.priority,
    attempts: options?.attempts,
    repeat: options?.repeat,
    jobId,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  };

  return await queues[queueName].add(jobName, data, jobOptions);
};

/**
 * Add a recurring job to a queue
 * @param queueName Queue name from QueueNames enum
 * @param jobName Name of the job
 * @param data Job data
 * @param cronPattern Cron pattern for job scheduling
 * @param options Additional job options
 * @returns Promise resolving to the created job
 */
export const addRecurringJob = async (
  queueName: QueueNames,
  jobName: string,
  data: unknown,
  cronPattern: string,
  options?: {
    priority?: number;
    attempts?: number;
    jobId?: string;
  }
): Promise<Job> => {
  try {
    // Generate a stable job ID for recurring jobs to prevent duplicates
    const stableJobId = options?.jobId || `${jobName}-recurring-${cronPattern.replace(/\s+/g, '-')}`;
    
    // First, check if this recurring job already exists
    const existingJobs = await queues[queueName].getJobSchedulers();
    const existingJob = existingJobs.find(job => 
      job.id === stableJobId || 
      (job.name === jobName && job.pattern === cronPattern)
    );
    
    // If it exists, remove it first to prevent orphaned keys
    if (existingJob) {
      console.log(`Removing existing recurring job: ${existingJob.key}`);
      await queues[queueName].removeJobScheduler(existingJob.key);
      
      // Give Redis a moment to process the deletion
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Now add the new recurring job with a stable ID
    return addJob(queueName, jobName, data, {
      ...options,
      jobId: stableJobId,
      repeat: {
        pattern: cronPattern,
        immediately: true,
      },
    });
  } catch (error) {
    console.error(`Error adding recurring job ${jobName} to ${queueName}:`, error);
    throw error;
  }
};

/**
 * Add a periodic job to run every X milliseconds
 * @param queueName Queue name from QueueNames enum
 * @param jobName Name of the job
 * @param data Job data
 * @param intervalMs Interval in milliseconds
 * @param options Additional job options
 * @returns Promise resolving to the created job
 */
export const addPeriodicJob = async (
  queueName: QueueNames,
  jobName: string,
  data: unknown,
  intervalMs: number,
  options?: {
    priority?: number;
    attempts?: number;
    jobId?: string;
  }
): Promise<Job> => {
  return addJob(queueName, jobName, data, {
    ...options,
    repeat: {
      every: intervalMs,
      immediately: true,
    },
  });
};

/**
 * Initialize queue monitoring events
 * @param fastify Fastify instance for logging
 * @param queueName Queue name to monitor
 * @returns QueueEvents instance
 */
export const initQueueEvents = (fastify: FastifyInstance, queueName: QueueNames): QueueEvents => {
  const queueEvents = new QueueEvents(queueName, connectionOptions);

  queueEvents.on('waiting', ({ jobId }) => {
    fastify.log.debug(`Job ${jobId} is waiting in ${queueName} queue`);
  });

  queueEvents.on('active', ({ jobId, prev }) => {
    fastify.log.debug(`Job ${jobId} is active in ${queueName} queue (prev state: ${prev})`);
  });

  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    fastify.log.info(`Job ${jobId} completed in ${queueName} queue`);
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    fastify.log.error(`Job ${jobId} failed in ${queueName} queue: ${failedReason}`);
  });

  queueEvents.on('stalled', ({ jobId }) => {
    fastify.log.warn(`Job ${jobId} stalled in ${queueName} queue`);
  });

  return queueEvents;
};

/**
 * Gracefully shut down all queues and workers
 */
export const closeQueues = async (): Promise<void> => {
  for (const queue of Object.values(queues)) {
    await queue.close();
  }
};

// Export queue-related functions and types
export { Queue, Worker, QueueEvents, Job };
