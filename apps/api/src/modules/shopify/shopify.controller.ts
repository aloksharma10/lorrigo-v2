import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  createShopifyAuthUrl, 
  exchangeShopifyCodeForToken, 
  getShopifyOrders,
  getShopifyOrder,
  ShopifyConnection
} from './order';

/**
 * Type for Shopify auth request params
 */
interface ShopifyAuthRequest {
  Querystring: {
    shop: string;
  };
}

/**
 * Type for Shopify callback request params
 */
interface ShopifyCallbackRequest {
  Querystring: {
    shop: string;
    code: string;
    state: string;
  };
}

/**
 * Type for Shopify orders request params
 */
interface ShopifyOrdersRequest {
  Querystring: {
    status?: string;
    created_at_min?: string;
    created_at_max?: string;
    limit?: string;
  };
}

/**
 * Type for Shopify order request params
 */
interface ShopifyOrderRequest {
  Params: {
    id: string;
  };
}

/**
 * Shopify controller for handling Shopify API integration
 */
export class ShopifyController {
  /**
   * Register Shopify routes
   * @param fastify Fastify instance
   */
  public static registerRoutes(fastify: FastifyInstance): void {
    // Initiate OAuth flow
    fastify.get('/auth', ShopifyController.initiateAuth);
    
    // OAuth callback
    fastify.get('/callback', ShopifyController.handleCallback);
    
    // Get orders
    fastify.get('/orders', ShopifyController.getOrders);
    
    // Get a specific order
    fastify.get('/orders/:id', ShopifyController.getOrder);
  }
  
  /**
   * Initiate Shopify OAuth flow
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private static async initiateAuth(
    request: FastifyRequest<ShopifyAuthRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { shop } = request.query;
      
      if (!shop) {
        reply.code(400).send({ error: 'Shop parameter is required' });
        return;
      }
      
      // Get authenticated user from request
      // This assumes you have authentication middleware that adds user to request
      const user = (request).userPayload;
      
      if (!user) {
        reply.code(401).send({ error: 'Authentication required' });
        return;
      }
      
      // Generate auth URL
      const authUrl = createShopifyAuthUrl(shop, user.id);
      
      // Redirect to Shopify auth page
      reply.redirect(authUrl);
    } catch (error) {
      console.error('Error initiating Shopify auth:', error);
      reply.code(500).send({ error: 'Failed to initiate Shopify authentication' });
    }
  }
  
  /**
   * Handle Shopify OAuth callback
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private static async handleCallback(
    request: FastifyRequest<ShopifyCallbackRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { shop, code } = request.query;
      
      if (!shop || !code) {
        reply.code(400).send({ error: 'Shop and code parameters are required' });
        return;
      }
      
      // Get authenticated user from request
      const user = (request as any).user;
      
      if (!user) {
        reply.code(401).send({ error: 'Authentication required' });
        return;
      }
      
      // Exchange code for token
      const connection = await exchangeShopifyCodeForToken(shop, user.id, code);
      
      if (!connection) {
        reply.code(500).send({ error: 'Failed to exchange code for token' });
        return;
      }
      
      // Here you would typically store the connection in your database
      // This is just an example placeholder
      const savedConnection = await saveShopifyConnection(connection, user.id);
      
      // Redirect to a success page or back to the app
      reply.redirect('/shopify/success');
    } catch (error) {
      console.error('Error handling Shopify callback:', error);
      reply.code(500).send({ error: 'Failed to complete Shopify authentication' });
    }
  }
  
  /**
   * Get Shopify orders
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private static async getOrders(
    request: FastifyRequest<ShopifyOrdersRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { status, created_at_min, created_at_max, limit } = request.query;
      
      // Get authenticated user from request
      const user = (request as any).user;
      
      if (!user) {
        reply.code(401).send({ error: 'Authentication required' });
        return;
      }
      
      // Get user's Shopify connection from database
      const connection = await getUserShopifyConnection(user.id);
      
      if (!connection) {
        reply.code(404).send({ error: 'Shopify connection not found' });
        return;
      }
      
      // Build query params
      const params: Record<string, string | number> = {};
      
      if (status) {
        params.status = status;
      }
      
      if (created_at_min) {
        params.created_at_min = created_at_min;
      }
      
      if (created_at_max) {
        params.created_at_max = created_at_max;
      }
      
      if (limit) {
        params.limit = parseInt(limit, 10);
      }
      
      // Get orders from Shopify
      const orders = await getShopifyOrders(connection, params);
      
      reply.send({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      console.error('Error fetching Shopify orders:', error);
      reply.code(500).send({ error: 'Failed to fetch Shopify orders' });
    }
  }
  
  /**
   * Get a specific Shopify order
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private static async getOrder(
    request: FastifyRequest<ShopifyOrderRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params;
      
      // Get authenticated user from request
      const user = (request as any).user;
      
      if (!user) {
        reply.code(401).send({ error: 'Authentication required' });
        return;
      }
      
      // Get user's Shopify connection from database
      const connection = await getUserShopifyConnection(user.id);
      
      if (!connection) {
        reply.code(404).send({ error: 'Shopify connection not found' });
        return;
      }
      
      // Get order from Shopify
      const order = await getShopifyOrder(connection, parseInt(id, 10));
      
      if (!order) {
        reply.code(404).send({ error: 'Order not found' });
        return;
      }
      
      reply.send({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Error fetching Shopify order:', error);
      reply.code(500).send({ error: 'Failed to fetch Shopify order' });
    }
  }
}

/**
 * Placeholder function for saving Shopify connection to database
 * You should replace this with actual database operations
 */
async function saveShopifyConnection(
  connection: ShopifyConnection,
  userId: string
): Promise<ShopifyConnection> {
  // In a real implementation, you would save this to your database
  console.log('Saving Shopify connection:', connection);
  return connection;
}

/**
 * Placeholder function for getting user's Shopify connection from database
 * You should replace this with actual database operations
 */
async function getUserShopifyConnection(userId: string): Promise<ShopifyConnection | null> {
  // In a real implementation, you would fetch this from your database
  console.log('Getting Shopify connection for user:', userId);
  
  // Return dummy connection for example purposes
  return null;
}

export default ShopifyController; 