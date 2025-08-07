import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { QueueNames, addJob, addRecurringJob } from '@/lib/queue';
import { ShopifySyncService } from '../services/shopify/shopify-sync-service';
import { ChannelConnectionService } from '../services/channel-connection-service';
import { captureException } from '@/lib/sentry';
import { APP_CONFIG } from '@/config/app';
import { Channel } from '@lorrigo/db';
import { ShopifyChannel } from '../services/shopify/shopify-channel';

/**
 * Shopify sync job types
 */
export enum ShopifySyncJobType {
  SYNC_ORDERS = 'sync-orders',
  SYNC_ORDERS_BATCH = 'sync-orders-batch',
  PROCESS_ORDER = 'process-order',
  SCHEDULED_SYNC = 'scheduled-sync',
  MANUAL_SYNC = 'manual-sync',
  RETRY_FAILED_ORDERS = 'retry-failed-orders',
}

/**
 * Job data interfaces
 */
interface ShopifySyncJobData {
  userId: string;
  shop?: string;
  params?: Record<string, string | number>;
  orderIds?: string[];
  batchSize?: number;
  syncType?: 'manual' | 'scheduled' | 'webhook';
  lastSyncTime?: string;
  retryCount?: number;
}

interface ShopifyOrderBatchData {
  orders: any[];
  userId: string;
  shop: string;
  batchIndex: number;
  totalBatches: number;
}

interface ShopifyOrderProcessData {
  order: any;
  userId: string;
  shop: string;
  retryCount?: number;
}

/**
 * Initialize Shopify sync queue with worker
 * @param fastify Fastify instance
 * @param shopifySyncService Shopify sync service instance
 */
