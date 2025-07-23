import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import {
  VendorRegistrationResult,
  VendorServiceabilityResult,
  VendorShipmentResult,
  VendorPickupResult,
  VendorCancellationResult,
  VendorTrackingResult,
  TrackingEventData,
  ShipmentTrackingData,
  NDRData,
  VendorNDRResult,
} from '@/types/vendor';
import { PickupAddress, VendorShipmentData, ShipmentBucketManager } from '@lorrigo/utils';
import { BucketMappingService } from '../shipments/services/bucket-mapping.service';
import { getPincodeDetails } from '@/utils/pincode';
import { DeliveryType, prisma } from '@lorrigo/db';
import { redis } from '@/lib/redis';

/**
 * SmartShip vendor implementation
 * Handles token generation and hub registration with SmartShip API
 */
export class SmartShipVendor extends BaseVendor {
  private email: string;
  private password: string;
  private bucketMappingService?: BucketMappingService;

  constructor(bucketMappingService?: BucketMappingService) {
    const vendorConfig = APP_CONFIG.VENDOR.SMART_SHIP;
    super(
      'SmartShip',
      vendorConfig.API_BASEURL || '',
      vendorConfig.API_KEY,
      CACHE_KEYS.SMARTSHIP_TOKEN
    );
    this.email = vendorConfig.EMAIL || '';
    this.password = vendorConfig.PASSWORD || '';
    this.bucketMappingService = bucketMappingService;
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
    isReverseOrder: boolean,
    pickupPincode: string,
    deliveryPincode: string,
    volumeWeight: number,
    dimensions: { length: number; width: number; height: number; weight: number },
    paymentType: 0 | 1,
    orderValue: number,
    collectableAmount: number = 0,
    couriers: string[] = [],
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
          email: 'noreply@lorrigo.com',
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
      };

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
      const serviceableCouriers = Object.values(response.data.data.carrier_info || {}).map(
        (carrier: any) => ({
          id: carrier.carrier_id.toString(),
          name: carrier.carrier_name,
          code: carrier.carrier_code || carrier.carrier_name.toLowerCase().replace(/\s+/g, '_'),
          serviceability: true,
          data: carrier,
        })
      );

