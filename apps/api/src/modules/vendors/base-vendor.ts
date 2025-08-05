import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { redis } from '@/lib/redis';
import { CACHE_TTL } from '@/config/cache';
import {
  VendorRegistrationResult,
  VendorServiceabilityResult,
  VendorShipmentResult,
  VendorPickupResult,
  VendorCancellationResult,
  VendorTrackingResult,
  ShipmentTrackingData,
  NDRData,
  VendorNDRResult,
} from '@/types/vendor';
import { ShipmentBucketManager } from '@lorrigo/utils';

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
    this.tokenCacheKey = tokenCacheKey || `${name.toLowerCase()}_token`;
  }

  /**
   * Get vendor name
   * @returns Vendor name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get authentication token
   * @returns Promise resolving to auth token
   */
  protected async getAuthToken(): Promise<string | null> {
    try {
      // Try to get token from cache first
      const cachedToken = await redis.get(this.tokenCacheKey);
      if (cachedToken) {
        return cachedToken;
      }

      // Generate new token
      const token = await this.generateToken();
      if (token) {
        // Cache token with TTL
        await redis.set(this.tokenCacheKey, token, 'EX', CACHE_TTL.VENDOR_TOKEN);
      }

      return token;
    } catch (error) {
      console.error(`Error getting auth token for ${this.name}:`, error);
      return null;
    }
  }

  /**
   * Generate authentication token
   * @returns Promise resolving to auth token
   */
  protected abstract generateToken(): Promise<string | null>;

  /**
   * Make HTTP request to vendor API
   * @param endpoint API endpoint
   * @param method HTTP method
   * @param data Request data
   * @param headers Request headers
   * @param customUrl Custom URL to override baseUrl
   * @returns Promise resolving to response
   */
  protected async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data: any = null,
    headers: any = {},
    customUrl?: string
  ): Promise<AxiosResponse> {
    try {
      const url = customUrl || `${this.baseUrl}${endpoint}`;
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

      return await axios(config);
    } catch (error: any) {
      console.error(`Error in ${method} request to ${`${this.baseUrl}${endpoint}`}:`, error.message);

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
   * Check if a status indicates RTO (Return to Origin)
   * @param status Status text
   * @param statusCode Optional status code
   * @returns True if status indicates RTO
   */
  protected isRTOStatus(status: string, statusCode?: string): boolean {
    // Common RTO status patterns
    const rtoPatterns = [/rto/i, /return to origin/i, /returned/i, /returning/i, /return initiated/i, /return in progress/i, /return completed/i];

    // Check status text
    for (const pattern of rtoPatterns) {
      if (pattern.test(status)) {
        return true;
      }
    }

    // Check status code if provided
    if (statusCode) {
      for (const pattern of rtoPatterns) {
        if (pattern.test(statusCode)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a status indicates delivered
   * @param status Status text
   * @param statusCode Optional status code
   * @returns True if status indicates delivered
   */
  protected isDeliveredStatus(status: string, statusCode?: string): boolean {
    // Common delivered status patterns
    const deliveredPatterns = [/delivered/i, /delivery complete/i, /successfully delivered/i, /completed/i];

    // Check status text
    for (const pattern of deliveredPatterns) {
      if (pattern.test(status)) {
        return true;
      }
    }

    // Check status code if provided
    if (statusCode) {
      for (const pattern of deliveredPatterns) {
        if (pattern.test(statusCode)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Map vendor status to Lorrigo bucket using database-first approach
   * This method should be overridden by vendor implementations to use BucketMappingService
   * @param status Status text
   * @param statusCode Optional status code
   * @returns Bucket number or undefined if no match
   */
  protected async mapStatusToBucket(status: string, statusCode?: string): Promise<number | undefined> {
    // Fallback to keyword-based detection if bucket mapping service is not available
    return ShipmentBucketManager.detectBucketFromVendorStatus(status, statusCode || '', this.name.toUpperCase());
  }

  /**
   * Handle hub registration errors
   * @param error Error object from hub registration
   * @param vendorName Vendor name for error message
   * @returns Registration result with appropriate success/failure status
   */
  protected handleHubRegistrationError(error: any, vendorName: string = this.name): VendorRegistrationResult {
    // Check for common patterns indicating hub already exists
    const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || '';
    const errorData = error?.response?.data || {};

    // Check for various error patterns that indicate hub already exists
    const hubExistsPatterns = [/already exists/i, /already registered/i, /duplicate/i, /already in use/i, /already added/i];

    // Check if any pattern matches the error message
    const isHubExists = hubExistsPatterns.some((pattern) => pattern.test(errorMessage));

    // If hub already exists, return success
    if (isHubExists) {
      return {
        success: true,
        message: `Hub already registered with ${vendorName}`,
        data: errorData,
      };
    }

    // Otherwise return failure with error message
    return {
      success: false,
      message: errorMessage || `Failed to register hub with ${vendorName}`,
      data: errorData,
    };
  }

  /**
   * Check serviceability with vendor
   * @param pickupPincode Pickup pincode
   * @param deliveryPincode Delivery pincode
   * @param weight Weight in kg
   * @param dimensions Package dimensions
   * @param paymentType Payment type (0 for prepaid, 1 for COD)
   * @param collectableAmount Collectable amount for COD
   * @param couriers List of courier IDs to check
   * @returns Promise resolving to serviceability result
   */
  public abstract checkServiceability(
    isReverseOrder: boolean,
    pickupPincode: string,
    deliveryPincode: string,
    volumetricWeight: number,
    dimensions: { length: number; width: number; height: number; weight: number },
    paymentType: 0 | 1,
    orderValue: number,
    collectableAmount?: number,
    couriers?: string[]
  ): Promise<VendorServiceabilityResult>;

  /**
   * Register a hub with vendor
   * @param hubData Hub data for registration
   * @returns Promise resolving to registration result
   */
  public abstract registerHub(hubData: any): Promise<VendorRegistrationResult>;

  /**
   * Create shipment with vendor
   * @param shipmentData Shipment data
   * @returns Promise resolving to shipment result
   */
  public abstract createShipment(shipmentData: any): Promise<VendorShipmentResult>;

  /**
   * Schedule pickup with vendor
   * @param pickupData Pickup data
   * @returns Promise resolving to pickup result
   */
  public abstract schedulePickup(pickupData: any): Promise<VendorPickupResult>;

  /**
   * Cancel shipment with vendor
   * @param cancelData Cancel data
   * @returns Promise resolving to cancellation result
   */
  public abstract cancelShipment(cancelData: any): Promise<VendorCancellationResult>;

  /**
   * Track shipment with vendor
   * @param trackingData Tracking data
   * @returns Promise resolving to tracking result
   */
  public abstract trackShipment(trackingData: ShipmentTrackingData): Promise<VendorTrackingResult>;

  public abstract ndrAction(ndrData: NDRData): Promise<VendorNDRResult>;
}
