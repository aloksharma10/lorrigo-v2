import { Queue, Worker, QueueEvents } from 'bullmq';
import { APP_CONFIG } from '@/config/app';
import { redis } from './redis';

// Define queue names
export enum QueueNames {
  SHIPMENT_TRACKING = 'shipment-tracking',
  NOTIFICATION = 'notification',
  BULK_OPERATION = 'bulk-operation',
  REPORT_GENERATION = 'report-generation',
  REMITTANCE_PROCESSING = 'remittance-processing',
}

// Queue connection options
const connectionOptions = {
  connection: redis,
  prefix: APP_CONFIG.REDIS.PREFIX,
};

// Create queues
export const queues = {
  [QueueNames.SHIPMENT_TRACKING]: new Queue(QueueNames.SHIPMENT_TRACKING, connectionOptions),
  [QueueNames.NOTIFICATION]: new Queue(QueueNames.NOTIFICATION, connectionOptions),
  [QueueNames.BULK_OPERATION]: new Queue(QueueNames.BULK_OPERATION, connectionOptions),
  [QueueNames.REPORT_GENERATION]: new Queue(QueueNames.REPORT_GENERATION, connectionOptions),
  [QueueNames.REMITTANCE_PROCESSING]: new Queue(
    QueueNames.REMITTANCE_PROCESSING,
    connectionOptions
  ),
};

// Helper function to add a job to a queue
export const addJob = async (
  queueName: QueueNames,
  jobName: string,
  data: unknown,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
) => {
  return await queues[queueName].add(jobName, data, {
    delay: options?.delay,
    priority: options?.priority,
    attempts: options?.attempts || 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000, // Keep last 1000 failed jobs
  });
};

// Export queue-related functions and types
export { Queue, Worker, QueueEvents };
