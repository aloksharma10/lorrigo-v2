import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ShopifySyncService } from '../services/shopify/shopify-sync-service';
import { queueManualSync, getSyncStatus } from '../queues/shopifySyncQueue';
import { captureException } from '@/lib/sentry';

interface SyncOrdersRequest {
  params?: Record<string, string | number>;
}

interface SyncOrdersParams {
  userId: string;
}

/**
 * Shopify Sync Controller
 * Handles manual sync operations and status checks
 */
export class ShopifySyncController {
  private fastify: FastifyInstance;
  private syncService: ShopifySyncService;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.syncService = new ShopifySyncService(fastify);
  }

  /**
   * Manual sync orders for a user
   */
  async syncOrders(request: FastifyRequest<{ Params: SyncOrdersParams; Body: SyncOrdersRequest }>, reply: FastifyReply) {
    try {
      const { userId } = request.params;
      const { params = {} } = request.body;

      // Validate user exists and has Shopify connection
      const user = await this.fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          shopify_connection: true,
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
        });
      }

      if (!user.shopify_connection) {
        return reply.status(400).send({
          success: false,
          message: 'No Shopify connection found for this user',
        });
      }

      // Queue manual sync
      const jobId = await queueManualSync(userId, params);

      this.fastify.log.info('Manual Shopify sync queued', { userId, jobId, params });

      return reply.send({
        success: true,
        message: 'Manual sync queued successfully. You will see Shopify orders on your panel shortly.',
        data: { jobId },
      });
    } catch (error) {
      this.fastify.log.error('Error queuing manual sync:', error);
      captureException(error as Error);

      return reply.status(500).send({
        success: false,
        message: 'Failed to queue manual sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get sync status for a user
   */
  async getSyncStatus(request: FastifyRequest<{ Params: SyncOrdersParams }>, reply: FastifyReply) {
    try {
      const { userId } = request.params;

      // Validate user exists
      const user = await this.fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          shopify_connection: true,
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
        });
      }

      // Get sync status
      const syncStatus = await getSyncStatus(userId, this.fastify);

      // Get recent orders count
      const recentOrders = await this.fastify.prisma.order.findMany({
        where: {
          user_id: userId,
          order_channel_config: {
            channel: 'SHOPIFY',
          },
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        take: 10,
        select: {
          id: true,
          order_number: true,
          created_at: true,
          order_channel_config: {
            select: {
              channel_order_id: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        data: {
          syncStatus,
          recentOrders: recentOrders.length,
          hasShopifyConnection: user.shopify_connection ? true : false,
          lastSyncTime: syncStatus.lastSyncTime,
          failedOrdersCount: syncStatus.failedOrdersCount,
        },
      });
    } catch (error) {
      this.fastify.log.error('Error getting sync status:', error);
      captureException(error as Error);

      return reply.status(500).send({
        success: false,
        message: 'Failed to get sync status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Retry failed orders for a user
   */
  async retryFailedOrders(request: FastifyRequest<{ Params: SyncOrdersParams }>, reply: FastifyReply) {
    try {
      const { userId } = request.params;

      // Validate user exists and has Shopify connection
      const user = await this.fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          shopify_connection: true,
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
        });
      }

      if (!user.shopify_connection) {
        return reply.status(400).send({
          success: false,
          message: 'No Shopify connection found for this user',
        });
      }

      // Queue retry job
      const { addJob, QueueNames } = await import('@/lib/queue');
      const job = await addJob(
        QueueNames.SHOPIFY_SYNC,
        'retry-failed-orders',
        {
          userId,
          shop: user.shopify_connection.shop,
          syncType: 'manual',
        },
        { priority: 1 }
      );

      this.fastify.log.info('Retry failed orders queued', { userId, jobId: job.id });

      return reply.send({
        success: true,
        message: 'Retry job queued successfully',
        data: { jobId: job.id },
      });
    } catch (error) {
      this.fastify.log.error('Error queuing retry job:', error);
      captureException(error as Error);

      return reply.status(500).send({
        success: false,
        message: 'Failed to queue retry job',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
