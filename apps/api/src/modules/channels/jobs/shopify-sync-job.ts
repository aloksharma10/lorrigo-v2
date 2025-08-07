import { FastifyInstance } from 'fastify';
import { ShopifySyncService } from '../services/shopify/shopify-sync-service';
import { ChannelConnectionService } from '../services/channel-connection-service';
import { captureException } from '@/lib/sentry';
import { Channel } from '@lorrigo/db';

export class ShopifySyncJob {
  private fastify: FastifyInstance;
  private syncService: ShopifySyncService;
  private connectionService: ChannelConnectionService;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.syncService = new ShopifySyncService(fastify);
    this.connectionService = new ChannelConnectionService();
  }

  /**
   * Run the Shopify sync job
   * This job syncs orders from Shopify for all connected users
   */
  public async run(): Promise<void> {
    try {
      console.log('Starting Shopify sync job...');

      // Get all users with active Shopify connections
      const connections = await this.connectionService.getAllConnectionsByChannel(Channel.SHOPIFY);

      if (!connections || connections.length === 0) {
        console.log('No active Shopify connections found');
        return;
      }

      console.log(`Found ${connections.length} active Shopify connections`);

      let totalSynced = 0;
      let totalErrors = 0;

      // Process each connection
      for (const connection of connections) {
        try {
          // Sync orders for this user
          const syncResult = await this.syncService.syncOrdersFromShopify(connection.user_id, {
            // Sync orders from the last 24 hours
            created_at_min: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            limit: 50, // Limit to 50 orders per sync to avoid rate limits
          });

          if (syncResult.success) {
            totalSynced += syncResult.data?.synced || 0;
            console.log(`Successfully synced ${syncResult.data?.synced || 0} orders for user ${connection.user_id}`);
          } else {
            totalErrors++;
            console.error(`Failed to sync orders for user ${connection.user_id}: ${syncResult.error}`);
          }

          // Add a small delay between users to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          totalErrors++;
          console.error(`Error syncing orders for user ${connection.user_id}:`, error);
          captureException(error as Error);
        }
      }

      console.log(`Shopify sync job completed. Total synced: ${totalSynced}, Errors: ${totalErrors}`);
    } catch (error) {
      console.error('Error running Shopify sync job:', error);
      captureException(error as Error);
    }
  }

  /**
   * Sync orders for a specific user
   * @param userId User ID
   * @param params Query parameters
   */
  public async syncForUser(userId: string, params: Record<string, string | number> = {}): Promise<void> {
    try {
      console.log(`Syncing Shopify orders for user ${userId}...`);

      const syncResult = await this.syncService.syncOrdersFromShopify(userId, params);

      if (syncResult.success) {
        console.log(`Successfully synced ${syncResult.data?.synced || 0} orders for user ${userId}`);
      } else {
        console.error(`Failed to sync orders for user ${userId}: ${syncResult.error}`);
      }
    } catch (error) {
      console.error(`Error syncing orders for user ${userId}:`, error);
      captureException(error as Error);
    }
  }
}