      return {
        success: true,
        message:
          serviceableCouriers.length > 0
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

      const pincodeConfig = await getPincodeDetails(hubData.pincode);
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

      // Use the base class method to handle hub registration errors
      return this.handleHubRegistrationError(error, 'SmartShip');
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
      // Register with surface delivery type (3)
      const heavyResult = await this.registerHub(hubData, 3);

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
      const heavyHubId =
        heavyResult.success && heavyResult.data?.hubId ? heavyResult.data.hubId : '0';

      return {
        success,
        message: `Hub registered with SmartShip`,
        data: {
          surfaceHubId,
          expressHubId,
          heavyHubId,
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
      const isHeavyCouier = courier.weight_slab >= 10;

      const hubCode = isHeavyCouier
        ? hub.smart_ship_codes.heavy
        : isExpressCourier
          ? hub.smart_ship_codes.express
          : hub.smart_ship_codes.surface;

      const productValueWithTax = orderItems.reduce((acc: number, item: any) => {
        return (
          acc +
          (Number(item.selling_price || 0) +
            (Number(item.tax_rate || 0) / 100) * Number(item.selling_price || 0))
        );
      }, 0);

      const totalOrderValue =
        productValueWithTax *
        Number(orderItems.reduce((acc: number, item: any) => acc + Number(item.units || 1), 0));

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
          message:
            smartShipResponse?.data?.errors?.data_discrepancy
              .flatMap((error: any) => error.error.map((err: any) => err))
              .join(', ') || 'Courier not serviceable',
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
      const response = await this.makeRequest(APIs.SMART_SHIP.ORDER_MANIFEST, 'POST', requestBody, {
        Authorization: token,
      });

      // Check for errors in the response
      if (response.data?.status === false || response.data?.status === '403') {
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
  public async cancelShipment(cancelData: {
    awb: string;
    shipment: any;
  }): Promise<VendorCancellationResult> {
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

  /**
   * Track a shipment with SmartShip
   * @param trackingInput Tracking data including AWB and shipment details
   * @returns Promise resolving to tracking result with events and status
   */
  public async trackShipment(trackingInput: ShipmentTrackingData): Promise<VendorTrackingResult> {
    try {
      // Check if AWB is available
      if (!trackingInput.awb) {
        return {
          success: false,
          message: 'AWB number is required for tracking',
          data: null,
          trackingEvents: [],
        };
      }

      // Check cache for tracking data to avoid unnecessary API calls
      const cacheKey = `tracking:${this.name.toLowerCase()}:${trackingInput.awb}`;
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          return {
            success: true,
            message: 'Tracking data retrieved from cache',
            data: parsedData.data,
            trackingEvents: parsedData.trackingEvents,
          };
        } catch (parseError) {
          console.error(`Error parsing cached tracking data for ${trackingInput.awb}:`, parseError);
          // Continue with API call if cache parsing fails
        }
      }

      // Get authentication token
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: 'Failed to get SmartShip authentication token',
          data: null,
          trackingEvents: [],
        };
      }

      // Make API request to get tracking information
      const apiConfig = {
        Authorization: token,
      };

      // SmartShip API endpoint for tracking
      const endpoint = APIs.SMART_SHIP.TRACK_SHIPMENT;
      const payload = {
        awb_number: trackingInput.awb,
      };

      const response = await this.makeRequest(endpoint, 'POST', payload, apiConfig);

      // Check if response is valid
      if (!response.data || response.data.status === false || !response.data.data) {
        return {
          success: false,
          message: response.data?.message || 'No tracking data found',
          data: null,
          trackingEvents: [],
        };
      }

      // Extract tracking data
      const trackingData = response.data.data;
      const statusHistory = trackingData.status_history || [];

      // Process tracking events
      const trackingEvents: TrackingEventData[] = [];

      // Map status history to tracking events
      if (Array.isArray(statusHistory) && statusHistory.length > 0) {
        for (const status of statusHistory) {
          if (!status.status || !status.timestamp) continue;

          // Parse date string to Date object
          let timestamp: Date;
          try {
            timestamp = new Date(status.timestamp);
          } catch (e) {
            timestamp = new Date();
          }

          // Extract status and status code
          const statusText = status.status;
          const statusCode = status.status_code || statusText.toUpperCase().replace(/\s+/g, '_');

          // Determine if this is an RTO status
          const isRTO = this.isRTOStatus(statusText, statusCode);

          // Determine if this is an NDR status
          const isNDR = ShipmentBucketManager.isNDRStatus(statusText, statusCode);

          // Map to bucket using helper method
          const bucket = this.bucketMappingService
            ? await this.bucketMappingService.detectBucket(
                statusText,
                statusCode,
                this.name.toUpperCase()
              )
            : await this.mapStatusToBucket(statusText, statusCode);

          trackingEvents.push({
            status: statusText,
            status_code: statusCode,
            description: status.description || statusText,
            location: status.location || '',
            timestamp,
            activity: statusText,
            isRTO,
            isNDR,
            bucket,
          });
        }
      }

      // Add current status if not already included in status history
      if (
        trackingData.current_status &&
        !trackingEvents.some((e) => e.status === trackingData.current_status)
      ) {
        const currentStatus = trackingData.current_status;
        const currentStatusCode =
          trackingData.current_status_code || currentStatus.toUpperCase().replace(/\s+/g, '_');

        const currentBucket = this.bucketMappingService
          ? await this.bucketMappingService.detectBucket(
              currentStatus,
              currentStatusCode,
              this.name.toUpperCase()
            )
          : await this.mapStatusToBucket(currentStatus, currentStatusCode);

        trackingEvents.push({
          status: currentStatus,
          status_code: currentStatusCode,
          description: trackingData.current_status_description || currentStatus,
          location: trackingData.current_location || '',
          timestamp: new Date(),
          activity: currentStatus,
          isRTO: this.isRTOStatus(currentStatus, currentStatusCode),
          isNDR: ShipmentBucketManager.isNDRStatus(currentStatus, currentStatusCode),
          bucket: currentBucket,
        });
      }

      // Sort events by timestamp (oldest first)
      trackingEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // If no events found, add a default event
      if (trackingEvents.length === 0) {
        trackingEvents.push({
          status: 'Pending',
          status_code: 'PENDING',
          description: 'Tracking information not available',
          location: '',
          timestamp: new Date(),
          activity: 'Tracking information not available',
          isRTO: false,
          isNDR: false,
          bucket: ShipmentBucketManager.getBucketFromStatus('NEW'),
        });
      }

      // Cache the result
      // Use a longer TTL for delivered/RTO shipments (24 hours) as they won't change
      // Use a shorter TTL for in-transit shipments (30 minutes)
      const isDelivered = trackingEvents.some((event) => this.isDeliveredStatus(event.status));
      const isRTO = trackingEvents.some((event) => event.isRTO);
      const cacheTTL = isDelivered || isRTO ? 86400 : 1800; // 24 hours or 30 minutes

      await redis.set(
        cacheKey,
        JSON.stringify({
          data: response.data,
          trackingEvents,
        }),
        'EX',
        cacheTTL
      );

      return {
        success: true,
        message: 'Tracking data retrieved successfully',
        data: response.data,
        trackingEvents,
      };
    } catch (error) {
      console.error(`Error tracking shipment with SmartShip:`, error);
      return {
        success: false,
        message: `Error tracking shipment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
        trackingEvents: [],
      };
    }
  }

  /**
   * Handle NDR action with SmartShip
   * @param ndrData NDR action data
   * @returns Promise resolving to NDR result
   */
  public async ndrAction(ndrData: NDRData): Promise<VendorNDRResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get SmartShip authentication token',
          data: null,
        };
      }

      // Validate required fields
      if (!ndrData.client_order_reference_id && !ndrData.shipment?.order?.order_reference_id) {
        return {
          success: false,
          message: 'Client order reference ID is required for SmartShip NDR action',
          data: null,
        };
      }

      // Map action types to SmartShip's expected action_id values
      let actionId: number;
      switch (ndrData.action) {
        case 'reattempt':
          actionId = 1; // 1 --> reattempt
          break;
        case 'return':
          actionId = 2; // 2 --> RTO
          break;
        default:
          actionId = 1; // Default to reattempt
      }

      // Format the next attempt date for SmartShip (they expect "yyyy-MM-dd" format)
      let formattedDate: any = '';
      if (ndrData.next_attempt_date) {
        try {
          const date = new Date(ndrData.next_attempt_date);
          formattedDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } catch (error) {
          console.error('Error formatting date for SmartShip NDR:', error);
          // Default to tomorrow if date formatting fails
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          formattedDate = tomorrow.toISOString().split('T')[0];
        }
      } else {
        // Default to tomorrow if no date provided
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        formattedDate = tomorrow.toISOString().split('T')[0];
      }

      // Extract customer details from shipment data or use provided data
      const customerName = String(
        ndrData.customer_name ?? ndrData.shipment?.order?.customer?.name ?? 'Customer'
      );
      const customerPhone = String(ndrData.phone ?? ndrData.shipment?.order?.customer?.phone ?? '');
      const customerAddress = String(
        ndrData.address ?? ndrData.shipment?.order?.customer?.address?.address ?? ''
      );

      // Get the client order reference ID
      const clientOrderReferenceId = String(
        ndrData.client_order_reference_id ??
          ndrData.shipment?.order?.order_reference_id ??
          ndrData.shipment?.order?.code ??
          ''
      );

      const requestBody = {
        orders: [
          {
            action_id: actionId,
            names: customerName,
            phone: customerPhone,
            comments: ndrData.comment || 'NDR action requested',
            next_attempt_date: formattedDate,
            client_order_reference_id: [clientOrderReferenceId],
            address: customerAddress,
          },
        ],
      };

      // Make API request to SmartShip NDR endpoint
      const response = await this.makeRequest(
        APIs.SMART_SHIP.ORDER_REATTEMPT,
        'POST',
        requestBody,
        { Authorization: token }
      );

      // Check for authentication or authorization errors
      if (response.data?.status === '403') {
        return {
          success: false,
          message: 'SmartShip authentication token expired or invalid',
          data: response.data,
        };
      }

      // Check for API errors
      if (response.data?.status === false) {
        return {
          success: false,
          message: response.data?.message || 'Failed to process NDR action with SmartShip',
          data: response.data,
        };
      }

      // Check for failure in the order reattempt details
      const orderReattemptDetails = response.data?.data;
      if (orderReattemptDetails?.failure) {
        return {
          success: false,
          message: 'NDR action request failed - order reattempt unsuccessful',
          data: response.data,
        };
      }

      return {
        success: true,
        message: `NDR action '${ndrData.action}' processed successfully with SmartShip`,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error handling NDR action with SmartShip:', error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to process NDR action',
        data: error.response?.data || null,
      };
    }
  }
}
