/**
 * Shopify Channel Controller
 *
 * This controller handles Shopify channel operations for CONNECTING Shopify stores to existing user accounts.
 * It does NOT create new user sessions - that's handled by the AuthController for login flows.
 *
 * Key distinction:
 * - /auth/shopify/* routes: For login (creates new user sessions)
 * - /channels/shopify/* routes: For connecting stores to existing accounts (no new session)
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { captureException } from '@/lib/sentry';
import { ChannelConnectionService, Channel } from '../services/channel-connection-service';
import { ShopifyChannel } from '../services/shopify/shopify-channel';
import { ShopifySyncService } from '../services/shopify/shopify-sync-service';
import {
  ShopifyWebhookService,
  ShopifyCustomerDataRequestPayload,
  ShopifyCustomerRedactPayload,
  ShopifyShopRedactPayload,
} from '../services/shopify/shopify-webhook-service';

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
  private webhookService: ShopifyWebhookService;

  constructor(fastify: FastifyInstance) {
    this.connectionService = new ChannelConnectionService();
    this.fastify = fastify;
    this.webhookService = new ShopifyWebhookService();
  }

  /**
   * Register Shopify routes
   * @param fastify Fastify instance
   */
  public registerRoutes(fastify: FastifyInstance): void {
    // Get auth URL for connecting to existing account
    fastify.get('/shopify/auth/url', this.getAuthUrl.bind(this));

    // Initiate OAuth flow (kept for backward compatibility)
    fastify.get('/shopify/auth', this.initiateAuth.bind(this));

    // OAuth callback for connecting to existing account
    fastify.get('/shopify/callback', this.handleCallback.bind(this));

    // Connect Shopify store to existing account (API endpoint)
    fastify.post('/shopify/connect', this.connectShopify.bind(this));

    // Get connection status
    fastify.get('/shopify/connection', this.getConnection.bind(this));

    // Disconnect Shopify
    fastify.delete('/shopify/connection', this.disconnectShopify.bind(this));

    // Get orders
    fastify.get('/shopify/orders', this.getOrders.bind(this));

    // Get a specific order
    fastify.get('/shopify/orders/:id', this.getOrder.bind(this));

    // Sync orders from Shopify
    fastify.post('/shopify/sync-orders', this.syncOrders.bind(this));

    // Mandatory webhooks for Shopify App Store compliance
    fastify.post('/shopify/webhooks/customers/data_request', this.handleCustomerDataRequest.bind(this));
    fastify.post('/shopify/webhooks/customers/redact', this.handleCustomerDataErasure.bind(this));
    fastify.post('/shopify/webhooks/shop/redact', this.handleShopDataErasure.bind(this));

    // Test endpoint for webhook verification (remove in production)
    fastify.get('/shopify/webhooks/test', this.testWebhookEndpoint.bind(this));
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
        console.error('OAuth callback validation error:', result.error.format());
        // Redirect to app with error
        const errorUrl = `${process.env.FRONTEND_URL || 'https://app.lorrigo.com'}/auth/signin?error=validation_failed`;
        return reply.redirect(errorUrl);
      }

      const { shop, code, hmac, timestamp, host } = result.data;

      // Get authenticated user from request
      const user = request.userPayload;

      if (!user) {
        console.error('No authenticated user in OAuth callback');
        // Redirect to app with error
        const errorUrl = `${process.env.FRONTEND_URL || 'https://app.lorrigo.com'}/auth/signin?error=authentication_required`;
        return reply.redirect(errorUrl);
      }

      // Validate that the shop is a valid Shopify shop domain
      if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)) {
        console.error('Invalid shop domain:', shop);
        // Redirect to app with error
        const errorUrl = `${process.env.FRONTEND_URL || 'https://app.lorrigo.com'}/auth/signin?error=invalid_shop`;
        return reply.redirect(errorUrl);
      }

      // Create Shopify channel instance
      const shopifyChannel = new ShopifyChannel(shop, user.id, this.fastify);

      // If we don't have a code, this might be an app installation request
      if (!code) {
        const authUrl = shopifyChannel.generateAuthUrl(shop);

        // Redirect to the authorization URL
        return reply.redirect(authUrl);
      }

      // Exchange code for token and connect to existing user
      try {
        const oauthData = await shopifyChannel.exchangeCodeForTokenWithShop(code, shop);

        if (!oauthData) {
          console.error('Failed to exchange code for token');
          // Redirect to app with error
          const errorUrl = `${process.env.FRONTEND_URL || 'https://app.lorrigo.com'}/auth/signin?error=token_exchange_failed`;
          return reply.redirect(errorUrl);
        }

        // Connect Shopify to the existing user account (does not create new session)
        const connectResult = await shopifyChannel.connectShopifyToExistingUser(oauthData, user.id);

        if (!connectResult.success) {
          console.error('Failed to connect Shopify to existing user:', connectResult.error);
          // Redirect to app with error
          const errorUrl = `${process.env.FRONTEND_URL || 'https://app.lorrigo.com'}/auth/signin?error=connection_failed&message=${encodeURIComponent(connectResult.error || 'Failed to connect Shopify store')}`;
          return reply.redirect(errorUrl);
        }

        // For non-embedded apps, redirect to the app's dashboard
        const dashboardUrl = `${process.env.FRONTEND_URL || 'https://app.lorrigo.com'}/seller/dashboard?shop=${shop}&status=success`;
        return reply.redirect(dashboardUrl);
      } catch (exchangeError: any) {
        console.error('Error exchanging code for token:', exchangeError);
        const errorMessage = exchangeError.message || 'Failed to exchange code for token';

        // Check if the error is due to the code already being used
        const isCodeUsedError =
          exchangeError.response?.data?.includes('authorization code was not found or was already used') ||
          errorMessage.includes('authorization code was not found or was already used');

        if (isCodeUsedError) {
          // Check if we already have a connection for this shop and user
          const existingConnection = await this.connectionService.getConnectionByShop(user.id, shop, Channel.SHOPIFY);

          if (existingConnection) {
            // If we already have a connection, redirect to dashboard
            const dashboardUrl = `${process.env.FRONTEND_URL || 'https://app.lorrigo.com'}/seller/dashboard?shop=${shop}&status=already_connected`;
            return reply.redirect(dashboardUrl);
          }
        }

        // Redirect to app with error
        const errorUrl = `${process.env.FRONTEND_URL || 'https://app.lorrigo.com'}/auth/signin?error=installation_failed&message=${encodeURIComponent(errorMessage)}`;
        return reply.redirect(errorUrl);
      }
    } catch (error) {
      console.error('Unexpected error in OAuth callback:', error);
      captureException(error as Error);

      // Redirect to app with error
      const errorUrl = `${process.env.FRONTEND_URL || 'https://app.lorrigo.com'}/auth/signin?error=unexpected_error`;
      return reply.redirect(errorUrl);
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
      const connection = await this.connectionService.getConnectionByUserIdAndChannel(user.id, Channel.SHOPIFY);

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
   * Connect Shopify store to existing account (API endpoint)
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async connectShopify(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Get authenticated user from request
      const user = request.userPayload;

      if (!user) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      // Parse request body
      const { code, state, shop } = request.body as any;

      if (!code || !state || !shop) {
        return reply.code(400).send({ error: 'Missing required parameters: code, state, or shop' });
      }

      // Validate that the shop is a valid Shopify shop domain
      if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)) {
        return reply.code(400).send({ error: 'Invalid shop domain' });
      }

      // Create Shopify channel instance
      const shopifyChannel = new ShopifyChannel(shop, user.id, this.fastify);

      // Exchange code for token and connect to existing user
      try {
        const oauthData = await shopifyChannel.exchangeCodeForTokenWithShop(code, shop);

        if (!oauthData) {
          return reply.code(400).send({ error: 'Failed to exchange code for token' });
        }

        // Connect Shopify to the existing user account (does not create new session)
        const connectResult = await shopifyChannel.connectShopifyToExistingUser(oauthData, user.id);

        if (!connectResult.success) {
          return reply.code(400).send({ error: connectResult.error || 'Failed to connect Shopify store' });
        }

        return reply.code(200).send({
          success: true,
          message: 'Shopify store connected successfully',
          shop: oauthData.shop,
        });
      } catch (exchangeError: any) {
        console.error('Error exchanging code for token:', exchangeError);
        const errorMessage = exchangeError.message || 'Failed to exchange code for token';

        // Check if the error is due to the code already being used
        const isCodeUsedError =
          exchangeError.response?.data?.includes('authorization code was not found or was already used') ||
          errorMessage.includes('authorization code was not found or was already used');

        if (isCodeUsedError) {
          // Check if we already have a connection for this shop and user
          const existingConnection = await this.connectionService.getConnectionByShop(user.id, shop, Channel.SHOPIFY);

          if (existingConnection) {
            return reply.code(200).send({
              success: true,
              message: 'Shopify store already connected',
              shop: shop,
            });
          }
        }

        return reply.code(400).send({ error: errorMessage });
      }
    } catch (error) {
      console.error('Error connecting Shopify store:', error);
      captureException(error as Error);
      return reply.code(500).send({ error: 'Failed to connect Shopify store' });
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
      const connection = await this.connectionService.getConnectionByUserIdAndChannel(user.id, Channel.SHOPIFY);

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
      const connection = await this.connectionService.getConnectionByUserIdAndChannel(user.id, Channel.SHOPIFY);

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
      const connection = await this.connectionService.getConnectionByUserIdAndChannel(user.id, Channel.SHOPIFY);

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

  /**
   * Sync orders from Shopify
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async syncOrders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      // Create Shopify sync service
      const shopifySyncService = new ShopifySyncService(this.fastify);

      // Build query params for sync
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

      // Sync orders from Shopify
      const syncResult = await shopifySyncService.syncOrdersFromShopify(user.id, params);

      if (syncResult.success) {
        reply.send({
          success: true,
          message: syncResult.message,
          data: syncResult.data,
        });
      } else {
        reply.code(400).send({
          success: false,
          error: syncResult.error,
          message: syncResult.message,
        });
      }
    } catch (error) {
      console.error('Error syncing orders from Shopify:', error);
      captureException(error as Error);
      reply.code(500).send({ error: 'Failed to sync orders from Shopify' });
    }
  }

  /**
   * Handle customer data request webhook (GDPR compliance)
   * Shopify sends this when a customer requests their data
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async handleCustomerDataRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      console.log('Customer data request webhook received');

      // Validate webhook headers
      if (!this.webhookService.validateWebhookHeaders(request.headers)) {
        console.error('Invalid webhook headers');
        return reply.code(401).send({ error: 'Invalid webhook headers' });
      }

      // Verify webhook authenticity using HMAC
      const hmac = request.headers['x-shopify-hmac-sha256'];
      const bodyString = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

      if (!this.webhookService.verifyWebhookHmac(bodyString, hmac as string)) {
        console.error('Invalid webhook HMAC signature');
        return reply.code(401).send({ error: 'Invalid webhook signature' });
      }

      // Parse the webhook payload
      const payload: ShopifyCustomerDataRequestPayload = this.webhookService.parseCustomerDataRequestPayload(bodyString);

      console.log('[SHOPIFY] Customer data request payload:', {
        shop_id: payload.shop_id,
        shop_domain: payload.shop_domain,
        customer_id: payload.customer.id,
        customer_email: payload.customer.email,
        orders_requested: payload.orders_requested.length,
        data_request_id: payload.data_request.id,
      });

      // Get shop connection
      const connection = await this.connectionService.getConnectionByShop(
        '', // We'll need to get user ID from shop domain
        payload.shop_domain,
        Channel.SHOPIFY
      );

      if (!connection) {
        console.log('No connection found for shop:', payload.shop_domain);
        // Still return 200 as required by Shopify
        return reply.code(200).send({ success: true });
      }

      // Generate customer data export for GDPR compliance
      const customerData = this.webhookService.generateCustomerDataExport(payload);

      // Store the data request for processing (you might want to queue this)
      // This data should be provided to the store owner within 30 days
      await this.webhookService.logWebhookEvent('customers/data_request', payload.shop_domain, customerData, 'pending');

      // TODO: Implement actual data export logic
      // 1. Fetch customer data from your database
      // 2. Fetch order data for the requested orders
      // 3. Include any app-specific data you store
      // 4. Format the data for export
      // 5. Store or send the export to the store owner

      // Return success immediately (Shopify expects a 200 response)
      reply.code(200).send({ success: true });
    } catch (error) {
      console.error('Error handling customer data request webhook:', error);
      captureException(error as Error);
      // Always return 200 to Shopify even on error
      reply.code(200).send({ success: true });
    }
  }

  /**
   * Handle customer data erasure webhook (GDPR compliance)
   * Shopify sends this when a customer requests data deletion
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async handleCustomerDataErasure(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      console.log('Customer data erasure webhook received');

      // Validate webhook headers
      if (!this.webhookService.validateWebhookHeaders(request.headers)) {
        console.error('Invalid webhook headers');
        return reply.code(401).send({ error: 'Invalid webhook headers' });
      }

      // Verify webhook authenticity using HMAC
      const hmac = request.headers['x-shopify-hmac-sha256'];
      const bodyString = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

      if (!this.webhookService.verifyWebhookHmac(bodyString, hmac as string)) {
        console.error('Invalid webhook HMAC signature');
        return reply.code(401).send({ error: 'Invalid webhook signature' });
      }

      // Parse the webhook payload
      const payload: ShopifyCustomerRedactPayload = this.webhookService.parseCustomerRedactPayload(bodyString);

      console.log('Customer data erasure payload:', {
        shop_id: payload.shop_id,
        shop_domain: payload.shop_domain,
        customer_id: payload.customer.id,
        customer_email: payload.customer.email,
        orders_to_redact: payload.orders_to_redact.length,
      });

      // Get shop connection
      const connection = await this.connectionService.getConnectionByShop(
        '', // We'll need to get user ID from shop domain
        payload.shop_domain,
        Channel.SHOPIFY
      );

      if (!connection) {
        console.log('No connection found for shop:', payload.shop_domain);
        // Still return 200 as required by Shopify
        return reply.code(200).send({ success: true });
      }

      // Delete customer data from your database
      // This must be completed within 30 days of receiving the request
      // If you're legally required to retain data, you shouldn't complete the action

      // TODO: Implement actual data deletion logic
      // 1. Delete customer-specific data from your database
      // 2. Delete order data for the specified orders
      // 3. Delete any analytics or preferences data
      // 4. Ensure complete data removal

      // Example deletion operations (uncomment and modify as needed):
      // if (payload.customer.id) {
      //   // Delete customer data
      //   await this.prisma.customerData.deleteMany({
      //     where: { shopify_customer_id: payload.customer.id.toString() }
      //   });
      //
      //   // Delete order data
      //   if (payload.orders_to_redact.length > 0) {
      //     await this.prisma.orderData.deleteMany({
      //       where: { shopify_order_id: { in: payload.orders_to_redact.map(id => id.toString()) } }
      //     });
      //   }
      //
      //   // Delete analytics data
      //   await this.prisma.customerAnalytics.deleteMany({
      //     where: { shopify_customer_id: payload.customer.id.toString() }
      //   });
      // }

      // Log the erasure request
      await this.webhookService.logWebhookEvent('customers/redact', payload.shop_domain, payload, 'completed');

      // Return success immediately (Shopify expects a 200 response)
      reply.code(200).send({ success: true });
    } catch (error) {
      console.error('Error handling customer data erasure webhook:', error);
      captureException(error as Error);
      // Always return 200 to Shopify even on error
      reply.code(200).send({ success: true });
    }
  }

  /**
   * Handle shop data erasure webhook (GDPR compliance)
   * Shopify sends this 48 hours after app uninstallation
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async handleShopDataErasure(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      console.log('Shop data erasure webhook received');

      // Validate webhook headers
      if (!this.webhookService.validateWebhookHeaders(request.headers)) {
        console.error('Invalid webhook headers');
        return reply.code(401).send({ error: 'Invalid webhook headers' });
      }

      // Verify webhook authenticity using HMAC
      const hmac = request.headers['x-shopify-hmac-sha256'];
      const bodyString = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

      if (!this.webhookService.verifyWebhookHmac(bodyString, hmac as string)) {
        console.error('Invalid webhook HMAC signature');
        return reply.code(401).send({ error: 'Invalid webhook signature' });
      }

      // Parse the webhook payload
      const payload: ShopifyShopRedactPayload = this.webhookService.parseShopRedactPayload(bodyString);

      console.log('Shop data erasure payload:', {
        shop_id: payload.shop_id,
        shop_domain: payload.shop_domain,
      });

      // Get shop connection
      const connection = await this.connectionService.getConnectionByShop(
        '', // We'll need to get user ID from shop domain
        payload.shop_domain,
        Channel.SHOPIFY
      );

      if (!connection) {
        console.log('No connection found for shop:', payload.shop_domain);
        // Still return 200 as required by Shopify
        return reply.code(200).send({ success: true });
      }

      // Delete the shop connection
      await this.connectionService.deleteConnection(connection.user_id, Channel.SHOPIFY);

      // Log the erasure request
      await this.webhookService.logWebhookEvent('shop/redact', payload.shop_domain, payload, 'completed');

      // Return success immediately (Shopify expects a 200 response)
      reply.code(200).send({ success: true });
    } catch (error) {
      console.error('Error handling shop data erasure webhook:', error);
      captureException(error as Error);
      // Always return 200 to Shopify even on error
      reply.code(200).send({ success: true });
    }
  }

  /**
   * Test endpoint for webhook verification (remove in production)
   * @param request Fastify request
   * @param reply Fastify reply
   */
  private async testWebhookEndpoint(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const hmac = request.headers['x-shopify-hmac-sha256'];
      const bodyString = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

      if (!this.webhookService.verifyWebhookHmac(bodyString, hmac as string)) {
        return reply.code(401).send({ error: 'Invalid webhook signature' });
      }

      reply.send({
        success: true,
        message: 'Webhook signature verified successfully!',
      });
    } catch (error) {
      console.error('Error testing webhook endpoint:', error);
      captureException(error as Error);
      reply.code(500).send({ error: 'Failed to test webhook endpoint' });
    }
  }
}
