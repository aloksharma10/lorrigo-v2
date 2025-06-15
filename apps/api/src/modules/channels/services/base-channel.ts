import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { redis } from '@/lib/redis';
import { CACHE_TTL } from '@/config/cache';

/**
 * Base class for all channel implementations (Shopify, WooCommerce, etc.)
 * Contains common functionality for channel API interactions
 */
export abstract class BaseChannel {
  protected name: string;
  protected baseUrl: string;
  protected apiKey: string;
  protected userId: string;
  protected tokenCacheKey: string;

  constructor(
    name: string,
    baseUrl: string,
    apiKey: string,
    userId: string,
    tokenCacheKey?: string
  ) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.userId = userId;
    this.tokenCacheKey = tokenCacheKey || `channel:token:${name.toLowerCase()}:${userId}`;
  }

  /**
   * Get channel name
   * @returns Channel name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get user ID associated with this channel connection
   * @returns User ID
   */
  public getUserId(): string {
    return this.userId;
  }

  /**
   * Get authentication token from cache or generate a new one
   * @returns Promise resolving to auth token
   */
  public async getAuthToken(): Promise<string | null> {
    try {
      // Try to get token from cache first
      const cachedToken = await redis.get(this.tokenCacheKey);
      if (cachedToken) {
        return cachedToken;
      }
      // If not in cache, fetch new token
      const token = await this.generateToken();
      // Cache the token if successful
      if (token) {
        await redis.set(this.tokenCacheKey, token, 'EX', CACHE_TTL.VENDOR_TOKEN);
      }
      return token;
    } catch (error) {
      console.error(`Error getting ${this.name} auth token:`, error);
      return null;
    }
  }

  /**
   * Make an API request to the channel
   * @param endpoint API endpoint
   * @param method HTTP method
   * @param data Request payload
   * @param headers Additional headers
   * @returns Promise resolving to API response
   */
  protected async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    headers?: Record<string, string>,
    auth_url?: string
  ): Promise<AxiosResponse> {
    try {
      // If auth_url is provided, use it directly; otherwise construct URL from baseUrl + endpoint
      const url = auth_url || `${this.baseUrl}${endpoint}`;
      
      const config: AxiosRequestConfig = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (data) {
        config.data = data;
      }

      console.log(`Making ${method} request to ${url}`);
      const response = await axios(config);
      return response;
    } catch (error: any) {
      console.error(`Error in ${method} request to ${auth_url || `${this.baseUrl}${endpoint}`}:`, error.message);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
      }
      
      throw error;
    }
  }

  /**
   * Abstract method to generate authentication token
   * Must be implemented by each channel class
   */
  protected abstract generateToken(): Promise<string | null>;

  /**
   * Generate OAuth URL for authorization
   * @returns Authorization URL
   */
  public abstract getAuthUrl(): string;

  /**
   * Exchange authorization code for access token
   * @param code Authorization code
   * @returns Connection details
   */
  public abstract exchangeCodeForToken(code: string): Promise<any>;

  /**
   * Disconnect/revoke channel access
   * @returns Success status
   */
  public abstract disconnect(): Promise<boolean>;

  /**
   * Fetch orders from the channel
   * @param params Query parameters
   * @returns List of orders
   */
  public abstract getOrders(params?: Record<string, any>): Promise<any[]>;

  /**
   * Fetch a specific order from the channel
   * @param orderId Order ID
   * @returns Order details
   */
  public abstract getOrder(orderId: string | number): Promise<any | null>;
} 