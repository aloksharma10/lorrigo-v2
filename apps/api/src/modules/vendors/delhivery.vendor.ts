import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { formatPhoneNumber } from '@lorrigo/utils';
import { VendorRegistrationResult, VendorShipmentResult } from '@/types/vendor';

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

  /**
   * Create a shipment with Delhivery
   * @param shipmentData Shipment data 
   * @returns Promise resolving to shipment creation result
   */
  public async createShipment(shipmentData: any): Promise<VendorShipmentResult> {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          message: `Failed to get Delhivery ${this.weightCategory} kg authentication token`,
          data: null,
        };
      }

      const { order, hub, orderItems, paymentMethod, dimensions } = shipmentData;
      
      // Extract the first order item for product details
      const firstOrderItem = orderItems[0];
      
      const isReversed = order.type === 'RETURNED';
      const isCOD = paymentMethod === 'COD';
      
      // Calculate COD amount if applicable
      const codAmount = isCOD ? order.total_amount : 0;
      
      // Prepare the shipment payload
      const delhiveryShipmentPayload = {
        format: 'json',
        data: {
          shipments: [
            {
              name: order.customer.name,
              add: order.shipping_address.address,
              pin: order.shipping_address.pincode,
              city: order.shipping_address.city,
              state: order.shipping_address.state,
              country: 'India',
              phone: formatPhoneNumber(order.shipping_address.phone || order.customer.phone),
              order: order.order_reference_id || order.code,
              payment_mode: isReversed ? 'Pickup' : isCOD ? 'COD' : 'Prepaid',
              return_pin: hub.rto_address?.pincode || hub.address.pincode,
              return_city: hub.rto_address?.city || hub.address.city,
              return_phone: hub.phone,
              return_add: hub.rto_address?.address || hub.address.address,
              return_state: hub.rto_address?.state || hub.address.state,
              return_country: 'India',
              products_desc: firstOrderItem.name,
              hsn_code: firstOrderItem.hsn || '0000',
              cod_amount: codAmount,
              order_date: new Date().toISOString(),
              total_amount: order.total_amount,
              seller_add: hub.address.address,
              seller_name: hub.name,
              seller_inv: order.code,
              quantity: firstOrderItem.units || 1,
              waybill: order.ewaybill || '',
              shipment_length: dimensions.length || 10,
              shipment_width: dimensions.width || 10,
              shipment_height: dimensions.height || 10,
              weight: (dimensions.weight || 0.5) * 1000, // Convert kg to grams
              seller_gst_tin: shipmentData.seller_gst || '',
              shipping_mode: 'Surface',
              address_type: 'home',
            },
          ],
          pickup_location: {
            name: hub.name,
            add: hub.address.address,
            city: hub.address.city,
            pin_code: hub.address.pincode,
            country: 'India',
            phone: hub.phone,
          },
        },
      };

      // URL encode the payload for Delhivery API
      const urlEncodedPayload = `format=json&data=${encodeURIComponent(JSON.stringify(delhiveryShipmentPayload.data))}`;
      
      const response = await this.makeRequest(
        APIs.DELHIVERY_CREATE_ORDER,
        'POST',
        urlEncodedPayload,
        { Authorization: token, 'Content-Type': 'application/x-www-form-urlencoded' }
      );
      
      const delhiveryResponse = response.data?.packages?.[0];
      
      if (!delhiveryResponse?.status) {
        return {
          success: false,
          message: 'Failed to create shipment with Delhivery. Must select a registered hub.',
          data: response.data,
        };
      }
      
      const awb = delhiveryResponse?.waybill;
      
      if (!awb) {
        return {
          success: false,
          message: 'Failed to generate AWB number',
          data: response.data,
        };
      }
      
      return {
        success: true,
        message: `Shipment created with Delhivery ${this.weightCategory} kg`,
        awb,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`Error creating shipment with Delhivery ${this.weightCategory}:`, error);
      
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