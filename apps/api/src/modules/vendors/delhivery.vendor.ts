import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { formatPhoneNumber } from '@lorrigo/utils';
import { VendorRegistrationResult } from '@/types/vendor';

/**
 * Delhivery vendor implementation
 * Handles token generation and hub registration with Delhivery API
 */
export class DelhiveryVendor extends BaseVendor {
  private weightCategory: '0.5' | '5' | '10';
  
  constructor(weightCategory: '0.5' | '5' | '10' = '5') {
    const vendorConfig = APP_CONFIG.VENDOR.DELHIVERY;
    let apiKey = '';
    let tokenCacheKey = '';
    
    // Set API key and cache key based on weight category
    switch (weightCategory) {
      case '0.5':
        apiKey = vendorConfig.API_KEY_0_5 || '';
        tokenCacheKey = CACHE_KEYS.DELHIVERY_TOKEN_POINT_5;
        break;
      case '5':
        apiKey = vendorConfig.API_KEY_5 || '';
        tokenCacheKey = CACHE_KEYS.DELHIVERY_TOKEN_5;
        break;
      case '10':
        apiKey = vendorConfig.API_KEY_10 || '';
        tokenCacheKey = CACHE_KEYS.DELHIVERY_TOKEN_10;
        break;
    }
    
    super(
      `Delhivery-${weightCategory}`,
      vendorConfig.API_BASEURL || '',
      apiKey,
      tokenCacheKey
    );
    
    this.weightCategory = weightCategory;
  }
  
  /**
   * Generate Delhivery authentication token
   * Note: Delhivery uses direct API key for authentication
   * @returns Promise resolving to auth token
   */
  protected async generateToken(): Promise<string | null> {
    // Delhivery uses direct API key, so we'll just return it
    return this.apiKey || null;
  }
  
  /**
   * Register a hub with Delhivery
   * @param hubData Hub data for registration
   * @returns Promise resolving to registration result
   */
  public async registerHub(hubData: any): Promise<VendorRegistrationResult> {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          message: `Failed to get Delhivery ${this.weightCategory} kg authentication token`,
          data: null,
        };
      }
      
      const apiConfig = {
        Authorization: token,
      };
      
      const payload = {
        name: hubData.name,
        email: "noreply@lorrigo.com",
        phone: formatPhoneNumber(hubData.phone),
        address: hubData.address1,
        city: hubData.city,
        country: "India",
        pin: hubData.pincode.toString(),
        return_address: hubData.isRTOAddressSame ? hubData.address1 : hubData.rtoAddress,
        return_pin: hubData.isRTOAddressSame ? hubData.pincode.toString() : hubData.rtoPincode?.toString(),
        return_city: hubData.isRTOAddressSame ? hubData.city : hubData.rtoCity,
        return_state: hubData.isRTOAddressSame ? hubData.state : hubData.rtoState,
        return_country: "India"
      };
      
      const response = await this.makeRequest(
        APIs.DELHIVERY_PICKUP_LOCATION,
        'POST',
        payload,
        apiConfig
      );
      
      return {
        success: true,
        message: `Hub registered with Delhivery ${this.weightCategory} kg`,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`Error registering hub with Delhivery ${this.weightCategory}:`, error);
      
      return {
        success: false,
        message: error.response?.data || error.message,
        data: null,
      };
    }
  }
}

/**
 * Factory for creating Delhivery vendor instances for different weight categories
 */
export class DelhiveryVendorFactory {
  /**
   * Get all Delhivery vendor instances for all weight categories
   * @returns Array of Delhivery vendor instances
   */
  public static getAllVendors(): DelhiveryVendor[] {
    return [
      new DelhiveryVendor('0.5'),
      new DelhiveryVendor('5'),
      new DelhiveryVendor('10'),
    ];
  }
  
  /**
   * Get Delhivery vendor instance for a specific weight category
   * @param weightCategory Weight category
   * @returns Delhivery vendor instance
   */
  public static getVendor(weightCategory: '0.5' | '5' | '10'): DelhiveryVendor {
    return new DelhiveryVendor(weightCategory);
  }
} 