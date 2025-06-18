import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import {
  formatAddress,
  formatPhoneNumber,
  formatShiprocketAddress,
  PickupAddress,
} from '@lorrigo/utils';
import {
  VendorRegistrationResult,
  VendorServiceabilityResult,
  VendorShipmentResult,
  VendorPickupResult,
  VendorCancellationResult,
  VendorShipmentData,
  ShipmentPickupData,
  ShipmentCancelData,
} from '@/types/vendor';
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

      const response = await this.makeRequest(APIs.SHIPROCKET.AUTH, 'POST', {
        email: this.email,
        password: this.password,
      });

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
   * Check serviceability with Shiprocket
   * @param pickupPincode Pickup pincode
   * @param deliveryPincode Delivery pincode
   * @param weight Weight in kg
   * @param dimensions Package dimensions
   * @param paymentType Payment type (0 for prepaid, 1 for COD)
   * @param collectableAmount Collectable amount for COD
   * @param couriers List of courier IDs to check
   * @returns Promise resolving to serviceability result
   */
  public async checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
    volumetricWeight: number,
    dimensions: { length: number; width: number; height: number; weight: number },
    paymentType: 0 | 1,
    collectableAmount?: number,
    couriers?: string[]
  ): Promise<VendorServiceabilityResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get Shiprocket authentication token',
          serviceableCouriers: [],
        };
      }

      const apiConfig = {
        Authorization: token,
      };

      // Construct API endpoint with query parameters
      const endpoint = `${APIs.SHIPROCKET.ORDER_COURIER}?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${dimensions.weight}&cod=${paymentType}`;

      const response = await this.makeRequest(endpoint, 'GET', null, apiConfig);

      if (
        !response.data ||
        !response.data.data ||
        !response.data.data.available_courier_companies
      ) {
        return {
          success: false,
          message: 'No serviceable couriers found',
          serviceableCouriers: [],
        };
      }

      // Extract available courier companies
      const availableCouriers = response.data.data.available_courier_companies || [];

      // Map to standardized format
      const serviceableCouriers = availableCouriers.map((courier: any) => ({
        id: courier.courier_company_id.toString(),
        name: courier.courier_name,
        code: courier.courier_code || courier.courier_name.toLowerCase().replace(/\s+/g, '_'),
        serviceability: true,
        data: courier,
      }));

      // Filter by provided courier IDs if applicable
      const filteredCouriers =
        couriers && couriers.length > 0
          ? serviceableCouriers.filter((c: { id: string }) => couriers.includes(c.id))
          : serviceableCouriers;

      return {
        success: true,
        message:
          filteredCouriers.length > 0
            ? 'Serviceable couriers found'
            : 'No matching serviceable couriers found',
        serviceableCouriers: filteredCouriers,
      };
    } catch (error: any) {
      console.error('Error checking serviceability with Shiprocket:', error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to check serviceability',
        serviceableCouriers: [],
      };
    }
  }

  /**
   * Register a hub with Shiprocket
   * @param hubData Hub data for registration
   * @returns Promise resolving to registration result
   */
  public async registerHub(
    hubData: PickupAddress,
    lorrigoPickupId?: string
  ): Promise<VendorRegistrationResult> {
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
      const address2 = modifiedAddress.length > 150 ? modifiedAddress.slice(150) : '';

      const payload = {
        pickup_location: `${lorrigoPickupId}`,
        name: hubData.facilityName,
        email: 'noreply@lorrigo.com',
        phone: hubData.phone,
        address: modifiedAddress,
        address_2: address2,
        city: pincodeConfig.city,
        state: pincodeConfig.state,
        country: 'India',
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
      const isExistingHub = error?.response?.data?.errors?.pickup_location?.[0]?.includes(
        'Address nick name already in use'
      );
      const isExistingHubButInactive = error?.response?.data?.message?.includes(
        'Address name already exists'
      );

      if (isExistingHubButInactive) {
        return {
          success: false,
          message: 'The address name you entered is already in use. Please choose a unique name.',
          data: null,
        };
      }

      // If it's an existing hub but not inactive, consider it a success
      if (isExistingHub) {
        return {
          success: true,
          message: 'Hub already exists',
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
  public async createShipment(shipmentData: VendorShipmentData): Promise<VendorShipmentResult> {
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

      const { order, hub, orderItems, paymentMethod, dimensions, isSchedulePickup, pickupDate } =
        shipmentData;

      // Extract customer name components safely
      const customerName = order.customer?.name || 'Customer';
      const nameParts = customerName.split(' ');
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Prepare order items for payload safely
      const shiprocketOrderItems = orderItems.map((item: any) => ({
        name: item.name || 'Product',
        sku: `sku-${item.code || Math.random().toString(36).substring(2, 15)}`,
        units: item.units || 1,
        selling_price: item.selling_price || 0,
        discount: item.discount || 0,
        tax: item.tax || 0,
        hsn: item.hsn || '',
      }));

      // Determine payment method
      const isCOD = paymentMethod === 'COD';

      // Create a random suffix for the order reference ID for uniqueness
      // const randomInt = Math.round(Math.random() * 20);
      // const customOrderReferenceId = `${order.order_reference_id || order.code || `order-${Date.now()}`}-${randomInt}`;
      const customOrderReferenceId = order.code;

      // Format address for Shiprocket
      let billingAddress = formatShiprocketAddress(order.customer?.address?.address || '');
      let billingAddress2 = '';

      if (billingAddress.length > 170) {
        billingAddress2 = billingAddress.slice(170);
        billingAddress = billingAddress.slice(0, 170);
      }

      // Use wrapper API for combined order creation, shipment, and pickup scheduling
      const wrapperPayload: any = {
        request_pickup: isSchedulePickup, // Handle pickup scheduling
        order_id: customOrderReferenceId,
        order_date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        pickup_location: hub?.code?.trim() || '',
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address: billingAddress,
        billing_address_2: billingAddress2,
        billing_city: order.customer?.address?.city || '',
        billing_pincode: order.customer?.address?.pincode || '',
        billing_state: order.customer?.address?.state || '',
        billing_country: 'India',
        billing_email: order.customer?.email || 'customer@example.com',
        billing_phone: formatPhoneNumber(order.customer?.phone),
        shipping_is_billing: true,
        order_items: shiprocketOrderItems,
        payment_method: isCOD ? 'COD' : 'Prepaid',
        sub_total: order.total_amount || 0,
        length: dimensions?.length || 10,
        breadth: dimensions?.width || 10,
        height: dimensions?.height || 10,
        weight: dimensions?.weight || 0.5,
        courier_id: shipmentData.courier?.courier_code || '',
        vendor_details: {
          name: hub?.contact_person_name || hub?.name || 'Seller',
          email: 'noreply@lorrigo.com',
          phone: formatPhoneNumber(hub?.phone),
          address: formatShiprocketAddress(hub?.address?.address || ''),
          address_2: hub?.address?.address_2 || '',
          city: hub?.address?.city || '',
          state: hub?.address?.state || '',
          country: 'India',
          pin_code: hub?.address?.pincode || '',
          pickup_location: hub?.code?.trim() || '',
        },
      };

      // Add pickup date if provided
      if (pickupDate) {
        wrapperPayload.pickup_date = new Date(pickupDate).toISOString().split('T')[0];
      }

      // Add COD specific fields if applicable
      if (isCOD) {
        wrapperPayload.cod_amount = order.total_amount || 0;
        wrapperPayload.partial_cod_payment_mode = 'Credit points';
        wrapperPayload.partial_cod_collected =
          Number(order.total_amount) - Number(order.amount_to_collect);
      }

      // Add ewaybill if provided and order value is high
      if (order.ewaybill && order.total_amount > 50000) {
        wrapperPayload.ewaybill_no = order.ewaybill;
      }

      // Call the wrapper API
      const wrapperResponse = await this.makeRequest(
        APIs.SHIPROCKET.CREATE_FORWARD_SHIPMENT_WRAPPER,
        'POST',
        wrapperPayload,
        apiConfig
      );

      const wrapperData = wrapperResponse.data.payload;
      if (!wrapperData?.order_id || !wrapperData?.shipment_id) {
        return {
          success: false,
          message: wrapperData.error_message || wrapperData?.message || 'Failed to create shipment',
          data: wrapperResponse.data,
        };
      }

      return {
        success: true,
        message: isSchedulePickup
          ? 'Shipment created and scheduled successfully'
          : 'Shipment created successfully',
        awb: wrapperData.awb_code || '',
        routingCode: wrapperData.routing_code || '',
        pickup_date: wrapperData.pickup_scheduled_date ?? '',
        data: {
          sr_order_id: wrapperData.order_id,
          sr_shipment_id: wrapperData.shipment_id,
          ...wrapperResponse.data,
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

  /**
   * Schedule pickup for a shipment with Shiprocket
   * @param pickupData Pickup data
   * @returns Promise resolving to pickup scheduling result
   */
  public async schedulePickup(pickupData: ShipmentPickupData): Promise<VendorPickupResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get Shiprocket authentication token',
          pickup_date: null,
          data: null,
        };
      }

      const { pickupDate, shipment } = pickupData;

      // Format date to YYYY-MM-DD format if it's not already
      const formattedDate = pickupDate.includes('-')
        ? pickupDate
        : new Date(pickupDate).toISOString().split('T')[0];

      // Format the request body
      const requestBody = {
        shipment_id: [shipment.sr_shipment_id || ''],
        pickup_date: [formattedDate],
      };

      // Make the API request
      const response = await this.makeRequest(APIs.SHIPROCKET.GET_MANIFEST, 'POST', requestBody, {
        Authorization: token,
      });

      return {
        success: true,
        message: 'Pickup scheduled successfully with Shiprocket',
        pickup_date: response.data.Booked_date || formattedDate || '',
        data: response.data,
      };
    } catch (error: any) {
      // Check if error is due to already scheduled pickup
      if (error?.response?.data?.message?.includes('Already in Pickup Queue')) {
        return {
          success: true,
          message: 'Pickup already scheduled with Shiprocket',
          pickup_date: null,
          data: error.response?.data,
        };
      }

      console.error(`Error scheduling pickup with Shiprocket:`, error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to schedule pickup',
        pickup_date: null,
        data: null,
      };
    }
  }

  /**
   * Cancel a shipment with Shiprocket
   * @param cancelData Cancellation data
   * @returns Promise resolving to cancellation result
   */
  public async cancelShipment(cancelData: ShipmentCancelData): Promise<VendorCancellationResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get Shiprocket authentication token',
          data: null,
        };
      }

      const { awb } = cancelData;

      const response = await this.makeRequest(
        APIs.SHIPROCKET.CANCEL_SHIPMENT,
        'POST',
        { awbs: [awb] },
        { Authorization: token }
      );

      return {
        success: true,
        message: 'Shipment cancellation requested with Shiprocket using AWB',
        data: response.data,
      };
    } catch (error: any) {
      console.error(`Error cancelling shipment with Shiprocket:`, error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to cancel shipment',
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
    this.clientId = ''; // Will be set dynamically
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
  public async registerHub(
    hubData: PickupAddress,
    lorrigoPickupId?: string,
    token?: string
  ): Promise<VendorRegistrationResult> {
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
      const address2 = modifiedAddress.length > 150 ? modifiedAddress.slice(0, 150) : '';

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
      data: null,
    };
  }

  /**
   * Check serviceability with Shiprocket B2B
   * This is a placeholder implementation
   */
  public async checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
    weight: number,
    dimensions: { length: number; width: number; height: number },
    paymentType: 0 | 1,
    collectableAmount?: number,
    couriers?: string[]
  ): Promise<VendorServiceabilityResult> {
    return {
      success: false,
      message: 'Serviceability check not implemented for Shiprocket B2B',
      serviceableCouriers: [],
    };
  }
}
