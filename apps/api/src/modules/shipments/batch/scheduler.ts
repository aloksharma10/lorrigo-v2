import { FastifyInstance } from 'fastify';
import { ShipmentService } from '../services/shipmentService';
import { processShipmentTracking, TrackingProcessorConfig } from './processor';
import { addRecurringJob, addJob, QueueNames } from '@/lib/queue';
import { JobType } from '../queues/shipmentQueue';

/**
 * Scheduler configuration
 */
export interface TrackingSchedulerConfig {
  // How often to run the tracking job (in minutes)
  intervalMinutes: number;
  // Whether to use cron pattern instead of interval
  useCron: boolean;
  // Cron pattern for tracking job (if useCron is true)
  cronPattern: string;
  // Processor configuration
  processor: Partial<TrackingProcessorConfig>;
}

/**
 * Default scheduler configuration
 */
const DEFAULT_CONFIG: TrackingSchedulerConfig = {
  intervalMinutes: 15,
  useCron: true, // Use cron for more reliable scheduling
  cronPattern: '*/15 * * * *', // Every 15 minutes
  processor: {
    batchSize: 50,
    concurrency: 5,
    cacheExpiry: 3600, // 1 hour cache for tracking results
    maxRetries: 3,
    retryDelay: 60000, // 1 minute between retries
    rtoProcessingEnabled: true,
    updateFrequency: {
      inTransit: 4,      // Check in-transit shipments every 4 hours
      delivered: 24,     // Check delivered shipments once a day
      rto: 12           // Check RTO shipments every 12 hours
    }
  },
};

/**
 * Initialize the shipment tracking scheduler
 * @param fastify Fastify instance
 * @param shipmentService Shipment service instance
 * @param config Scheduler configuration
 */
export async function initTrackingScheduler(
  fastify: FastifyInstance,
  shipmentService: ShipmentService,
  config: Partial<TrackingSchedulerConfig> = {}
): Promise<void> {
  // Merge default config with provided config
  const schedulerConfig: TrackingSchedulerConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    processor: {
      ...DEFAULT_CONFIG.processor,
      ...(config.processor || {}),
    },
  };

  fastify.log.info('Initializing shipment tracking scheduler');

  try {
    // Schedule recurring job based on configuration
    if (schedulerConfig.useCron) {
      // Use cron pattern
      await addRecurringJob(
        QueueNames.SHIPMENT_TRACKING,
        JobType.TRACK_SHIPMENTS,
        {
          batchSize: schedulerConfig.processor.batchSize,
          config: schedulerConfig.processor,
        },
        schedulerConfig.cronPattern
      );

      fastify.log.info(`Scheduled shipment tracking job with cron pattern: ${schedulerConfig.cronPattern}`);
    } else {
      // Use interval
      // Schedule first job immediately
      await addJob(
        QueueNames.SHIPMENT_TRACKING,
        JobType.TRACK_SHIPMENTS,
        {
          batchSize: schedulerConfig.processor.batchSize,
          config: schedulerConfig.processor,
        }
      );

      fastify.log.info(`Scheduled initial shipment tracking job, will repeat every ${schedulerConfig.intervalMinutes} minutes`);
    }

    // Set up RTO processing if enabled
    if (schedulerConfig.processor.rtoProcessingEnabled) {
      // Schedule RTO processing job daily
      await addRecurringJob(
        QueueNames.SHIPMENT_TRACKING,
        JobType.PROCESS_RTO,
        {
          batchSize: 100,
        },
        '0 0 * * *' // Run at midnight every day
      );

      fastify.log.info('Scheduled daily RTO processing job');
    }
  } catch (error) {
    fastify.log.error(`Error initializing tracking scheduler: ${error}`);
    throw error;
  }
}

/**
 * Schedule a tracking job for a specific shipment
 * @param fastify Fastify instance
 * @param shipmentId Shipment ID
 * @param delayMs Delay in milliseconds before running the job
 */
export async function scheduleShipmentTracking(
  fastify: FastifyInstance,
  shipmentId: string,
  delayMs: number = 0
): Promise<void> {
  try {
    await addJob(
      QueueNames.SHIPMENT_TRACKING,
      JobType.RETRY_TRACK_SHIPMENT,
      {
        shipmentId,
      },
      {
        delay: delayMs,
      }
    );

    fastify.log.info(`Scheduled tracking job for shipment ${shipmentId} with delay ${delayMs}ms`);
  } catch (error) {
    fastify.log.error(`Error scheduling tracking job for shipment ${shipmentId}: ${error}`);
    throw error;
  }
}

/**
 * Schedule RTO charges processing for a specific shipment
 * @param fastify Fastify instance
 * @param shipmentId Shipment ID
 * @param orderId Order ID
 * @param delayMs Delay in milliseconds before running the job
 */
export async function scheduleRtoChargesProcessing(
  fastify: FastifyInstance,
  shipmentId: string,
  orderId: string,
  delayMs: number = 0
): Promise<void> {
  try {
    await addJob(
      QueueNames.SHIPMENT_TRACKING,
      JobType.PROCESS_RTO_CHARGES,
      {
        shipmentId,
        orderId,
      },
      {
        delay: delayMs,
      }
    );

    fastify.log.info(`Scheduled RTO charges processing for shipment ${shipmentId} with delay ${delayMs}ms`);
  } catch (error) {
    fastify.log.error(`Error scheduling RTO charges processing for shipment ${shipmentId}: ${error}`);
    throw error;
  }
} 