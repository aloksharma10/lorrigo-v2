import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { formatPhoneNumber } from '@lorrigo/utils';
import {
  VendorRegistrationResult,
  VendorServiceabilityResult,
  VendorShipmentResult,
  VendorPickupResult,
  VendorCancellationResult,
} from '@/types/vendor';

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

    super(`Delhivery-${weightCategory}`, vendorConfig.API_BASEURL || '', apiKey, tokenCacheKey);

    this.weightCategory = weightCategory;
  }

  /**
   * Generate Delhivery authentication token
   * Note: Delhivery uses direct API key for authentication
   * @returns Promise resolving to auth token
   */
  protected async generateToken(): Promise<string | null> {
    // Delhivery uses direct API key, so we'll just return it
    return `Token ${this.apiKey}` || null;
  }

  /**
   * Check serviceability with Delhivery
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
    weight: number,
    dimensions: { length: number; width: number; height: number },
    paymentType: 0 | 1,
    collectableAmount?: number,
    couriers?: string[],
    isReverseOrder?: boolean,
    couriersData?: any
  ): Promise<VendorServiceabilityResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: `Failed to get Delhivery ${this.weightCategory} kg authentication token`,
          serviceableCouriers: [],
        };
      }

      // Delhivery checks serviceability by delivery pincode
      const endpoint = `${APIs.DELHIVERY.PINCODE_SERVICEABILITY}${deliveryPincode}`;

      const response = await this.makeRequest(endpoint, 'GET', null, {
        Authorization: token,
      });

      // Check if pincode is serviceable
      const deliveryData = response.data?.delivery_codes?.[0];
      if (!deliveryData) {
        return {
          success: false,
          message: `Pincode ${deliveryPincode} is not serviceable by Delhivery ${this.weightCategory}`,
          serviceableCouriers: [],
        };
      }

      // Check if weight is within the weight category limit
      // const weightLimit = parseFloat(this.weightCategory);
      // if (weight > weightLimit) {
      //   return {
      //     success: false,
      //     message: `Weight ${weight}kg exceeds the limit of ${weightLimit}kg for Delhivery ${this.weightCategory}`,
      //     serviceableCouriers: [],
      //   };
      // }

      const isServiceable = Number(deliveryData.postal_code.pin) === Number(deliveryPincode);

      const courierData = isServiceable
        ? couriersData.find((c: any) => c.courier.is_reversed_courier === isReverseOrder)
        : null;

      const serviceableCourier = {
        id: courierData?.courierId || `delhivery-${this.weightCategory}`,
        name: `Delhivery ${this.weightCategory} kg`,
        code: `DL${this.weightCategory.replace('.', '')}`,
        serviceability: isServiceable,
        data: courierData,
      };

      return {
        success: true,
        message: isServiceable
          ? `Pincode ${deliveryPincode} is serviceable by Delhivery ${this.weightCategory}`
          : `Pincode ${deliveryPincode} is not serviceable by Delhivery ${this.weightCategory}`,
        serviceableCouriers: isServiceable ? [serviceableCourier] : [],
      };
    } catch (error: any) {
      console.error(`Error checking serviceability with Delhivery ${this.weightCategory}:`, error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to check serviceability',
        serviceableCouriers: [],
      };
    }
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
        name: hubData.facilityName,
        email: 'noreply@lorrigo.com',
        phone: formatPhoneNumber(hubData.phone),
        address: hubData.address,
        city: hubData.city,
        country: 'India',
        pin: hubData.pincode.toString(),
        return_address: hubData.isRTOAddressSame ? hubData.address : hubData.rtoAddress,
        return_pin: hubData.isRTOAddressSame
          ? hubData.pincode.toString()
          : hubData.rtoPincode?.toString(),
        return_city: hubData.isRTOAddressSame ? hubData.city : hubData.rtoCity,
        return_state: hubData.isRTOAddressSame ? hubData.state : hubData.rtoState,
        return_country: 'India',
      };

      const response = await this.makeRequest(
        APIs.DELHIVERY.PICKUP_LOCATION,
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
      console.error(
        `Error registering hub with Delhivery ${this.weightCategory}:`,
        JSON.stringify(error.response?.data)
      );

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

      const isReversed = order.type === 'RETURNED';
      const isCOD = paymentMethod === 'COD';

      // Calculate COD amount if applicable
      const codAmount = isCOD ? order.amount_to_collect : 0;

      // Prepare the shipment payload
      const delhiveryShipmentPayload = {
        format: 'json',
        data: {
          shipments: [
            {
              name: order.customer.name,
              add: order.customer.address.address,
              pin: order.customer.address.pincode,
              city: order.customer.address.city,
              state: order.customer.address.state,
              country: 'India',
              phone: formatPhoneNumber(order.customer.phone),
              order: order.order_reference_id || order.code,
              payment_mode: isReversed ? 'Pickup' : isCOD ? 'COD' : 'Prepaid',
              return_pin: hub.rto_address?.pincode || hub.address.pincode,
              return_city: hub.rto_address?.city || hub.address.city,
              return_phone: hub.phone,
              return_add: hub.rto_address?.address || hub.address.address,
              return_state: hub.rto_address?.state || hub.address.state,
              return_country: 'India',
              products_desc: orderItems.map((item: any) => item.name).join(', '),
              hsn_code: orderItems.map((item: any) => item.hsn).join(', '),
              cod_amount: codAmount,
              order_date: new Date().toISOString(),
              total_amount: order.total_amount,
              seller_add: hub.address.address,
              seller_name: hub.name,
              seller_inv: order.code,
              quantity: orderItems.reduce(
                (acc: number, item: any) => acc + Number(item.units || 1),
                0
              ),
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
        APIs.DELHIVERY.CREATE_ORDER,
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
        routingCode: delhiveryResponse?.sort_code,
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

  /**
   * Schedule pickup for a shipment with Delhivery
   * @param pickupData Pickup data
   * @returns Promise resolving to pickup scheduling result
   */
  public async schedulePickup(pickupData: {
    awb: string;
    pickupDate: string;
    hub: any;
    shipment: any;
  }): Promise<VendorPickupResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: `Failed to get Delhivery ${this.weightCategory} kg authentication token`,
          pickup_date: null,
          data: null,
        };
      }

      const { pickupDate, hub } = pickupData;

      // Format the request body
      const requestBody = {
        pickup_location: hub.name,
        expected_package_count: 1,
        pickup_date: pickupDate,
        pickup_time: '12:00:00',
      };

      // Make the API request
      const response = await this.makeRequest(APIs.DELHIVERY.MANIFEST_ORDER, 'POST', requestBody, {
        Authorization: `Token ${token}`,
      });

      // Check for errors in the response
      if (!response.data?.success) {
        return {
          success: false,
          message:
            response.data?.error ||
            `Failed to schedule pickup with Delhivery ${this.weightCategory}`,
          pickup_date: null,
          data: response.data,
        };
      }

      return {
        success: true,
        message: `Pickup scheduled successfully with Delhivery ${this.weightCategory}`,
        pickup_date: response.data.pickup_date,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`Error scheduling pickup with Delhivery ${this.weightCategory}:`, error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to schedule pickup',
        pickup_date: null,
        data: null,
      };
    }
  }

  /**
   * Cancel a shipment with Delhivery
   * @param cancelData Cancellation data
   * @returns Promise resolving to cancellation result
   */
  public async cancelShipment(cancelData: {
    awb: string;
    shipment: any;
  }): Promise<VendorCancellationResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: `Failed to get Delhivery ${this.weightCategory} kg authentication token`,
          data: null,
        };
      }

      const { awb } = cancelData;

      const requestBody = {
        waybill: awb,
        cancellation: true,
      };

      const response = await this.makeRequest(APIs.DELHIVERY.CANCEL_ORDER, 'POST', requestBody, {
        Authorization: token,
      });

      // Check for errors in the response
      if (!response.data?.status) {
        return {
          success: false,
          message:
            response.data?.error ||
            `Failed to cancel shipment with Delhivery ${this.weightCategory}`,
          data: response.data,
        };
      }

      return {
        success: true,
        message: `Shipment cancelled successfully with Delhivery ${this.weightCategory}`,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`Error cancelling shipment with Delhivery ${this.weightCategory}:`, error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to cancel shipment',
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
    return [new DelhiveryVendor('0.5'), new DelhiveryVendor('5'), new DelhiveryVendor('10')];
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
