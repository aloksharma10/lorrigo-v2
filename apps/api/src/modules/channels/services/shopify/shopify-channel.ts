import { APP_CONFIG } from '@/config/app';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { BaseChannel } from '../base-channel';
import { redis } from '@/lib/redis';
import querystring from 'querystring';
import crypto from 'crypto';
import axios from 'axios';
import type { PrismaClient } from '@lorrigo/db';
import { FastifyInstance } from 'fastify';

/**
 * Shopify order interface
 */
export interface ShopifyOrder {
  id: number;
  order_number: string;
  name: string;
  email: string;
  phone: string | null;
  total_price: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  updated_at: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string | null;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone: string;
  };
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string;
    product_id: number;
    variant_id: number;
  }>;
  [key: string]: any;
}

/**
 * Shopify shop information interface
 */
export interface ShopifyShopInfo {
  id: number;
  name: string;
  email: string;
  domain: string;
  province: string;
  country: string;
  address1: string;
  zip: string;
  city: string;
  phone: string;
  latitude: number;
  longitude: number;
  primary_locale: string;
  address2: string | null;
  created_at: string;
  updated_at: string;
  country_code: string;
  country_name: string;
  currency: string;
  customer_email: string;
  timezone: string;
  iana_timezone: string;
  shop_owner: string;
  money_format: string;
  money_with_currency_format: string;
  weight_unit: string;
  province_code: string;
  taxes_included: boolean;
  auto_configure_tax_inclusivity: boolean;
  tax_shipping: boolean;
  county_taxes: boolean;
  plan_display_name: string;
  plan_name: string;
  has_discounts: boolean;
  has_gift_cards: boolean;
  myshopify_domain: string;
  google_apps_domain: string | null;
  google_apps_login_enabled: boolean;
  money_in_emails_format: string;
  money_with_currency_in_emails_format: string;
  eligible_for_payments: boolean;
  requires_extra_payments_agreement: boolean;
  password_enabled: boolean;
  has_storefront: boolean;
  finances: boolean;
  primary_location_id: number;
  cookie_consent_level: string;
  visitor_tracking_consent_preference: string;
  checkout_api_supported: boolean;
  multi_location_enabled: boolean;
  setup_required: boolean;
  pre_launch_enabled: boolean;
  enabled_presentment_currencies: string[];
  transactional_sms_disabled: boolean;
  marketing_sms_consent_enabled_at_checkout: boolean;
  [key: string]: any;
}

/**
 * Shopify OAuth connection parameters
 */
export interface ShopifyConnection {
  shop: string;
  access_token: string;
  scope: string;
  user_id: string;
}

/**
 * Shopify OAuth data interface
 */
export interface ShopifyOAuthData {
  shop: string;
  access_token: string;
  scope: string;
  user_id?: string;
  shop_owner?: string;
  shop_email?: string;
  shop_name?: string;
}

/**
 * Shopify channel implementation
 * Handles OAuth authentication, user management, and order fetching from Shopify
 */
export class ShopifyChannel extends BaseChannel {
  private shop: string;
  private apiSecret: string;
  private apiVersion: string;
  private scopes: string;
  private redirectUri: string;
  private accessToken: string | null;
  private prisma: PrismaClient;
  private fastify: FastifyInstance;

  constructor(shop: string, userId: string, fastify: FastifyInstance, accessToken?: string) {
    const shopifyConfig = APP_CONFIG.VENDOR.SHOPIFY;

    super('Shopify', `https://${shop}`, shopifyConfig.API_KEY, userId, `${CACHE_KEYS.SHOPIFY_TOKEN}:${shop}:${userId}`);

    this.shop = shop;
    this.apiSecret = shopifyConfig.API_SECRET;
    this.apiVersion = shopifyConfig.API_VERSION;
    this.scopes = shopifyConfig.SCOPES;
    this.redirectUri = shopifyConfig.REDIRECT_URI;
    this.accessToken = accessToken || null;
    this.prisma = fastify.prisma;
    this.fastify = fastify;
  }

