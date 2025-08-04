import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { captureException } from '@/lib/sentry';
import { ChannelConnectionService, Channel } from '../services/channel-connection-service';
import { ShopifyChannel, ShopifyConnection } from '../services/shopify/shopify-channel';

// Validation schemas
const shopifyAuthSchema = z.object({
  shop: z.string().optional(),
});

const shopifyCallbackSchema = z.object({
  shop: z.string().min(1, 'Shop parameter is required'),
  code: z.string().optional(),
  hmac: z.string(),
  timestamp: z.string(),
  state: z.string().optional(),
  host: z.string().optional(),
});

const shopifyOrdersQuerySchema = z.object({
  status: z.string().optional(),
  created_at_min: z.string().optional(),
  created_at_max: z.string().optional(),
  limit: z.string().optional(),
});

const shopifyOrderParamsSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
});

export class ShopifyController {
  private connectionService: ChannelConnectionService;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.connectionService = new ChannelConnectionService();
    this.fastify = fastify;
  }

  /**
   * Register Shopify routes
   * @param fastify Fastify instance
   */
  public registerRoutes(fastify: FastifyInstance): void {
    // Get auth URL
    fastify.get('/shopify/auth/url', this.getAuthUrl.bind(this));

    // Initiate OAuth flow (kept for backward compatibility)
    fastify.get('/shopify/auth', this.initiateAuth.bind(this));

    // OAuth callback
    fastify.get('/shopify/callback', this.handleCallback.bind(this));

    // Get connection status
    fastify.get('/shopify/connection', this.getConnection.bind(this));

    // Disconnect Shopify
    fastify.delete('/shopify/connection', this.disconnectShopify.bind(this));

    // Get orders
    fastify.get('/shopify/orders', this.getOrders.bind(this));

    // Get a specific order
    fastify.get('/shopify/orders/:id', this.getOrder.bind(this));
  }

  /**
   * Get Shopify Auth URL without redirecting
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async getAuthUrl(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = shopifyAuthSchema.safeParse(request.query);

      if (!result.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: result.error.format(),
        });
      }

      const { shop } = result.data;
      console.log('Getting Shopify auth URL for shop:', shop || 'generic');

      // Get authenticated user from request
      const user = request.userPayload;

      if (!user) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      // Create Shopify channel instance with a placeholder shop if none provided
      const shopifyChannel = new ShopifyChannel(shop || 'placeholder.myshopify.com', user.id, this.fastify);

      // Generate auth URL (pass the shop parameter if provided)
      const authUrl = shopifyChannel.generateAuthUrl(shop);

      // Return the URL instead of redirecting
      reply.send({ authUrl });
    } catch (error) {
      console.error('Error generating Shopify auth URL:', error);
      captureException(error as Error);
      reply.code(500).send({ error: 'Failed to generate Shopify authentication URL' });
    }
  }

  /**
   * Initiate Shopify OAuth flow
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async initiateAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = shopifyAuthSchema.safeParse(request.query);

      if (!result.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: result.error.format(),
        });
      }

      const { shop } = result.data;
      console.log('Initiating Shopify auth for shop:', shop || 'generic');

      // Get authenticated user from request
      const user = request.userPayload;

      if (!user) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      // Create Shopify channel instance with a placeholder shop if none provided
      const shopifyChannel = new ShopifyChannel(shop || 'placeholder.myshopify.com', user.id, this.fastify);

      // Generate auth URL (pass the shop parameter if provided)
      const authUrl = shopifyChannel.generateAuthUrl(shop);

      // Redirect to Shopify auth page
      reply.redirect(authUrl);
    } catch (error) {
      console.error('Error initiating Shopify auth:', error);
      captureException(error as Error);
      reply.code(500).send({ error: 'Failed to initiate Shopify authentication' });
    }
  }

  /**
   * Handle Shopify OAuth callback
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async handleCallback(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = shopifyCallbackSchema.safeParse(request.query);

      if (!result.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: result.error.format(),
        });
      }

      const { shop, code, hmac, timestamp, host } = result.data;

      // Get authenticated user from request
      const user = request.userPayload;

      if (!user) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      // Validate that the shop is a valid Shopify shop domain
      if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)) {
        return reply.code(400).send({ error: 'Invalid shop domain' });
      }

      // Create Shopify channel instance
      const shopifyChannel = new ShopifyChannel(shop, user.id, this.fastify);

      // If we don't have a code, this might be an app installation request
      if (!code) {
        console.log('No code provided, generating auth URL for shop:', shop);
        // Generate a new authorization URL
        const authUrl = shopifyChannel.getAuthUrl();

        reply.send({
          success: true,
          authUrl,
          message: 'Authorization URL generated',
        });
        return;
      }

      // Exchange code for token
      try {
        const connection = await shopifyChannel.exchangeCodeForToken(code);

        if (!connection) {
          reply.code(500).send({ error: 'Failed to exchange code for token' });
          return;
        }

        // Save the connection to the database
        const savedConnection = await this.connectionService.saveConnection({
          ...connection,
          channel: Channel.SHOPIFY,
        });

        // Return success response with connection info
        reply.send({
          success: true,
          connection: {
            shop: savedConnection.shop,
            scope: savedConnection.scope,
            connected_at: savedConnection.connected_at,
            status: 'active',
          },
        });
      } catch (exchangeError: any) {
        console.error('Error exchanging code for token:', exchangeError);
        const errorMessage = exchangeError.message || 'Failed to exchange code for token';

        // Check if the error is due to the code already being used
        const isCodeUsedError =
          exchangeError.response?.data?.includes(
            'authorization code was not found or was already used'
          ) || errorMessage.includes('authorization code was not found or was already used');

        if (isCodeUsedError) {
          // Check if we already have a connection for this shop and user
          const existingConnection = await this.connectionService.getConnectionByShop(
            user.id,
            shop,
            Channel.SHOPIFY
          );

          if (existingConnection) {
            // If we already have a connection, consider this a success
            reply.send({
              success: true,
              connection: {
                shop: existingConnection.shop,
                scope: existingConnection.scope,
                connected_at: existingConnection.connected_at,
                status: 'active',
              },
              message: 'Connection already exists',
            });
            return;
          } else {
            // No existing connection, generate a new auth URL
            const authUrl = shopifyChannel.getAuthUrl();

            reply.send({
              success: false,
              authUrl,
              error: 'Authorization code was already used. Please try again.',
              needsReauthorization: true,
            });
            return;
          }
        }

        reply.code(500).send({
          error: errorMessage,
          details: exchangeError.response?.data || {},
        });
      }
    } catch (error: any) {
      console.error('Error handling Shopify callback:', error);
      captureException(error as Error);
      reply.code(500).send({
        error: 'Failed to complete Shopify authentication',
        message: error.message || 'Unknown error',
      });
    }
  }

  /**
   * Get Shopify connection status
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async getConnection(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Get authenticated user from request
      const user = request.userPayload;

      if (!user) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      // Get user's Shopify connection from database
      const connection = await this.connectionService.getConnectionByUserIdAndChannel(
        user.id,
        Channel.SHOPIFY
      );

      if (!connection) {
        return reply.code(404).send({ error: 'Shopify connection not found' });
      }

      // Return connection details (without sensitive data like access_token)
      reply.send({
        shop: connection.shop,
        scope: connection.scope,
        connected_at: connection.connected_at,
        status: 'active',
      });
    } catch (error) {
      console.error('Error fetching Shopify connection:', error);
      captureException(error as Error);
      reply.code(500).send({ error: 'Failed to fetch Shopify connection' });
    }
  }

  /**
   * Disconnect Shopify store
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async disconnectShopify(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Get authenticated user from request
      const user = request.userPayload;

      if (!user) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      // Get the connection first to get the shop domain
      const connection = await this.connectionService.getConnectionByUserIdAndChannel(
        user.id,
        Channel.SHOPIFY
      );

      if (!connection || !connection.shop) {
        return reply.code(404).send({ error: 'Shopify connection not found' });
      }

      // Create Shopify channel instance to handle disconnection
      const shopifyChannel = new ShopifyChannel(connection.shop, user.id, this.fastify, connection.access_token);

      // Disconnect from Shopify (clear token from cache)
      await shopifyChannel.disconnect();

      // Delete user's Shopify connection from database
      const success = await this.connectionService.deleteConnection(user.id, Channel.SHOPIFY);

      if (!success) {
        return reply.code(500).send({ error: 'Failed to disconnect Shopify' });
      }

      reply.send({
        success: true,
        message: 'Shopify connection deleted successfully',
      });
    } catch (error) {
      console.error('Error disconnecting Shopify:', error);
      captureException(error as Error);
      reply.code(500).send({ error: 'Failed to disconnect Shopify' });
    }
  }

  /**
   * Get Shopify orders
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async getOrders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = shopifyOrdersQuerySchema.safeParse(request.query);

      if (!result.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: result.error.format(),
        });
      }

      const { status, created_at_min, created_at_max, limit } = result.data;

      // Get authenticated user from request
      const user = request.userPayload;

      if (!user) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      // Get user's Shopify connection from database
      const connection = await this.connectionService.getConnectionByUserIdAndChannel(
        user.id,
        Channel.SHOPIFY
      );

      if (!connection || !connection.shop) {
        return reply.code(404).send({ error: 'Shopify connection not found' });
      }

      // Create Shopify channel instance
      const shopifyChannel = new ShopifyChannel(connection.shop, user.id, this.fastify, connection.access_token);

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
      const orders = await shopifyChannel.getOrders(params);

      reply.send({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      console.error('Error fetching Shopify orders:', error);
      captureException(error as Error);
      reply.code(500).send({ error: 'Failed to fetch Shopify orders' });
    }
  }

  /**
   * Get a specific Shopify order
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async getOrder(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = shopifyOrderParamsSchema.safeParse(request.params);

      if (!result.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: result.error.format(),
        });
      }

      const { id } = result.data;

      // Get authenticated user from request
      const user = request.userPayload;

      if (!user) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      // Get user's Shopify connection from database
      const connection = await this.connectionService.getConnectionByUserIdAndChannel(
        user.id,
        Channel.SHOPIFY
      );

      if (!connection || !connection.shop) {
        return reply.code(404).send({ error: 'Shopify connection not found' });
      }

      // Create Shopify channel instance
      const shopifyChannel = new ShopifyChannel(connection.shop, user.id, this.fastify, connection.access_token);

      // Get order from Shopify
      const order = await shopifyChannel.getOrder(parseInt(id, 10));

      if (!order) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      reply.send({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Error fetching Shopify order:', error);
      captureException(error as Error);
      reply.code(500).send({ error: 'Failed to fetch Shopify order' });
    }
  }
}
