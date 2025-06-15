import { APP_CONFIG } from '@/config/app';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { BaseVendor } from '../vendors/base-vendor';
import { VendorRegistrationResult, VendorServiceabilityResult, VendorShipmentResult } from '@/types/vendor';
import querystring from 'querystring';
import crypto from 'crypto';
import { redis } from '@/lib/redis';

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
 * Shopify vendor implementation
 * Handles OAuth authentication and order fetching from Shopify
 */
export class ShopifyVendor extends BaseVendor {
  private shop: string;
  protected apiKey: string;
  private apiSecret: string;
  private apiVersion: string;
  private scopes: string;
  private redirectUri: string;
  private accessToken: string | null;
  private userId: string;

  constructor(shop: string, userId: string, accessToken?: string) {
    const shopifyConfig = APP_CONFIG.VENDOR.SHOPIFY;

    super(
      'Shopify',
      `https://${shop}`,
      shopifyConfig.API_KEY,
      `${CACHE_KEYS.SHOPIFY_TOKEN}:${shop}:${userId}`
    );

    this.shop = shop;
    this.apiKey = shopifyConfig.API_KEY;
    this.apiSecret = shopifyConfig.API_SECRET;
    this.apiVersion = shopifyConfig.API_VERSION;
    this.scopes = shopifyConfig.SCOPES;
    this.redirectUri = shopifyConfig.REDIRECT_URI;
    this.accessToken = accessToken || null;
    this.userId = userId;
  }

  /**
   * Generate OAuth URL for Shopify authentication
   * @returns Authentication URL
   */
  public getAuthUrl(): string {
    const params = {
      client_id: this.apiKey,
      scope: this.scopes,
      redirect_uri: this.redirectUri,
      state: crypto.randomBytes(16).toString('hex'),
      'grant_options[]': 'per-user',
    };

    return `https://${this.shop}${APIs.SHOPIFY_OAUTH}?${querystring.stringify(params)}`;
  }

  /**
   * Exchange authorization code for access token
   * @param code OAuth authorization code
   * @returns Promise resolving to access token
   */
  public async exchangeCodeForToken(code: string): Promise<ShopifyConnection | null> {
    try {
      const response = await this.makeRequest(APIs.SHOPIFY_TOKEN, 'POST', {
        client_id: this.apiKey,
        client_secret: this.apiSecret,
        code,
      });

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

      console.error('Failed to exchange code for token:', response.data);
      return null;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      return null;
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
  public async getOrder(orderId: number): Promise<ShopifyOrder | null> {
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
   * Generate authentication token (required by BaseVendor)
   * @returns Promise resolving to cached token
   */
  protected async generateToken(): Promise<string | null> {
    // For Shopify, we don't generate tokens automatically
    // Tokens are obtained through OAuth flow
    return this.accessToken;
  }

  /**
   * Register hub (required by BaseVendor but not applicable for Shopify)
   * @returns Promise resolving to registration result
   */
  public async registerHub(): Promise<VendorRegistrationResult> {
    // Not applicable for Shopify
    return {
      success: false,
      message: 'Hub registration not applicable for Shopify',
      data: null,
    };
  }

  /**
   * Create shipment (required by BaseVendor but not applicable for Shopify)
   * @returns Promise resolving to shipment result
   */
  public async createShipment(): Promise<VendorShipmentResult> {
    // Not applicable for Shopify
    return {
      success: false,
      message: 'Shipment creation not applicable for Shopify',
      data: null,
    };
  }

  /**
   * Check serviceability for Shopify
   * Implementation of abstract method from BaseVendor
   * @param pickupPincode Pickup pincode
   * @param deliveryPincode Delivery pincode
   * @param volumeWeight Volume weight in kg
   * @param dimensions Package dimensions
   * @param paymentType Payment type (0 for prepaid, 1 for COD)
   * @param collectableAmount Collectable amount for COD
   * @param couriers List of courier IDs to check
   * @param isReverseOrder Whether this is a reverse order
   * @param couriersData Additional courier data
   * @returns Promise resolving to serviceability result
   */
  public async checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
    volumeWeight: number,
    dimensions: { length: number; width: number; height: number; weight: number },
    paymentType: 0 | 1,
    collectableAmount?: number,
    couriers?: string[],
    isReverseOrder?: boolean,
    couriersData?: any
  ): Promise<VendorServiceabilityResult> {
    // Shopify doesn't provide direct serviceability check
    // This is a placeholder implementation
    return {
      success: false,
      message: 'Serviceability check not applicable for Shopify',
      serviceableCouriers: [],
    };
  }
}

/**
 * Get orders from Shopify for a specific user connection
 * @param shopifyConnection Shopify connection details
 * @param params Query parameters for fetching orders
 * @returns Promise resolving to array of orders
 */
export async function getShopifyOrders(
  shopifyConnection: ShopifyConnection,
  params: Record<string, string | number> = {}
): Promise<ShopifyOrder[]> {
  const { shop, user_id, access_token } = shopifyConnection;

  const shopifyVendor = new ShopifyVendor(shop, user_id, access_token);
  return shopifyVendor.getOrders(params);
}

/**
 * Get a specific order from Shopify
 * @param shopifyConnection Shopify connection details
 * @param orderId Shopify order ID
 * @returns Promise resolving to order details
 */
export async function getShopifyOrder(
  shopifyConnection: ShopifyConnection,
  orderId: number
): Promise<ShopifyOrder | null> {
  const { shop, user_id, access_token } = shopifyConnection;

  const shopifyVendor = new ShopifyVendor(shop, user_id, access_token);
  return shopifyVendor.getOrder(orderId);
}

/**
 * Create Shopify OAuth URL for a shop
 * @param shop Shopify shop domain (e.g., your-store.myshopify.com)
 * @param userId User ID for the connection
 * @returns OAuth URL
 */
export function createShopifyAuthUrl(shop: string, userId: string): string {
  const shopifyVendor = new ShopifyVendor(shop, userId);
  return shopifyVendor.getAuthUrl();
}

/**
 * Exchange OAuth code for access token
 * @param shop Shopify shop domain
 * @param userId User ID for the connection
 * @param code OAuth authorization code
 * @returns Promise resolving to connection details
 */
export async function exchangeShopifyCodeForToken(
  shop: string,
  userId: string,
  code: string
): Promise<ShopifyConnection | null> {
  const shopifyVendor = new ShopifyVendor(shop, userId);
  return shopifyVendor.exchangeCodeForToken(code);
}
