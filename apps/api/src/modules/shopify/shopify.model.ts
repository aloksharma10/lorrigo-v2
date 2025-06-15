import { prisma } from '@lorrigo/db';
import { ShopifyConnection } from './order';

/**
 * Save Shopify connection to database
 * @param connection Shopify connection details
 * @returns Saved connection
 */
export async function saveShopifyConnection(
  connection: ShopifyConnection
): Promise<ShopifyConnection> {
  try {
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
          shop: connection.shop,
          access_token: connection.access_token,
          scope: connection.scope,
          updated_at: new Date(),
        },
      });

      return {
        shop: updated.shop,
        access_token: updated.access_token,
        scope: updated.scope,
        user_id: updated.user_id,
      };
    } else {
      // Create new connection
      const created = await prisma.shopifyConnection.create({
        data: {
          shop: connection.shop,
          access_token: connection.access_token,
          scope: connection.scope,
          user_id: connection.user_id,
        },
      });

      return {
        shop: created.shop,
        access_token: created.access_token,
        scope: created.scope,
        user_id: created.user_id,
      };
    }
  } catch (error) {
    console.error('Error saving Shopify connection:', error);
    throw new Error('Failed to save Shopify connection');
  }
}

/**
 * Get Shopify connection for a user
 * @param userId User ID
 * @returns Shopify connection or null if not found
 */
export async function getUserShopifyConnection(userId: string): Promise<ShopifyConnection | null> {
  try {
    const connection = await prisma.shopifyConnection.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!connection) {
      return null;
    }

    return {
      shop: connection.shop,
      access_token: connection.access_token,
      scope: connection.scope,
      user_id: connection.user_id,
    };
  } catch (error) {
    console.error('Error fetching Shopify connection:', error);
    return null;
  }
}

/**
 * Get Shopify connection for a user by shop domain
 * @param userId User ID
 * @param shop Shop domain
 * @returns Shopify connection or null if not found
 */
export async function getUserShopifyConnectionByShop(
  userId: string,
  shop: string
): Promise<ShopifyConnection | null> {
  try {
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
      shop: connection.shop,
      access_token: connection.access_token,
      scope: connection.scope,
      user_id: connection.user_id,
    };
  } catch (error) {
    console.error('Error fetching Shopify connection by shop:', error);
    return null;
  }
}

/**
 * Delete Shopify connection for a user
 * @param userId User ID
 * @returns True if successful, false otherwise
 */
export async function deleteShopifyConnection(userId: string): Promise<boolean> {
  try {
    await prisma.shopifyConnection.delete({
      where: {
        user_id: userId,
      },
    });
    return true;
  } catch (error) {
    console.error('Error deleting Shopify connection:', error);
    return false;
  }
} 