export function initShopifySyncQueue(fastify: FastifyInstance, shopifySyncService: ShopifySyncService) {
  const connectionService = new ChannelConnectionService();

  // Create worker with concurrency control
  const worker = new Worker(
    QueueNames.SHOPIFY_SYNC,
    async (job: Job) => {
      const { name, data } = job;
      fastify.log.info(`Processing Shopify sync job: ${name}`, { jobId: job.id, userId: data.userId });

      try {
        switch (name) {
          case ShopifySyncJobType.SYNC_ORDERS:
            return await processSyncOrders(job, fastify, shopifySyncService, connectionService);

          case ShopifySyncJobType.SYNC_ORDERS_BATCH:
            return await processSyncOrdersBatch(job, fastify, shopifySyncService);

          case ShopifySyncJobType.PROCESS_ORDER:
            return await processOrder(job, fastify, shopifySyncService);

          case ShopifySyncJobType.SCHEDULED_SYNC:
            return await processScheduledSync(job, fastify, shopifySyncService, connectionService);

          case ShopifySyncJobType.MANUAL_SYNC:
            return await processManualSync(job, fastify, shopifySyncService, connectionService);

          case ShopifySyncJobType.RETRY_FAILED_ORDERS:
            return await processRetryFailedOrders(job, fastify, shopifySyncService, connectionService);

          default:
            throw new Error(`Unknown job type: ${name}`);
        }
      } catch (error) {
        fastify.log.error(`Error processing Shopify sync job ${name}:`, error);
        captureException(error as Error);
        throw error;
      }
    },
    {
      connection: {
        host: APP_CONFIG.REDIS.HOST,
        port: APP_CONFIG.REDIS.PORT,
        password: APP_CONFIG.REDIS.PASSWORD,
      },
      prefix: APP_CONFIG.REDIS.PREFIX,
      concurrency: 3, // Process 3 jobs simultaneously
      limiter: {
        max: 10, // Max 10 jobs per time window
        duration: 1000, // 1 second window
      },
    }
  );

  // Set up event handlers
  setupEventHandlers(worker, fastify);

  // Set up automatic scheduling for all Shopify users
  setupAutomaticScheduling(fastify, shopifySyncService, connectionService);

  // Graceful shutdown
  const gracefulShutdown = async () => {
    fastify.log.info('Shutting down Shopify sync queue...');
    await worker.close();
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return worker;
}

/**
 * Set up worker event handlers
 */
function setupEventHandlers(worker: Worker, fastify: FastifyInstance) {
  worker.on('completed', (job) => {
    fastify.log.info(`Shopify sync job completed: ${job.name}`, { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    fastify.log.error(`Shopify sync job failed: ${job?.name}`, {
      jobId: job?.id,
      error: err.message,
      stack: err.stack,
    });
    captureException(err);
  });

  worker.on('error', (err) => {
    fastify.log.error('Shopify sync worker error:', err);
    captureException(err);
  });
}

/**
 * Set up automatic scheduling for all Shopify users
 */
async function setupAutomaticScheduling(fastify: FastifyInstance, shopifySyncService: ShopifySyncService, connectionService: ChannelConnectionService) {
  try {
    // Add recurring job to sync all Shopify users every 10 minutes
    await addRecurringJob(
      QueueNames.SHOPIFY_SYNC,
      ShopifySyncJobType.SCHEDULED_SYNC,
      { syncType: 'scheduled' },
      '*/10 * * * *', // Every 10 minutes
      { priority: 2 }
    );

    fastify.log.info('Shopify automatic sync scheduling set up successfully');
  } catch (error) {
    fastify.log.error('Failed to set up Shopify automatic sync scheduling:', error);
    captureException(error as Error);
  }
}

/**
 * Process scheduled sync for all Shopify users
 */
async function processScheduledSync(
  job: Job<ShopifySyncJobData>,
  fastify: FastifyInstance,
  shopifySyncService: ShopifySyncService,
  connectionService: ChannelConnectionService
) {
  const { data } = job;

  try {
    // Get all active Shopify connections
    const connections = await fastify.prisma.shopifyConnection.findMany({
      where: {
        user: {
          is_active: true,
        },
      },
      include: {
        user: true,
      },
    });

    if (connections.length === 0) {
      return {
        success: true,
        message: 'No active Shopify connections found',
        processed: 0,
      };
    }

    let processed = 0;
    let errors = 0;

    // Process each connection with rate limiting
    for (const connection of connections) {
      try {
        // Queue individual sync for each user
        await addJob(
          QueueNames.SHOPIFY_SYNC,
          ShopifySyncJobType.SYNC_ORDERS,
          {
            userId: connection.user_id,
            shop: connection.shop,
            syncType: 'scheduled',
            params: {
              limit: 50, // Smaller batch for scheduled syncs
              status: 'any',
              created_at_min: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
            },
          },
          { priority: 2 }
        );
        processed++;
      } catch (error) {
        fastify.log.error(`Failed to queue sync for user ${connection.user_id}:`, error);
        errors++;
      }

      // Add delay between users to avoid overwhelming the system
      if (connections.indexOf(connection) < connections.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return {
      success: true,
      message: `Scheduled sync completed. Processed: ${processed}, Errors: ${errors}`,
      processed,
      errors,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process manual sync request
 */
async function processManualSync(
  job: Job<ShopifySyncJobData>,
  fastify: FastifyInstance,
  shopifySyncService: ShopifySyncService,
  connectionService: ChannelConnectionService
) {
  const { data } = job;

  try {
    // Queue the actual sync job
    await addJob(
      QueueNames.SHOPIFY_SYNC,
      ShopifySyncJobType.SYNC_ORDERS,
      {
        ...data,
        syncType: 'manual',
      },
      { priority: 1 }
    );

    return {
      success: true,
      message: 'Manual sync queued successfully',
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process sync orders job
 */
async function processSyncOrders(
  job: Job<ShopifySyncJobData>,
  fastify: FastifyInstance,
  shopifySyncService: ShopifySyncService,
  connectionService: ChannelConnectionService
) {
  const { data } = job;

  try {
    // Get Shopify connection
    const connection = await connectionService.getConnectionByUserIdAndChannel(data.userId, Channel.SHOPIFY);
    if (!connection || !connection.shop) {
      throw new Error('No active Shopify connection found');
    }

    const shopifyChannel = new ShopifyChannel(connection.shop, data.userId, fastify, connection.access_token);

    // Set default parameters
    const defaultParams: Record<string, string | number> = {
      limit: 250,
      status: 'any',
      ...data.params,
    };

    // If no date range specified, default to last 7 days
    if (!defaultParams.created_at_min && !defaultParams.created_at_max) {
      defaultParams.created_at_min = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      defaultParams.created_at_max = new Date().toISOString();
    }

    // Fetch orders from Shopify
    const orders = await shopifyChannel.getOrders(defaultParams);

    if (!orders || orders.length === 0) {
      return {
        success: true,
        message: 'No orders found to sync',
        synced: 0,
        skipped: 0,
        errors: 0,
      };
    }

    // Process orders in batches
    const batchSize = 50;
    const batches = chunkArray(orders, batchSize);

    let totalSynced = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Queue batch processing
      await addJob(
        QueueNames.SHOPIFY_SYNC,
        ShopifySyncJobType.SYNC_ORDERS_BATCH,
        {
          orders: batch,
          userId: data.userId,
          shop: connection.shop,
          batchIndex: i,
          totalBatches: batches.length,
        },
        { priority: 1 }
      );

      // Add delay between batches
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return {
      success: true,
      message: `Sync job queued. ${batches.length} batches created for ${orders.length} orders`,
      totalOrders: orders.length,
      totalBatches: batches.length,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process orders batch
 */
async function processSyncOrdersBatch(job: Job<ShopifyOrderBatchData>, fastify: FastifyInstance, shopifySyncService: ShopifySyncService) {
  const { data } = job;

  try {
    // Check for existing orders in bulk
    const orderIds = data.orders.map((order) => order.id.toString());
    const existingOrders = await fastify.prisma.order.findMany({
      where: {
        user_id: data.userId,
        order_channel_config: {
          channel: 'SHOPIFY',
          channel_order_id: { in: orderIds },
        },
      },
      select: {
        order_channel_config: {
          select: { channel_order_id: true },
        },
      },
    });

    const existingOrderIds = new Set(existingOrders.map((order) => order.order_channel_config.channel_order_id));

    // Process new orders only (never update existing ones)
    const newOrders = data.orders.filter((order) => !existingOrderIds.has(order.id.toString()));

    if (newOrders.length === 0) {
      return {
        success: true,
        message: 'No new orders in batch',
        synced: 0,
        skipped: data.orders.length,
        errors: 0,
      };
    }

    // Process orders in parallel with limited concurrency
    const concurrencyLimit = 5;
    const chunks = chunkArray(newOrders, concurrencyLimit);

    let synced = 0;
    let errors = 0;

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (order) => {
        try {
          // Queue individual order processing
          await addJob(
            QueueNames.SHOPIFY_SYNC,
            ShopifySyncJobType.PROCESS_ORDER,
            {
              order,
              userId: data.userId,
              shop: data.shop,
            },
            { priority: 1 }
          );
          return { action: 'queued', orderId: order.id };
        } catch (error) {
          return { action: 'error', orderId: order.id, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const chunkResults = await Promise.allSettled(chunkPromises);

      chunkResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.action === 'queued') {
            synced++;
          } else if (data.action === 'error') {
            errors++;
          }
        } else {
          errors++;
        }
      });

      // Small delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return {
      success: true,
      message: `Batch ${data.batchIndex + 1}/${data.totalBatches} processed`,
      synced,
      skipped: data.orders.length - newOrders.length,
      errors,
      total: data.orders.length,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process individual order
 */
async function processOrder(job: Job<ShopifyOrderProcessData>, fastify: FastifyInstance, shopifySyncService: ShopifySyncService) {
  const { data } = job;

  try {
    // Use the existing processShopifyOrder method
    const result = await shopifySyncService.processShopifyOrder(data.order, data.userId, data.shop);

    return {
      success: true,
      message: 'Order processed successfully',
      result,
    };
  } catch (error) {
    // If processing fails, add to retry queue
    const retryCount = (data.retryCount || 0) + 1;
    if (retryCount < 3) {
      await addJob(
        QueueNames.SHOPIFY_SYNC,
        ShopifySyncJobType.PROCESS_ORDER,
        {
          ...data,
          retryCount,
        },
        {
          delay: 30000 * retryCount, // Exponential delay: 30s, 60s, 90s
          priority: 1,
        }
      );
    }

    throw error;
  }
}

/**
 * Process retry failed orders
 */
async function processRetryFailedOrders(
  job: Job<ShopifySyncJobData>,
  fastify: FastifyInstance,
  shopifySyncService: ShopifySyncService,
  connectionService: ChannelConnectionService
) {
  const { data } = job;

  try {
    // Get failed orders from cache or database
    const failedOrdersKey = `shopify:failed_orders:${data.userId}`;
    const failedOrders = await fastify.redis.lrange(failedOrdersKey, 0, -1);

    if (failedOrders.length === 0) {
      return {
        success: true,
        message: 'No failed orders to retry',
        retried: 0,
      };
    }

    let retried = 0;
    for (const orderData of failedOrders) {
      try {
        const order = JSON.parse(orderData);
        await addJob(
          QueueNames.SHOPIFY_SYNC,
          ShopifySyncJobType.PROCESS_ORDER,
          {
            order,
            userId: data.userId,
            shop: data.shop,
            retryCount: 0,
          },
          { priority: 1 }
        );
        retried++;
      } catch (error) {
        fastify.log.error('Failed to retry order:', error);
      }
    }

    // Clear failed orders list
    await fastify.redis.del(failedOrdersKey);

    return {
      success: true,
      message: `Retried ${retried} failed orders`,
      retried,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Split array into chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Queue manual sync for a user
 */
export async function queueManualSync(userId: string, params?: Record<string, string | number>): Promise<string> {
  const job = await addJob(
    QueueNames.SHOPIFY_SYNC,
    ShopifySyncJobType.MANUAL_SYNC,
    {
      userId,
      params,
      syncType: 'manual',
    },
    { priority: 1 }
  );

  return job.id || '';
}

/**
 * Queue sync orders for a user
 */
export async function queueSyncOrders(userId: string, params?: Record<string, string | number>): Promise<string> {
  const job = await addJob(
    QueueNames.SHOPIFY_SYNC,
    ShopifySyncJobType.SYNC_ORDERS,
    {
      userId,
      params,
      syncType: 'manual',
    },
    { priority: 1 }
  );

  return job.id || '';
}

/**
 * Get sync status for a user
 */
export async function getSyncStatus(userId: string, fastify: FastifyInstance): Promise<any> {
  const lastSyncKey = `shopify:last_sync:${userId}`;
  const lastSyncTime = await fastify.redis.get(lastSyncKey);

  const failedOrdersKey = `shopify:failed_orders:${userId}`;
  const failedOrdersCount = await fastify.redis.llen(failedOrdersKey);

  return {
    lastSyncTime,
    failedOrdersCount,
    isActive: true,
  };
}
