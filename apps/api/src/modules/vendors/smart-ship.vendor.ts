import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { VendorRegistrationResult, VendorShipmentResult } from '@/types/vendor';

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
  
  /**
   * Create a shipment with SmartShip
   * @param shipmentData Shipment data
   * @returns Promise resolving to shipment creation result
   */
  public async createShipment(shipmentData: any): Promise<VendorShipmentResult> {
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
      
      // Extract first order item for product details
      const firstOrderItem = orderItems[0];
      
      // Calculate product value with tax
      const productValueWithTax =
        Number(firstOrderItem.selling_price || 0) +
        (Number(firstOrderItem.tax_rate || 0) / 100) * Number(firstOrderItem.selling_price || 0);
      
      // Calculate total order value
      const totalOrderValue = productValueWithTax * Number(firstOrderItem.units || 1);
      
      // Determine payment type (0 for prepaid, 1 for COD)
      const paymentType = paymentMethod === 'COD' ? 1 : 0;
      
      // Determine collectable amount for COD orders
      const collectableAmount = paymentType ? order.total_amount : 0;
      
      // Generate client order reference ID
      let clientOrderReferenceId = order.order_reference_id || order.code;
      
      // If it's a reshipped order, modify the reference ID
      if (shipmentData.is_reshipped) {
        const lastNumber = clientOrderReferenceId.match(/\d+$/)?.[0] || '';
        const incrementedNumber = lastNumber ? (parseInt(lastNumber) + 1).toString() : '1';
        clientOrderReferenceId = `${clientOrderReferenceId.replace(/\d+$/, '')}_R${incrementedNumber}`;
      }
      
      // Create shipment payload
      const payload = {
        request_info: {
          run_type: 'create',
          shipment_type: order.type === 'RETURNED' ? 2 : 1,
        },
        orders: [
          {
            client_order_reference_id: clientOrderReferenceId,
            shipment_type: order.type === 'RETURNED' ? 2 : 1,
            order_collectable_amount: paymentType ? collectableAmount : 0,
            total_order_value: totalOrderValue,
            payment_type: paymentType ? 'cod' : 'prepaid',
            package_order_weight: (dimensions.weight || 0.5) * 1000, // Convert kg to grams
            package_order_length: dimensions.length || 10,
            package_order_height: dimensions.height || 10,
            package_order_width: dimensions.width || 10,
            shipper_hub_id: hub.hub_id || 0,
            shipper_gst_no: shipmentData.seller_gst || '',
            order_invoice_date: new Date().toISOString().slice(0, 10),
            order_invoice_number: order.code || 'Non-commercial',
            order_meta: {
              preferred_carriers: [courier.courier_code || ''],
            },
            product_details: [
              {
                client_product_reference_id: firstOrderItem.id || firstOrderItem.code || 'product-1',
                product_name: firstOrderItem.name,
                product_category: firstOrderItem.category || 'General',
                product_hsn_code: firstOrderItem.hsn || '0000',
                product_quantity: firstOrderItem.units || 1,
                product_invoice_value: firstOrderItem.selling_price || 0,
                product_gst_tax_rate: firstOrderItem.tax_rate || 0,
                product_taxable_value: firstOrderItem.selling_price || 0,
              },
            ],
            consignee_details: {
              consignee_name: order.customer.name,
              consignee_phone: order.customer.phone,
              consignee_email: order.customer.email || '',
              consignee_complete_address: order.shipping_address.address,
              consignee_pincode: order.shipping_address.pincode,
            },
          },
        ],
      };
      
      const response = await this.makeRequest(
        APIs.CREATE_SHIPMENT,
        'POST',
        payload,
        apiConfig
      );
      
      const smartShipResponse = response.data;
      
      // Check for errors in the response
      if (smartShipResponse?.status === '403') {
        return {
          success: false,
          message: 'SmartShip credentials expired',
          data: response.data,
        };
      }
      
      if (!smartShipResponse?.data?.total_success_orders) {
        return {
          success: false,
          message: 'Courier not serviceable',
          data: response.data,
        };
      }
      
      // Extract AWB number from the response
      const awb = smartShipResponse?.data?.success_order_details?.orders[0]?.awb_number;
      
      if (!awb) {
        return {
          success: false,
          message: 'Please choose another courier partner',
          data: response.data,
        };
      }
      
      return {
        success: true,
        message: 'Shipment created successfully',
        awb,
        data: response.data,
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
} 