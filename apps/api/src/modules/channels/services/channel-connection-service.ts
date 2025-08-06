import { prisma } from '@lorrigo/db';

// Define Channel enum since we can't import it directly
export enum Channel {
  CUSTOM = 'CUSTOM',
  WEBSITE = 'WEBSITE',
  WHATSAPP = 'WHATSAPP',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  EMAIL = 'EMAIL',
  SHOPIFY = 'SHOPIFY',
}

/**
 * Interface for channel connection data
 */
export interface ChannelConnection {
  id?: string;
  shop?: string;
  access_token: string;
  scope?: string;
  user_id: string;
  channel: Channel;
  connected_at?: Date;
  updated_at?: Date;
}

/**
 * Service for managing channel connections
 */
export class ChannelConnectionService {
  /**
   * Save a channel connection to the database
   * @param connection Connection details
   * @returns Saved connection
   */
  async saveConnection(connection: ChannelConnection): Promise<ChannelConnection> {
    try {
      // Handle different channel types
      switch (connection.channel) {
        case Channel.SHOPIFY:
          return await this.saveShopifyConnection(connection);
        default:
          throw new Error(`Unsupported channel type: ${connection.channel}`);
      }
    } catch (error) {
      console.error(`Error saving ${connection.channel} connection:`, error);
      throw new Error(`Failed to save ${connection.channel} connection`);
    }
  }

  /**
   * Get a channel connection by user ID and channel type
   * @param userId User ID
   * @param channel Channel type
   * @returns Connection details or null if not found
   */
  async getConnectionByUserIdAndChannel(userId: string, channel: Channel): Promise<ChannelConnection | null> {
    try {
      switch (channel) {
        case Channel.SHOPIFY:
          return await this.getShopifyConnection(userId);
        default:
          throw new Error(`Unsupported channel type: ${channel}`);
      }
    } catch (error) {
      console.error(`Error fetching ${channel} connection:`, error);
      return null;
    }
  }

  /**
   * Get a channel connection by shop domain
   * @param userId User ID
   * @param shop Shop domain
   * @param channel Channel type
   * @returns Connection details or null if not found
   */
  async getConnectionByShop(userId: string, shop: string, channel: Channel): Promise<ChannelConnection | null> {
    try {
      switch (channel) {
        case Channel.SHOPIFY:
          return await this.getShopifyConnectionByShop(userId, shop);
        default:
          throw new Error(`Unsupported channel type: ${channel}`);
      }
    } catch (error) {
      console.error(`Error fetching ${channel} connection for shop ${shop}:`, error);
      return null;
    }
  }

  /**
   * Delete a channel connection
   * @param userId User ID
   * @param channel Channel type
   * @returns True if successful, false otherwise
   */
  async deleteConnection(userId: string, channel: Channel): Promise<boolean> {
    try {
      switch (channel) {
        case Channel.SHOPIFY:
          return await this.deleteShopifyConnection(userId);
        default:
          throw new Error(`Unsupported channel type: ${channel}`);
      }
    } catch (error) {
      console.error(`Error deleting ${channel} connection:`, error);
      return false;
    }
  }

  /**
   * Get all connections for a specific channel
   * @param channel Channel type
   * @returns Array of connections
   */
  async getAllConnectionsByChannel(channel: Channel): Promise<ChannelConnection[]> {
    try {
      switch (channel) {
        case Channel.SHOPIFY:
          return await this.getAllShopifyConnections();
        default:
          throw new Error(`Unsupported channel type: ${channel}`);
      }
    } catch (error) {
      console.error(`Error fetching all ${channel} connections:`, error);
      return [];
    }
  }

  /**
   * Save a Shopify connection
   * @param connection Connection details
   * @returns Saved connection
   */
  private async saveShopifyConnection(connection: ChannelConnection): Promise<ChannelConnection> {
    // Check if a connection already exists for this user
    const existingConnection = await prisma.shopifyConnection.findUnique({
      where: {
        user_id: connection.user_id,
      },
    });

    if (existingConnection) {
      // Update existing connection
      const updated = await prisma.shopifyConnection.update({
        where: {
          user_id: connection.user_id,
        },
        data: {
          shop: connection.shop || '',
          access_token: connection.access_token,
          scope: connection.scope || '',
          updated_at: new Date(),
        },
      });

      return {
        id: updated.id,
        shop: updated.shop,
        access_token: updated.access_token,
        scope: updated.scope,
        user_id: updated.user_id,
        channel: Channel.SHOPIFY,
        connected_at: updated.connected_at,
        updated_at: updated.updated_at,
      };
    } else {
      // Create new connection
      const created = await prisma.shopifyConnection.create({
        data: {
          shop: connection.shop || '',
          access_token: connection.access_token,
          scope: connection.scope || '',
          user_id: connection.user_id,
        },
      });

      return {
        id: created.id,
        shop: created.shop,
        access_token: created.access_token,
        scope: created.scope,
        user_id: created.user_id,
        channel: Channel.SHOPIFY,
        connected_at: created.connected_at,
        updated_at: created.updated_at,
      };
    }
  }

  /**
   * Get a Shopify connection by user ID
   * @param userId User ID
   * @returns Connection details or null if not found
   */
  private async getShopifyConnection(userId: string): Promise<ChannelConnection | null> {
    const connection = await prisma.shopifyConnection.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!connection) {
      return null;
    }

    return {
      id: connection.id,
      shop: connection.shop,
      access_token: connection.access_token,
      scope: connection.scope,
      user_id: connection.user_id,
      channel: Channel.SHOPIFY,
      connected_at: connection.connected_at,
      updated_at: connection.updated_at,
    };
  }

  /**
   * Get a Shopify connection by shop domain
   * @param userId User ID
   * @param shop Shop domain
   * @returns Connection details or null if not found
   */
  private async getShopifyConnectionByShop(userId: string, shop: string): Promise<ChannelConnection | null> {
    const connection = await prisma.shopifyConnection.findFirst({
      where: {
        user_id: userId,
        shop: shop,
      },
    });

    if (!connection) {
      return null;
    }

    return {
      id: connection.id,
      shop: connection.shop,
      access_token: connection.access_token,
      scope: connection.scope,
      user_id: connection.user_id,
      channel: Channel.SHOPIFY,
      connected_at: connection.connected_at,
      updated_at: connection.updated_at,
    };
  }

  /**
   * Delete a Shopify connection
   * @param userId User ID
   * @returns True if successful, false otherwise
   */
  private async deleteShopifyConnection(userId: string): Promise<boolean> {
    try {
      const result = await prisma.shopifyConnection.deleteMany({
        where: { user_id: userId },
      });

      return result.count > 0;
    } catch (error) {
      console.error('Error deleting Shopify connection:', error);
      return false;
    }
  }

  /**
   * Get all Shopify connections
   * @returns Array of Shopify connections
   */
  private async getAllShopifyConnections(): Promise<ChannelConnection[]> {
    try {
      const connections = await prisma.shopifyConnection.findMany({
        where: {
          // You might want to add additional filters here
          // For example, only active connections
        },
        select: {
          id: true,
          shop: true,
          access_token: true,
          scope: true,
          user_id: true,
          connected_at: true,
          updated_at: true,
        },
      });

      return connections.map(conn => ({
        ...conn,
        channel: Channel.SHOPIFY,
      }));
    } catch (error) {
      console.error('Error fetching all Shopify connections:', error);
      return [];
    }
  }
}
