import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { VendorRegistrationResult } from '@/types/vendor';

/**
 * SmartShip vendor implementation
 * Handles token generation and hub registration with SmartShip API
 */
export class SmartShipVendor extends BaseVendor {
  private email: string;
  private password: string;

  constructor() {
    const vendorConfig = APP_CONFIG.VENDOR.SMART_SHIP;
    super(
      'SmartShip',
      vendorConfig.API_BASEURL || '',
      vendorConfig.API_KEY,
      CACHE_KEYS.SMARTSHIP_TOKEN
    );
    this.email = vendorConfig.EMAIL || '';
    this.password = vendorConfig.PASSWORD || '';
  }

  /**
   * Generate SmartShip authentication token
   * @returns Promise resolving to auth token
   */
  protected async generateToken(): Promise<string | null> {
    try {
      if (!this.email || !this.password) {
        console.error('SmartShip credentials not found in environment variables');
        return null;
      }

      const response = await this.makeRequest(
        APIs.SMARTSHIP_AUTH,
        'POST',
        {
          email: this.email,
          password: this.password,
        }
      );

      if (response.data && response.data.token) {
        return response.data.token;
      }

      console.error('SmartShip token generation failed:', response.data);
      return null;
    } catch (error) {
      console.error('Error generating SmartShip token:', error);
      return null;
    }
  }

  /**
   * Register a hub with SmartShip
   * @param hubData Hub data for registration
   * @param deliveryTypeId Delivery type ID (1 for express, 2 for surface)
   * @returns Promise resolving to registration result
   */
  public async registerHub(
    hubData: any,
    deliveryTypeId: number = 2
  ): Promise<VendorRegistrationResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get SmartShip authentication token',
          data: null,
        };
      }

      const apiConfig = {
        Authorization: token,
      };

      const payload = {
        hub_details: {
          hub_name: hubData.name,
          pincode: hubData.pincode,
          city: hubData.city,
          state: hubData.state,
          address1: hubData.address1,
          address2: hubData.address2 || '',
          hub_phone: hubData.phone,
          delivery_type_id: deliveryTypeId, // 1 for express, 2 for surface
        },
      };

      const response = await this.makeRequest(
        APIs.HUB_REGISTRATION,
        'POST',
        payload,
        apiConfig
      );

      const smartShipData = response.data as {
        status: boolean;
        data: {
          hub_id?: number;
          message?: {
            registered_hub_id?: string;
          };
        };
      };

      // Extract hub_id from the response
      let hubId = 0;
      if (smartShipData.status && smartShipData.data.hub_id) {
        hubId = smartShipData.data.hub_id;
      } else if (smartShipData.data.message?.registered_hub_id) {
        hubId = Number(smartShipData.data.message.registered_hub_id);
      }

      return {
        success: true,
        message: `Hub registered with SmartShip`,
        data: {
          hubId,
          deliveryTypeId,
          response: smartShipData
        },
      };
    } catch (error: any) {
      console.error('Error registering hub with SmartShip:', error);

      return {
        success: false,
        message: error.response?.data || error.message,
        data: null,
      };
    }
  }

  /**
   * Register a hub with both express and surface delivery types
   * @param hubData Hub data for registration
   * @returns Promise resolving to registration result
   */
  public async registerHubWithBothDeliveryTypes(hubData: any): Promise<VendorRegistrationResult> {
    try {
      // Register with surface delivery type (2)
      const surfaceResult = await this.registerHub(hubData, 2);

      // Register with express delivery type (1)
      const expressResult = await this.registerHub(hubData, 1);

      // If either registration was successful, consider it a success
      const success = surfaceResult.success || expressResult.success;
      const hubId = surfaceResult.success && surfaceResult.data?.hubId ?
        surfaceResult.data.hubId :
        (expressResult.success && expressResult.data?.hubId ? expressResult.data.hubId : 0);

      return {
        success,
        message: `Hub registered with SmartShip`,
        data: {
          hubId,
          surfaceResult: surfaceResult.data,
          expressResult: expressResult.data,
        },
      };
    } catch (error: any) {
      console.error('Error registering hub with SmartShip:', error);

      return {
        success: false,
        message: error.response?.data || error.message,
        data: null,
      };
    }
  }
} 