import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { VendorRegistrationResult, VendorServiceabilityResult, VendorShipmentResult, VendorPickupResult, VendorCancellationResult } from '@/types/vendor';
import { PickupAddress, VendorShipmentData } from '@lorrigo/utils';
import { getPincodeDetails } from '@/utils/pincode';
import { DeliveryType, prisma } from '@lorrigo/db';

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
        '',
        'POST',
        {
          username: APP_CONFIG.VENDOR.SMART_SHIP.EMAIL,
          password: APP_CONFIG.VENDOR.SMART_SHIP.PASSWORD,
          client_id: APP_CONFIG.VENDOR.SMART_SHIP.CLIENT_ID,
          client_secret: APP_CONFIG.VENDOR.SMART_SHIP.CLIENT_SECRET,
          grant_type: APP_CONFIG.VENDOR.SMART_SHIP.GRANT_TYPE,
        },
        undefined,
        APP_CONFIG.VENDOR.SMART_SHIP.AUTH_URL
      );

      if (response.data && response.data.access_token) {
        return `Bearer ${response.data.access_token}`;
      }

      console.error('SmartShip token generation failed:', response.data);
      return null;
    } catch (error) {
      console.error('Error generating SmartShip token:', error);
      return null;
    }
  }

  /**
   * Check serviceability with SmartShip
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
    volumeWeight: number,
    dimensions: { length: number; width: number; height: number, weight: number },
    paymentType: 0 | 1,
    collectableAmount: number = 0,
    couriers: string[] = [],
    isReverseOrder: boolean = false
  ): Promise<VendorServiceabilityResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get SmartShip authentication token',
          serviceableCouriers: [],
        };
      }

      const apiConfig = {
        Authorization: token,
      };

      const payload = {
        order_info: {
          email: "noreply@lorrigo.com",
          source_pincode: pickupPincode,
          destination_pincode: deliveryPincode,
          order_weight: dimensions.weight.toString(),
          order_value: collectableAmount || 1000,
          payment_type: paymentType === 1 ? 'cod' : 'prepaid',
          length: dimensions.length,
          width: dimensions.width,
          height: dimensions.height,
          shipment_type: isReverseOrder ? 'return' : 'forward',
          preferred_carriers: couriers,
        },
        request_info: { extra_info: true, cost_info: false },
      }

      const response = await this.makeRequest(
        APIs.SMART_SHIP.RATE_CALCULATION,
        'POST',
        payload,
        apiConfig
      );

      // Check if the response has serviceable couriers
      if (!response.data || response.data.status === false) {
        return {
          success: false,
          message: response.data?.message || 'No serviceable couriers found',
          serviceableCouriers: [],
        };
      }

      // Extract serviceable couriers from the response
      const serviceableCouriers = Object.values(response.data.data.carrier_info || {}).map((carrier: any) => ({
        id: carrier.carrier_id.toString(),
        name: carrier.carrier_name,
        code: carrier.carrier_code || carrier.carrier_name.toLowerCase().replace(/\s+/g, '_'),
        serviceability: true,
        data: carrier,
      }));

      return {
        success: true,
        message: serviceableCouriers.length > 0
          ? 'Serviceable couriers found'
          : 'No serviceable couriers found',
        serviceableCouriers,
      };
    } catch (error: any) {
      console.error('Error checking serviceability with SmartShip:', error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to check serviceability',
        serviceableCouriers: [],
      };
    }
  }

  /**
   * Register a hub with SmartShip
   * @param hubData Hub data for registration
   * @param deliveryTypeId Delivery type ID (1 for express, 2 for surface)
   * @returns Promise resolving to registration result
   */
  public async registerHub(
    hubData: PickupAddress,
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

      const pincodeConfig = await getPincodeDetails(Number(hubData.pincode));
      if (!pincodeConfig) {
        return {
          success: false,
          message: 'Invalid pincode',
          data: null,
        };
      }

      const address2 = hubData.address.length > 150 ? hubData.address.slice(150) : '';

      const payload = {
        hub_details: {
          hub_name: hubData.facilityName,
          pincode: pincodeConfig.pincode,
          city: pincodeConfig.city,
          state: pincodeConfig.state,
          address1: hubData.address,
          address2: address2 || '',
          hub_phone: hubData.phone,
          delivery_type_id: deliveryTypeId, // 1 for express, 2 for surface
        },
      };

      const response = await this.makeRequest(
        APIs.SMART_SHIP.HUB_REGISTRATION,
        'POST',
        payload,
        apiConfig
      );

      const smartShipData = response.data as {
        status: boolean;
        data: {
          hub_id?: string;
          message?: {
            registered_hub_id?: string;
          };
        };
      };

      // Extract hub_id from the response
      let hubId = '';
      if (smartShipData.data.hub_id || smartShipData.data.message?.registered_hub_id) {
        hubId = smartShipData.data.hub_id || smartShipData.data.message?.registered_hub_id || '';
      }

      return {
        success: true,
        message: `Hub registered with SmartShip`,
        data: {
          hubId,
          deliveryTypeId,
          response: smartShipData,
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
  public async registerHubWithBothDeliveryTypes(
    hubData: PickupAddress
  ): Promise<VendorRegistrationResult> {
    try {
      // Register with surface delivery type (2)
      const surfaceResult = await this.registerHub(hubData, 2);

      // Register with express delivery type (1)
      const expressResult = await this.registerHub(hubData, 1);

      // If either registration was successful, consider it a success
      const success = surfaceResult.success || expressResult.success;
      const surfaceHubId =
        surfaceResult.success && surfaceResult.data?.hubId ? surfaceResult.data.hubId : '0';
      const expressHubId =
        expressResult.success && expressResult.data?.hubId ? expressResult.data.hubId : '0';

      return {
        success,
        message: `Hub registered with SmartShip`,
        data: {
          surfaceHubId,
          expressHubId,
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

  /**
   * Create a shipment with SmartShip
   * @param shipmentData Shipment data
   * @returns Promise resolving to shipment creation result
   */
  public async createShipment(shipmentData: VendorShipmentData): Promise<VendorShipmentResult> {
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

      const { order, hub, orderItems, paymentMethod, dimensions, courier } = shipmentData;

      const isExpressCourier = [DeliveryType.EXPRESS, DeliveryType.AIR].includes(courier.type);

      const hubCode = isExpressCourier ? hub.hub_config.smart_ship_hub_code_express : hub.hub_config.smart_ship_hub_code_surface;

      const productValueWithTax = orderItems.reduce((acc: number, item: any) => {
        return acc + (Number(item.selling_price || 0) + (Number(item.tax_rate || 0) / 100) * Number(item.selling_price || 0));
      }, 0);

      const totalOrderValue = productValueWithTax * Number(orderItems.reduce((acc: number, item: any) => acc + Number(item.units || 1), 0));

      const paymentType = paymentMethod === 'COD' ? 1 : 0;

      const collectableAmount = paymentType ? order.total_amount : 0;

      let clientOrderReferenceId = (order.code || order.order_reference_id)?.slice(6);

      // AS0000025 -- AS0000025_R1
      if (shipmentData.order.shipment.is_reshipped) {
        clientOrderReferenceId = `${clientOrderReferenceId}_R`;
      }

      // Create shipment payload
      const payload = {
        request_info: {
          run_type: 'create',
          shipment_type: order.is_reverse_order ? 2 : 1,
        },
        orders: [
          {
            client_order_reference_id: clientOrderReferenceId,
            shipment_type: order.is_reverse_order ? 2 : 1,
            order_collectable_amount: paymentType ? collectableAmount : 0,
            total_order_value: totalOrderValue,
            payment_type: paymentType ? 'cod' : 'prepaid',
            package_order_weight: (dimensions.weight || 0.5) * 1000, // Convert kg to grams
            package_order_length: dimensions.length || 10,
            package_order_height: dimensions.height || 10,
            package_order_width: dimensions.width || 10,
            shipper_hub_id: hubCode || 0,
            shipper_gst_no: shipmentData.seller_gst || '',
            order_invoice_date: order.order_invoice_date || new Date().toISOString().slice(0, 10),
            order_invoice_number: order.order_invoice_number || 'Non-commercial',
            order_meta: {
              preferred_carriers: [courier.courier_code || ''],
            },
            product_details: orderItems.map((item: any) => ({
              client_product_reference_id: item.id || item.code || 'product-1',
              product_name: item.name,
              product_category: item.category || 'General',
              product_hsn_code: item.hsn || '0000',
              product_quantity: item.units || 1,
              product_invoice_value: item.selling_price || 0,
              product_gst_tax_rate: item.tax_rate || 0,
              product_taxable_value: item.selling_price || 0,
            })),
            consignee_details: {
              consignee_name: order.customer.name,
              consignee_phone: order.customer.phone,
              consignee_email: order.customer.email || '',
              consignee_complete_address: order.customer.address.address,
              consignee_pincode: order.customer.address.pincode,
            },
          },
        ],
      };

      const response = await this.makeRequest(
        APIs.SMART_SHIP.CREATE_SHIPMENT,
        'POST',
        payload,
        apiConfig
      );

      const smartShipResponse = response.data;

      // Check for errors in the response
      if (smartShipResponse?.status === '403') {
        return {
          success: false,
          message: `Channel (${courier.channel_config.nickname}) credentials expired`,
          data: response.data,
        };
      }

      if (!smartShipResponse?.data?.total_success_orders) {
        return {
          success: false,
          message: smartShipResponse?.data?.errors?.data_discrepancy.flatMap((error: any) => error.error.map((err: any) => err)).join(', ') || 'Courier not serviceable',
          data: response.data,
        };
      }

      const response_data = smartShipResponse?.data?.success_order_details?.orders[0];
      // Extract AWB number from the response
      const awb = response_data?.awb_number;

      if (!awb) {
        return {
          success: false,
          message: 'Please choose another courier partner',
          data: response.data,
        };
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          order_reference_id: clientOrderReferenceId,
        },
      });

      return {
        success: true,
        message: 'Shipment created successfully',
        awb,
        routingCode: response_data?.route_code,
        data: response_data,
      };
    } catch (error: any) {
      console.error('Error creating shipment with SmartShip:', error);

      return {
        success: false,
        message: error.response?.data || error.message,
        data: null,
      };
    }
  }

  /**
   * Schedule pickup for a shipment with SmartShip
   * @param pickupData Pickup data
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
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get SmartShip authentication token',
          data: null,
          pickup_date: null,
        };
      }

      const { awb, pickupDate, shipment } = pickupData;

      // Format the request body
      const requestBody = {
        client_order_reference_ids: [shipment.order.order_reference_id],
        preferred_pickup_date: pickupDate,
        shipment_type: shipment.order.is_reverse_order ? 2 : 1,
      };

      // Make the API request
      const response = await this.makeRequest(
        APIs.SMART_SHIP.ORDER_MANIFEST,
        'POST',
        requestBody,
        { Authorization: token }
      );


      // Check for errors in the response
      if (response.data?.status === false || response.data?.status === "403") {
        return {
          success: false,
          message: response.data?.message || 'Failed to schedule pickup with SmartShip',
          data: response.data,
          pickup_date: null,
        };
      }

      if (response.data?.data?.errors) {
        return {
          success: false,
          message: JSON.stringify(response.data?.data?.errors),
          data: response.data,
          pickup_date: null,
        };
      }

      // Check for failure in the response
      if (response.data?.data?.failure) {
        return {
          success: false,
          message: 'Incomplete route',
          data: response.data?.data,
          pickup_date: null,
        };
      }


      return {
        success: true,
        message: 'Pickup scheduled successfully with SmartShip',
        data: response.data?.data,
        pickup_date: response.data?.data?.pickup_date,
      };
    } catch (error: any) {
      console.error(`Error scheduling pickup with SmartShip:`, error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to schedule pickup',
        data: null,
        pickup_date: null,
      };
    }
  }

  /**
   * Cancel a shipment with SmartShip
   * @param cancelData Cancellation data
   * @returns Promise resolving to cancellation result
   */
  public async cancelShipment(
    cancelData: {
      awb: string;
      shipment: any;
    }
  ): Promise<VendorCancellationResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get SmartShip authentication token',
          data: null,
        };
      }

      const { shipment } = cancelData;

      // Format the request body
      const requestBody = {
        request_info: {},
        orders: {
          client_order_reference_ids: [shipment.order.order_reference_id],
        },
      };

      // Make the API request
      const response = await this.makeRequest(
        APIs.SMART_SHIP.CANCEL_SHIPMENT,
        'POST',
        requestBody,
        { Authorization: token }
      );

      // Check for errors in the response
      if (!response.data?.status) {
        return {
          success: false,
          message: response.data?.message || 'Failed to cancel shipment with SmartShip',
          data: response.data,
        };
      }

      return {
        success: true,
        message: 'Shipment cancelled successfully with SmartShip',
        data: response.data,
      };
    } catch (error: any) {
      console.error(`Error cancelling shipment with SmartShip:`, error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to cancel shipment',
        data: null,
      };
    }
  }
}
