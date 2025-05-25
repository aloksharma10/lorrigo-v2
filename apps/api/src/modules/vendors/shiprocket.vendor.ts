import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { formatAddress, formatPhoneNumber } from '@lorrigo/utils';
import { VendorRegistrationResult } from '@/types/vendor';

/**
 * Shiprocket vendor implementation
 * Handles token generation and hub registration with Shiprocket API
 */
export class ShiprocketVendor extends BaseVendor {
  private email: string;
  private password: string;
  
  constructor() {
    const vendorConfig = APP_CONFIG.VENDOR.SHIPROCKET;
    super(
      'Shiprocket',
      vendorConfig.API_BASEURL || '',
      vendorConfig.API_KEY,
      CACHE_KEYS.SHIPROCKET_TOKEN
    );
    this.email = vendorConfig.EMAIL || '';
    this.password = vendorConfig.PASSWORD || '';
  }
  
  /**
   * Generate Shiprocket authentication token
   * @returns Promise resolving to auth token
   */
  protected async generateToken(): Promise<string | null> {
    try {
      if (!this.email || !this.password) {
        console.error('Shiprocket credentials not found in environment variables');
        return null;
      }
      
      const response = await this.makeRequest(
        APIs.SHIPROCKET_AUTH,
        'POST',
        {
          email: this.email,
          password: this.password,
        }
      );
      
      if (response.data && response.data.token) {
        return `Bearer ${response.data.token}`;
      }
      
      console.error('Shiprocket token generation failed:', response.data);
      return null;
    } catch (error) {
      console.error('Error generating Shiprocket token:', error);
      return null;
    }
  }
  
  /**
   * Register a hub with Shiprocket
   * @param hubData Hub data for registration
   * @returns Promise resolving to registration result
   */
  public async registerHub(hubData: any): Promise<VendorRegistrationResult> {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          message: 'Failed to get Shiprocket authentication token',
          data: null,
        };
      }
      
      const apiConfig = {
        Authorization: token,
      };
      
      // Format address according to Shiprocket requirements
      const modifiedAddress = formatAddress(hubData.address1);
      
      const payload = {
        pickup_location: hubData.name,
        name: hubData.name,
        email: "noreply@lorrigo.com",
        phone: formatPhoneNumber(hubData.phone),
        address: modifiedAddress,
        address_2: hubData.address2 || "",
        city: hubData.city,
        state: hubData.state,
        country: "India",
        pin_code: hubData.pincode,
      };
      
      const response = await this.makeRequest(
        APIs.CREATE_PICKUP_LOCATION,
        'POST',
        payload,
        apiConfig
      );
      
      return {
        success: true,
        message: `Hub registered with Shiprocket`,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error registering hub with Shiprocket:', error);
      
      // Check if error is due to existing hub but inactive
      const isExistingHub = error?.response?.data?.errors?.pickup_location?.[0]?.includes("Address nick name already in use");
      const isExistingHubButInactive = error?.response?.data?.message?.includes("Address name already exists");
      
      if (isExistingHubButInactive) {
        return {
          success: false,
          message: "The address name you entered is already in use. Please choose a unique name.",
          data: null,
        };
      }
      
      // If it's an existing hub but not inactive, consider it a success
      if (isExistingHub) {
        return {
          success: true,
          message: "Hub already exists",
          data: null,
        };
      }
      
      return {
        success: false,
        message: error.response?.data || error.message,
        data: null,
      };
    }
  }
}

/**
 * ShiprocketB2B vendor implementation
 * Handles token generation and hub registration with Shiprocket B2B API
 */
export class ShiprocketB2BVendor extends BaseVendor {
  private clientId: string;
  
  constructor() {
    const vendorConfig = APP_CONFIG.VENDOR.SHIPROCKET;
    super(
      'ShiprocketB2B',
      vendorConfig.API_BASEURL || '',
      vendorConfig.API_KEY,
      CACHE_KEYS.SHIPROCKET_B2B_TOKEN
    );
    this.clientId = '';  // Will be set dynamically
  }
  
  /**
   * Set Shiprocket B2B client ID
   * @param clientId The client ID to set
   */
  public setClientId(clientId: string): void {
    this.clientId = clientId;
  }
  
  /**
   * Generate Shiprocket B2B authentication token (placeholder)
   * In a real implementation, this would fetch the token from the B2B API
   * @returns Promise resolving to auth token
   */
  protected async generateToken(): Promise<string | null> {
    // In a real implementation, this would fetch the token from the B2B API
    // For now, returning null as we'll use the token passed to registerHub
    return null;
  }
  
  /**
   * Register a hub with Shiprocket B2B
   * @param hubData Hub data for registration
   * @param token Pre-generated Shiprocket B2B token
   * @returns Promise resolving to registration result
   */
  public async registerHub(hubData: any, token?: string): Promise<VendorRegistrationResult> {
    try {
      if (!token) {
        return {
          success: false,
          message: 'Shiprocket B2B token not provided',
          data: null,
        };
      }
      
      if (!this.clientId) {
        return {
          success: false,
          message: 'Shiprocket B2B client ID not set',
          data: null,
        };
      }
      
      const apiConfig = {
        Authorization: token,
      };
      
      const payload = {
        name: hubData.name,
        client_id: this.clientId,
        address: {
          address_line_1: hubData.address1,
          address_line_2: hubData.address2 || '',
          pincode: hubData.pincode.toString(),
          city: hubData.city,
          state: hubData.state,
          country: 'India',
        },
        warehouse_code: `wh_${hubData.pincode}`,
        contact_person_name: hubData.contactPersonName,
        contact_person_email: 'noreply@lorrigo.com',
        contact_person_contact_no: formatPhoneNumber(hubData.phone),
      };
      
      const response = await this.makeRequest(
        APIs.CREATE_HUB_B2B_SHIPROCKET,
        'POST',
        payload,
        apiConfig
      );
      
      return {
        success: true,
        message: `Hub registered`,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error registering hub:', error);
      
      return {
        success: false,
        message: error.response?.data || error.message,
        data: null,
      };
    }
  }
} 