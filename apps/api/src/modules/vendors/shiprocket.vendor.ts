import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { formatAddress, formatPhoneNumber, PickupAddress } from '@lorrigo/utils';
import { VendorRegistrationResult, VendorShipmentResult } from '@/types/vendor';
import { getPincodeDetails } from '@/utils/pincode';

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
        APIs.SHIPROCKET.AUTH,
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
  public async registerHub(hubData: PickupAddress, lorrigoPickupId?: string): Promise<VendorRegistrationResult> {
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
      
      const pincodeConfig = await getPincodeDetails(Number(hubData.pincode));
      if (!pincodeConfig) {
        return {
          success: false,
          message: 'Invalid pincode',
          data: null,
        };
      }
      // Format address according to Shiprocket requirements
      const modifiedAddress = formatAddress(hubData.address);

      // Create address2 from address if it exists if address line 1 is greater than 150 characters
      const address2 = modifiedAddress.length > 150 ? modifiedAddress.slice(150) : "";
      
      const payload = {
        pickup_location: `${lorrigoPickupId}`,
        name: hubData.facilityName,
        email: "noreply@lorrigo.com",
        phone: hubData.phone,
        address: modifiedAddress,
        address_2: address2,
        city: pincodeConfig.city,
        state: pincodeConfig.state,
        country: "India",
        pin_code: pincodeConfig.pincode,
      };

      const response = await this.makeRequest(
        APIs.SHIPROCKET.CREATE_PICKUP_LOCATION,
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
      // console.error('Error registering hub with Shiprocket:', error);
      
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
  
  /**
   * Create a shipment with Shiprocket
   * @param shipmentData Shipment data
   * @returns Promise resolving to shipment creation result
   */
  public async createShipment(shipmentData: any): Promise<VendorShipmentResult> {
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
      
      const { order, hub, orderItems, paymentMethod, dimensions } = shipmentData;
      
      // Function to trim address to fit Shiprocket requirements
      const trimAddress = (address = "") => {
        const fullAddress = `0-/, ${address}`;
        return fullAddress.length > 150 ? fullAddress.slice(0, 150) : fullAddress;
      };
      
      // Extract customer name components
      const nameParts = order.customer.name.split(' ');
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Prepare order items for payload
      const shiprocketOrderItems = orderItems.map((item: any) => ({
        name: item.name,
        sku: `sku-${item.id || item.code}`,
        units: item.units || 1,
        selling_price: item.selling_price || 0,
        discount: item.discount || 0,
        tax: item.tax || 0,
        hsn: item.hsn || '',
      }));
      
      // Determine payment method
      const isCOD = paymentMethod === 'COD';
      
      // Create shipment payload
      const payload: any = {
        courier_id: shipmentData.courier_id,
        order_id: order.order_reference_id || order.code,
        order_date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address: trimAddress(order.shipping_address.address),
        billing_city: order.shipping_address.city,
        billing_pincode: order.shipping_address.pincode,
        billing_state: order.shipping_address.state,
        billing_country: 'India',
        billing_email: order.customer.email || 'customer@example.com',
        billing_phone: formatPhoneNumber(order.customer.phone),
        shipping_is_billing: true,
        order_items: shiprocketOrderItems,
        payment_method: isCOD ? 'COD' : 'Prepaid',
        sub_total: order.total_amount,
        length: dimensions.length || 10,
        breadth: dimensions.width || 10,
        height: dimensions.height || 10,
        weight: dimensions.weight || 0.5,
        pickup_location: hub.name?.trim(),
        vendor_details: {
          name: hub.contact_person_name || hub.name,
          email: 'noreply@lorrigo.com',
          phone: formatPhoneNumber(hub.phone),
          address: trimAddress(hub.address.address),
          address_2: hub.address.address_2 || '',
          city: hub.address.city,
          state: hub.address.state,
          country: 'India',
          pin_code: hub.address.pincode,
          pickup_location: hub.name?.trim(),
        },
      };
      
      // Add COD specific fields if applicable
      if (isCOD) {
        payload.cod_amount = order.total_amount;
      }
      
      const response = await this.makeRequest(
        APIs.SHIPROCKET.GENRATE_AWB,
        'POST',
        payload,
        apiConfig
      );
      
      const shiprocketData = response.data?.payload;
      
      if (!shiprocketData?.order_id || !shiprocketData?.shipment_id || !shiprocketData?.awb_code) {
        return {
          success: false,
          message: shiprocketData?.awb_assign_error || 'Failed to create shipment with Shiprocket',
          data: response.data,
        };
      }
      
      return {
        success: true,
        message: 'Shipment created successfully',
        awb: shiprocketData.awb_code,
        routingCode: shiprocketData.routing_code || '',
        data: {
          shiprocket_order_id: shiprocketData.order_id,
          shiprocket_shipment_id: shiprocketData.shipment_id,
          ...response.data,
        },
      };
    } catch (error: any) {
      console.error('Error creating shipment with Shiprocket:', error);
      
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
  public async registerHub(hubData: PickupAddress, lorrigoPickupId?: string, token?: string): Promise<VendorRegistrationResult> {
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
      
      const pincodeConfig = await getPincodeDetails(Number(hubData.pincode));
      if (!pincodeConfig) {
        return {
          success: false,
          message: 'Invalid pincode',
          data: null,
        };
      }
      const modifiedAddress = formatAddress(hubData.address);

      // Create address2 from address if it exists if address line 1 is greater than 150 characters
      const address2 = modifiedAddress.length > 150 ? modifiedAddress.slice(0, 150) : "";
      
      const payload = {
        name: hubData.facilityName,
        client_id: this.clientId,
        address: {
          address_line_1: modifiedAddress,
          address_line_2: address2,
          pincode: pincodeConfig.pincode.toString(),
          city: pincodeConfig.city,
          state: pincodeConfig.state,
          country: 'India',
        },
        warehouse_code: `wh_${pincodeConfig.pincode}`,
        contact_person_name: hubData.contactPersonName,
        contact_person_email: 'noreply@lorrigo.com',
        contact_person_contact_no: formatPhoneNumber(Number(hubData.phone)),
      };
      
      const response = await this.makeRequest(
        APIs.SHIPROCKET_B2B.CREATE_HUB,
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
  
  /**
   * Create a shipment with Shiprocket B2B
   * @param shipmentData Shipment data
   * @returns Promise resolving to shipment creation result
   */
  public async createShipment(shipmentData: any): Promise<VendorShipmentResult> {
    // For B2B shipments, we would implement specific logic here
    // This is a placeholder implementation for the abstract method
    return {
      success: false,
      message: 'B2B shipment creation not yet implemented',
      data: null
    };
  }
} 