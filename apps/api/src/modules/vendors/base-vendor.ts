import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { redis } from '@/lib/redis';
import { CACHE_TTL } from '@/config/cache';
import { VendorRegistrationResult, VendorServiceabilityResult, VendorShipmentResult, VendorPickupResult, VendorCancellationResult } from '@/types/vendor';

/**
 * Base class for all vendor implementations
 * Contains common functionality for vendor API interactions
 */
export abstract class BaseVendor {
  protected name: string;
  protected baseUrl: string;
  protected apiKey?: string;
  protected tokenCacheKey: string;

  constructor(name: string, baseUrl: string, apiKey?: string, tokenCacheKey?: string) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.tokenCacheKey = tokenCacheKey || `vendor:token:${name.toLowerCase()}`;
  }

  /**
   * Get vendor name
   * @returns Vendor name
   */
  public getName(): string {
    return this.name;
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
   * Make an API request to the vendor
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
    const config: AxiosRequestConfig = {
      method,
      url: auth_url ? auth_url : `${this.baseUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (data) {
      config.data = data;
    }

    return axios(config);
  }

  /**
   * Abstract method to generate authentication token
   * Must be implemented by each vendor class
   */
  protected abstract generateToken(): Promise<string | null>;

  /**
   * Abstract method to register a hub/pickup location
   * Must be implemented by each vendor class
   */
  public abstract registerHub(hubData: any): Promise<VendorRegistrationResult>;

  /**
   * Abstract method to create a shipment
   * Must be implemented by each vendor class
   */
  public abstract createShipment(shipmentData: any): Promise<VendorShipmentResult>;

  /**
   * Abstract method to check serviceability
   * Must be implemented by each vendor class
   * @param pickupPincode Pickup pincode
   * @param deliveryPincode Delivery pincode
   * @param volumeWeight Volume weight in kg
   * @param dimensions Package dimensions
   * @param paymentType Payment type (0 for prepaid, 1 for COD)
   * @param collectableAmount Collectable amount for COD
   * @param couriers List of courier IDs to check
   * @returns Promise resolving to serviceability result
   */
  public abstract checkServiceability(
    pickupPincode: string, 
    deliveryPincode: string, 
    volumeWeight: number, 
    dimensions: { length: number; width: number; height: number, weight: number }, 
    paymentType: 0 | 1, 
    collectableAmount?: number,
    couriers?: string[],
    isReverseOrder?: boolean,
    couriersData?: any
  ): Promise<VendorServiceabilityResult>;
  
  /**
   * Schedule pickup for a shipment
   * @param pickupData Pickup data including AWB, pickup date, and related info
   * @returns Promise resolving to pickup scheduling result
   */
  public async schedulePickup(
    pickupData: {
      awb: string;
      pickupDate: string;
      hub: any;
      shipment: any;
    }
  ): Promise<VendorPickupResult> {
    return {
      success: false,
      message: `Pickup scheduling not implemented for ${this.name}`,
      data: null,
    };
  }
  
  /**
   * Cancel a shipment
   * @param cancelData Cancellation data including AWB and shipment details
   * @returns Promise resolving to cancellation result
   */
  public async cancelShipment(
    cancelData: {
      awb: string;
      shipment: any;
    }
  ): Promise<VendorCancellationResult> {
    return {
      success: false,
      message: `Shipment cancellation not implemented for ${this.name}`,
      data: null,
    };
  }
}
