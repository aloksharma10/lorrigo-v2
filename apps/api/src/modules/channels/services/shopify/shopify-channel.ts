import { APP_CONFIG } from '@/config/app';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { BaseChannel } from '../base-channel';
import { redis } from '@/lib/redis';
import querystring from 'querystring';
import crypto from 'crypto';

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
 * Shopify OAuth connection parameters
 */
export interface ShopifyConnection {
  shop: string;
  access_token: string;
  scope: string;
  user_id: string;
}

/**
 * Shopify channel implementation
 * Handles OAuth authentication and order fetching from Shopify
 */
export class ShopifyChannel extends BaseChannel {
  private shop: string;
  private apiSecret: string;
  private apiVersion: string;
  private scopes: string;
  private redirectUri: string;
  private accessToken: string | null;

  constructor(shop: string, userId: string, accessToken?: string) {
    const shopifyConfig = APP_CONFIG.VENDOR.SHOPIFY;

    super(
      'Shopify',
      `https://${shop}`,
      shopifyConfig.API_KEY,
      userId,
      `${CACHE_KEYS.SHOPIFY_TOKEN}:${shop}:${userId}`
    );

    this.shop = shop;
    this.apiSecret = shopifyConfig.API_SECRET;
    this.apiVersion = shopifyConfig.API_VERSION;
    this.scopes = shopifyConfig.SCOPES;
    this.redirectUri = shopifyConfig.REDIRECT_URI;
    this.accessToken = accessToken || null;
  }

  /**
   * Generate OAuth URL for Shopify authentication
   * @returns Authentication URL
   */
  public getAuthUrl(): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    
    const params = {
      client_id: this.apiKey,
      scope: this.scopes,
      redirect_uri: this.redirectUri,
      state: nonce,
      'grant_options[]': 'per-user',
    };

    console.log(`Generating auth URL for shop: ${this.shop} with redirect: ${this.redirectUri}`);
    const authUrl = `https://${this.shop}/admin/oauth/authorize?${querystring.stringify(params)}`;
    console.log(`Generated auth URL: ${authUrl}`);
    
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   * @param code OAuth authorization code
   * @returns Promise resolving to access token
   */
  public async exchangeCodeForToken(code: string): Promise<ShopifyConnection | null> {
    try {
      console.log(`Exchanging code for token for shop: ${this.shop}`);
      
      const requestData = {
        client_id: this.apiKey,
        client_secret: this.apiSecret,
        code,
      };
      
      // Use the full URL directly instead of relying on baseUrl + endpoint
      const fullUrl = `https://${this.shop}/admin/oauth/access_token`;
      console.log(`Making request to ${fullUrl}`);
      
      // Pass empty string as endpoint and use fullUrl as the auth_url parameter
      const response = await this.makeRequest('', 'POST', requestData, undefined, fullUrl);

      console.log('Token response status:', response.status);

      if (response.data && response.data.access_token) {
        console.log('Successfully obtained access token');
        
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

      console.error('Failed to exchange code for token. Response:', response.data);
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
      console.error('Error disconnecting Shopify:', error);
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
        console.error('Failed to get Shopify authentication token');
        return [];
      }

      const endpoint = APIs.SHOPIFY_ORDERS.replace('{version}', this.apiVersion);

      const response = await this.makeRequest(
        endpoint + (Object.keys(params).length ? `?${querystring.stringify(params as any)}` : ''),
        'GET',
        undefined,
        {
          'X-Shopify-Access-Token': token,
        }
      );

      if (response.data && response.data.orders) {
        return response.data.orders;
      }

      console.error('Failed to fetch orders:', response.data);
      return [];
    } catch (error) {
      console.error('Error fetching orders:', error);
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
        console.error('Failed to get Shopify authentication token');
        return null;
      }

      const endpoint = APIs.SHOPIFY_ORDER.replace('{version}', this.apiVersion).replace(
        '{id}',
        orderId.toString()
      );

      const response = await this.makeRequest(endpoint, 'GET', undefined, {
        'X-Shopify-Access-Token': token,
      });

      if (response.data && response.data.order) {
        return response.data.order;
      }

      console.error('Failed to fetch order:', response.data);
      return null;
    } catch (error) {
      console.error('Error fetching order:', error);
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
      console.error('Error caching token:', error);
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