  /**
   * Generate OAuth URL for Shopify authentication
   * @param shop Optional shop domain to pre-fill
   * @returns Authentication URL
   */
  public generateAuthUrl(shop?: string): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const shopifyConfig = APP_CONFIG.VENDOR.SHOPIFY;

    const params: any = {
      client_id: shopifyConfig.API_KEY,
      scope: shopifyConfig.SCOPES,
      redirect_uri: shopifyConfig.REDIRECT_URI,
      state: nonce,
      response_type: 'code',
      'grant_options[]': 'per-user',
    };

    // If shop is provided, add it to the URL
    if (shop) {
      params.shop = shop;
    }

    // Store nonce in Redis for verification
    const key = `shopify_oauth_nonce:${nonce}`;
    this.fastify.redis.setex(key, 300, '1'); // 5 minutes expiry

    // Use the correct Shopify OAuth URL format
    // For app installations, we need to use the shop-specific URL
    const baseUrl = shop ? `https://${shop}/admin/oauth/authorize` : 'https://www.shopify.com/admin/oauth/authorize';
    const authUrl = `${baseUrl}?${querystring.stringify(params)}`;

    console.log('Generated Shopify OAuth URL:', { shop, authUrl });
    return authUrl;
  }

  /**
   * Exchange authorization code for access token and shop info
   * @param code OAuth authorization code
   * @param shop Shop domain
   * @returns Promise resolving to shop info and access token
   */
  public async exchangeCodeForTokenWithShop(code: string, shop: string): Promise<ShopifyOAuthData> {
    try {
      const shopifyConfig = APP_CONFIG.VENDOR.SHOPIFY;

      const requestData = {
        client_id: shopifyConfig.API_KEY,
        client_secret: shopifyConfig.API_SECRET,
        code,
      };

      // Exchange code for access token
      const tokenUrl = `https://${shop}/admin/oauth/access_token`;

      const tokenResponse = await axios.post(tokenUrl, requestData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokenData = tokenResponse.data;

      if (!tokenData.access_token) {
        throw new Error(`No access token received from Shopify: ${tokenData.error || 'Unknown error'}`);
      }

      // Get shop information
      const shopUrl = `https://${shop}/admin/api/${shopifyConfig.API_VERSION}/shop.json`;

      const shopResponse = await axios.get(shopUrl, {
        headers: {
          'X-Shopify-Access-Token': tokenData.access_token,
        },
      });

      const shopData = shopResponse.data;
      const shopInfo: ShopifyShopInfo = shopData.shop;

      return {
        shop,
        access_token: tokenData.access_token,
        scope: tokenData.scope,
        shop_owner: shopInfo.shop_owner,
        shop_email: shopInfo.email,
        shop_name: shopInfo.name,
      };
    } catch (error: any) {
      // Check if it's the specific OAuth error about code already used
      if (
        error.response?.data?.error === 'invalid_request' &&
        error.response?.data?.error_description?.includes('authorization code was not found or was already used')
      ) {
        throw new Error('OAUTH_CODE_ALREADY_USED');
      }

      throw error;
    }
  }

  /**
   * Handle Shopify OAuth login and user management
   * @param oauthData Shopify OAuth data
   * @param ipAddress User's IP address
   * @param deviceInfo Device information
   * @returns Promise resolving to auth response
   */
  public async handleShopifyLogin(oauthData: ShopifyOAuthData, ipAddress: string, deviceInfo?: any): Promise<{ user: any; token: string } | { error: string }> {
    try {
      // First, check if there's already a Shopify connection for this shop
      const existingConnection = await this.prisma.shopifyConnection.findFirst({
        where: { shop: oauthData.shop },
        include: { user: true },
      });

      let user = existingConnection?.user || null;

      // If no existing connection, check if user exists by shop email
      if (!user && oauthData.shop_email) {
        user = await this.prisma.user.findUnique({
          where: { email: oauthData.shop_email },
        });
      }

      if (!user) {
        // Create new user with Shopify data
        const { generateId, getFinancialYear } = await import('@lorrigo/utils');

        const lastUserSequenceNumber = await this.prisma.user.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
        });

        const code = generateId({
          tableName: 'user',
          entityName: oauthData.shop_owner || oauthData.shop_name || 'Shopify User',
          lastUsedFinancialYear: getFinancialYear(new Date()),
          lastSequenceNumber: lastUserSequenceNumber,
        }).id;

        try {
          user = await this.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
              data: {
                code,
                email: oauthData.shop_email!,
                name: oauthData.shop_owner || oauthData.shop_name || 'Shopify User',
                role: 'SELLER',
                phone: '', // Will be required later
                emailVerified: new Date(),
                is_active: true,
                is_verified: true,
              },
            });

            // Create user wallet
            const lastWalletSequenceNumber = await tx.userWallet.count({
              where: {
                created_at: {
                  gte: new Date(new Date().getFullYear(), 0, 1),
                  lte: new Date(new Date().getFullYear(), 11, 31),
                },
              },
            });

            await tx.userWallet.create({
              data: {
                code: generateId({
                  tableName: 'wallet',
                  entityName: newUser.name,
                  lastUsedFinancialYear: getFinancialYear(new Date()),
                  lastSequenceNumber: lastWalletSequenceNumber,
                }).id,
                balance: 0,
                hold_amount: 0,
                usable_amount: 0,
                user_id: newUser.id,
              },
            });

            // Create user profile
            await tx.userProfile.create({
              data: {
                user_id: newUser.id,
                company_name: oauthData.shop_name,
                notification_settings: {
                  whatsapp: true,
                  email: true,
                  sms: true,
                  push: true,
                },
              },
            });

            // Create Shopify connection
            await tx.shopifyConnection.create({
              data: {
                shop: oauthData.shop,
                access_token: oauthData.access_token,
                scope: oauthData.scope,
                user_id: newUser.id,
              },
            });

            return newUser;
          });
        } catch (transactionError) {
          throw transactionError;
        }

        // Send welcome email using notification system (if available)
        try {
          if (this.fastify.notification) {
            await this.fastify.notification.sendWelcomeEmail(oauthData.shop_email!, {
              userName: oauthData.shop_owner || oauthData.shop_name || 'Shopify User',
              loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
            });
          }
        } catch (emailError) {
          // Don't fail registration if email fails
        }
      } else {
        // Update existing Shopify connection
        const existingConnection = await this.prisma.shopifyConnection.findFirst({
          where: {
            shop: oauthData.shop,
            user_id: user.id,
          },
        });

        if (existingConnection) {
          await this.prisma.shopifyConnection.update({
            where: { id: existingConnection.id },
            data: {
              access_token: oauthData.access_token,
              scope: oauthData.scope,
              updated_at: new Date(),
            },
          });
        } else {
          await this.prisma.shopifyConnection.create({
            data: {
              shop: oauthData.shop,
              access_token: oauthData.access_token,
              scope: oauthData.scope,
              user_id: user.id,
            },
          });
        }
      }

      // Ensure user is active
      if (!user.is_active) {
        return { error: 'User account is not active' };
      }

      // Create session and return auth response
      const token = this.fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Create session record
      try {
        await this.prisma.session.create({
          data: {
            sessionToken: token,
            userId: user.id,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            ipAddress,
            userAgent: deviceInfo?.userAgent || '',
            loginMethod: 'shopify',
          },
        });
      } catch (sessionError) {
        throw sessionError;
      }

      const result = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hasPasskeys: user.hasPasskeys || false,
        },
        token,
      };

      // Validate the result before returning
      if (!result.user.id || !result.user.email || !result.token) {
        return { error: 'Invalid login result from Shopify authentication' };
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        return { error: `Failed to authenticate with Shopify: ${error.message}` };
      }
      return { error: 'Failed to authenticate with Shopify' };
    }
  }

  /**
   * Handle login for existing user when OAuth code is already used
   * @param shop Shop domain
   * @param ipAddress User's IP address
   * @returns Promise resolving to auth response
   */
  public async handleExistingUserLogin(shop: string, ipAddress: string): Promise<{ user: any; token: string } | { error: string }> {
    try {
      // Find existing user by shop domain
      const existingConnection = await this.prisma.shopifyConnection.findFirst({
        where: { shop },
        include: { user: true },
      });

      if (!existingConnection?.user) {
        return { error: 'No existing user found for this shop' };
      }

      const user = existingConnection.user;

      // Ensure user is active
      if (!user.is_active) {
        return { error: 'User account is not active' };
      }

      // Create new session for existing user
      const token = this.fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Create session record
      await this.prisma.session.create({
        data: {
          sessionToken: token,
          userId: user.id,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          ipAddress,
          userAgent: '',
          loginMethod: 'shopify',
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hasPasskeys: user.hasPasskeys || false,
        },
        token,
      };
    } catch (error) {
      if (error instanceof Error) {
        return { error: `Failed to authenticate existing user: ${error.message}` };
      }
      return { error: 'Failed to authenticate existing user' };
    }
  }

  /**
   * Verify OAuth state/nonce (without deleting)
   * @param state OAuth state parameter
   * @returns Promise resolving to boolean
   */
  public async verifyState(state: string): Promise<boolean> {
    try {
      const key = `shopify_oauth_nonce:${state}`;
      const exists = await this.fastify.redis.exists(key);
      return exists === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete OAuth state/nonce after successful authentication
   * @param state OAuth state parameter
   */
  public async deleteState(state: string): Promise<void> {
    try {
      const key = `shopify_oauth_nonce:${state}`;
      await this.fastify.redis.del(key);
    } catch (error) {
      // Silently fail state deletion
    }
  }

  /**
   * Generate OAuth URL for Shopify authentication (legacy method)
   * @returns Authentication URL
   */
  public getAuthUrl(): string {
    return this.generateAuthUrl();
  }

  /**
   * Exchange authorization code for access token (required by BaseChannel)
   * @param code OAuth authorization code
   * @returns Promise resolving to connection
   */
  public async exchangeCodeForToken(code: string): Promise<ShopifyConnection | null> {
    try {
      const requestData = {
        client_id: this.apiKey,
        client_secret: this.apiSecret,
        code,
      };

      // Use the full URL directly instead of relying on baseUrl + endpoint
      const fullUrl = `https://${this.shop}/admin/oauth/access_token`;

      // Pass empty string as endpoint and use fullUrl as the auth_url parameter
      const response = await this.makeRequest('', 'POST', requestData, undefined, fullUrl);

      if (response.data && response.data.access_token) {
        const connection: ShopifyConnection = {
          shop: this.shop,
          access_token: response.data.access_token,
          scope: response.data.scope,
          user_id: this.userId,
        };

        // Set the access token for future requests
        this.accessToken = response.data.access_token;

        // Cache the token
        await this.cacheToken(response.data.access_token);

        return connection;
      }

      return null;
    } catch (error) {
      throw error; // Re-throw to allow proper error handling upstream
    }
  }

  /**
   * Disconnect/revoke Shopify access
   * @returns Success status
   */
  public async disconnect(): Promise<boolean> {
    try {
      // Clear the token from cache
      await redis.del(this.tokenCacheKey);

      // Note: Shopify doesn't have a specific endpoint to revoke tokens
      // We just remove it from our system

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch orders from Shopify
   * @param params Query parameters for fetching orders
   * @returns Promise resolving to array of orders
   */
  public async getOrders(params: Record<string, string | number> = {}): Promise<ShopifyOrder[]> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return [];
      }

      const endpoint = APIs.SHOPIFY_ORDERS.replace('{version}', this.apiVersion);

      const response = await this.makeRequest(endpoint + (Object.keys(params).length ? `?${querystring.stringify(params as any)}` : ''), 'GET', undefined, {
        'X-Shopify-Access-Token': token,
      });

      if (response.data && response.data.orders) {
        return response.data.orders;
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Fetch a specific order from Shopify
   * @param orderId Shopify order ID
   * @returns Promise resolving to order details
   */
  public async getOrder(orderId: number | string): Promise<ShopifyOrder | null> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return null;
      }

      const endpoint = APIs.SHOPIFY_ORDER.replace('{version}', this.apiVersion).replace('{id}', orderId.toString());

      const response = await this.makeRequest(endpoint, 'GET', undefined, {
        'X-Shopify-Access-Token': token,
      });

      if (response.data && response.data.order) {
        return response.data.order;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Send tracking information to Shopify order
   * @param shopifyOrderId Shopify order ID
   * @param trackingNumber Tracking number/AWB
   * @param trackingUrl Tracking URL
   * @param tags Optional tags to add to the order
   * @returns Promise resolving to fulfillment response
   */
  public async sendTrackingToShopify(
    shopifyOrderId: string | number,
    trackingNumber: string,
    trackingUrl: string,
    tags?: string[]
  ): Promise<{ success: boolean; fulfillment?: any; error?: string }> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return { success: false, error: 'No access token available' };
      }

      // First, get the order to find the location_id for fulfillment
      const order = await this.getOrder(shopifyOrderId);
      if (!order) {
        return { success: false, error: 'Order not found in Shopify' };
      }

      // Get the primary location ID from the shop
      const shopInfo = await this.getShopInfo();
      if (!shopInfo) {
        return { success: false, error: 'Unable to get shop information' };
      }

      // Create fulfillment data
      const fulfillmentData = {
        fulfillment: {
          location_id: shopInfo.primary_location_id,
          tracking_number: trackingNumber,
          tracking_urls: [trackingUrl],
          notify_customer: true,
          status: 'success',
        },
      };

      // Send fulfillment to Shopify
      const fulfillmentEndpoint = APIs.SHOPIFY_FULFILLMENTS
        .replace('{version}', this.apiVersion)
        .replace('{order_id}', shopifyOrderId.toString());

      const fulfillmentResponse = await this.makeRequest(fulfillmentEndpoint, 'POST', fulfillmentData, {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      });

      if (!fulfillmentResponse.data?.fulfillment) {
        return { success: false, error: 'Failed to create fulfillment in Shopify' };
      }

      // If tags are provided, update the order with new tags
      if (tags && tags.length > 0) {
        const currentTags = order.tags ? order.tags.split(',').map((tag: string) => tag.trim()) : [];
        const newTags = [...new Set([...currentTags, ...tags])]; // Remove duplicates

        const orderUpdateData = {
          order: {
            id: shopifyOrderId,
            tags: newTags.join(', '),
          },
        };

        const orderUpdateEndpoint = APIs.SHOPIFY_ORDER_UPDATE
          .replace('{version}', this.apiVersion)
          .replace('{order_id}', shopifyOrderId.toString());

        try {
          await this.makeRequest(orderUpdateEndpoint, 'PUT', orderUpdateData, {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
          });
        } catch (tagError) {
          console.error('Failed to update order tags:', tagError);
          // Don't fail the entire operation if tag update fails
        }
      }

      return {
        success: true,
        fulfillment: fulfillmentResponse.data.fulfillment,
      };
    } catch (error: any) {
      console.error('Error sending tracking to Shopify:', error);
      return {
        success: false,
        error: error.message || 'Failed to send tracking to Shopify',
      };
    }
  }

  /**
   * Get shop information from Shopify
   * @returns Promise resolving to shop info
   */
  public async getShopInfo(): Promise<ShopifyShopInfo | null> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return null;
      }

      const endpoint = `/admin/api/${this.apiVersion}/shop.json`;

      const response = await this.makeRequest(endpoint, 'GET', undefined, {
        'X-Shopify-Access-Token': token,
      });

      if (response.data && response.data.shop) {
        return response.data.shop;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache token in Redis
   * @param token Access token to cache
   */
  private async cacheToken(token: string): Promise<void> {
    try {
      await redis.set(this.tokenCacheKey, token, 'EX', 86400); // 24 hours
    } catch (error) {
      // Silently fail token caching
    }
  }

  /**
   * Generate authentication token (required by BaseChannel)
   * @returns Promise resolving to cached token
   */
  protected async generateToken(): Promise<string | null> {
    // For Shopify, we don't generate tokens automatically
    // Tokens are obtained through OAuth flow
    return this.accessToken;
  }
}
