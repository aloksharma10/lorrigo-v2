import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { formatPhoneNumber, ShipmentBucketManager } from '@lorrigo/utils';
import { prisma } from '@lorrigo/db';
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
import { redis } from '@/lib/redis';
import { BucketMappingService } from '../shipments/services/bucket-mapping.service';

/**
 * Delhivery vendor implementation
 * Handles token generation and hub registration with Delhivery API
 */
export class DelhiveryVendor extends BaseVendor {
  private weightCategory: '0.5' | '5' | '10';
  private bucketMappingService?: BucketMappingService;

  constructor(weightCategory: '0.5' | '5' | '10' = '5', bucketMappingService?: BucketMappingService) {
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
    this.bucketMappingService = bucketMappingService;
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
    isReverseOrder: boolean,
    pickupPincode: string,
    deliveryPincode: string,
    weight: number,
    dimensions: { length: number; width: number; height: number },
    paymentType: 0 | 1,
    orderValue: number,
    collectableAmount?: number,
    couriers?: string[],
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

      const courierData = isServiceable ? couriersData.find((c: any) => c.courier.is_reversed_courier === isReverseOrder) : null;

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
        return_pin: hubData.isRTOAddressSame ? hubData.pincode.toString() : hubData.rtoPincode?.toString(),
        return_city: hubData.isRTOAddressSame ? hubData.city : hubData.rtoCity,
        return_state: hubData.isRTOAddressSame ? hubData.state : hubData.rtoState,
        return_country: 'India',
      };

      const response = await this.makeRequest(APIs.DELHIVERY.PICKUP_LOCATION, 'POST', payload, apiConfig);

      return {
        success: true,
        message: `Hub registered with Delhivery ${this.weightCategory} kg`,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`Error registering hub with Delhivery ${this.weightCategory}:`, JSON.stringify(error.response?.data));

      // Use the base class method to handle hub registration errors
      return this.handleHubRegistrationError(error, `Delhivery ${this.weightCategory} kg`);
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

      const isReversed = order.type === 'RETURNED' || order.is_reverse_order;
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
              quantity: orderItems.reduce((acc: number, item: any) => acc + Number(item.units || 1), 0),
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

      const response = await this.makeRequest(APIs.DELHIVERY.CREATE_ORDER, 'POST', urlEncodedPayload, {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      });

      const delhiveryResponse = response.data?.packages?.[0];

      if (delhiveryResponse?.status === 'Fail' && delhiveryResponse?.remarks?.[0]?.includes('waybill')) {
        return {
          success: false,
          message: 'Failed to create shipment with Delhivery. Unable to consume waybill, please try again with correct waybill number.',
          data: response.data,
        };
      }

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
  public async schedulePickup(pickupData: { awb: string; pickupDate: string; hub: any; shipment: any }): Promise<VendorPickupResult> {
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
        Authorization: token,
      });

      // Check for errors in the response
      if (!response.data?.success) {
        return {
          success: false,
          message: response.data?.error || `Failed to schedule pickup with Delhivery ${this.weightCategory}`,
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
  public async cancelShipment(cancelData: { awb: string; shipment: any }): Promise<VendorCancellationResult> {
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
          message: response.data?.error || `Failed to cancel shipment with Delhivery ${this.weightCategory}`,
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

  /**
   * Track a shipment with Delhivery
   * @param trackingData Tracking data including AWB and shipment details
   * @returns Promise resolving to tracking result
   */
  public async trackShipment(trackingData: ShipmentTrackingData): Promise<VendorTrackingResult> {
    try {
      // Check if AWB is available
      if (!trackingData.awb) {
        return {
          success: false,
          message: 'AWB number is required for tracking',
          data: null,
          trackingEvents: [],
        };
      }

      // Check cache for tracking data to avoid unnecessary API calls
      const cacheKey = `tracking:${this.name.toLowerCase()}:${trackingData.awb}`;
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
          console.error(`Error parsing cached tracking data for ${trackingData.awb}:`, parseError);
          // Continue with API call if cache parsing fails
        }
      }

      // Get authentication token
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: `Failed to get Delhivery ${this.weightCategory} kg authentication token`,
          data: null,
          trackingEvents: [],
        };
      }

      // Make API request to get tracking information
      const apiConfig = {
        Authorization: token,
      };

      // Delhivery API endpoint for tracking
      const endpoint = `${APIs.DELHIVERY.TRACK_ORDER}${trackingData.awb}/json`;
      const response = await this.makeRequest(endpoint, 'GET', null, apiConfig);

      // Check if response is valid
      if (!response.data || !response.data.ShipmentData || response.data.ShipmentData.length === 0) {
        return {
          success: false,
          message: `No tracking data found for AWB ${trackingData.awb}`,
          data: null,
          trackingEvents: [],
        };
      }

      // Extract tracking data
      const shipmentData = response.data.ShipmentData[0];
      const scans = shipmentData.Scans || [];

      // Process tracking events
      const trackingEvents: TrackingEventData[] = [];

      // Map scans to tracking events
      if (Array.isArray(scans) && scans.length > 0) {
        for (const scan of scans) {
          if (!scan.ScanDetail || !scan.ScanDateTime) continue;

          // Parse date string to Date object
          let timestamp: Date;
          try {
            // Delhivery date format: "24-Mar-2023 15:30:45"
            timestamp = new Date(scan.ScanDateTime);
            if (isNaN(timestamp.getTime())) {
              // Try alternative parsing if standard parsing fails
              const parts = scan.ScanDateTime.split(/[- :]/);
              if (parts.length >= 6) {
                // Map month abbreviation to month number
                const months: Record<string, number> = {
                  Jan: 0,
                  Feb: 1,
                  Mar: 2,
                  Apr: 3,
                  May: 4,
                  Jun: 5,
                  Jul: 6,
                  Aug: 7,
                  Sep: 8,
                  Oct: 9,
                  Nov: 10,
                  Dec: 11,
                };
                const day = parseInt(parts[0]);
                const month = months[parts[1]] || 0;
                const year = parseInt(parts[2]);
                const hour = parseInt(parts[3]);
                const minute = parseInt(parts[4]);
                const second = parseInt(parts[5]);
                timestamp = new Date(year, month, day, hour, minute, second);
              } else {
                timestamp = new Date();
              }
            }
          } catch (e) {
            timestamp = new Date();
          }

          // Extract status and status code
          const status = scan.ScanDetail;
          const statusCode = scan.Scan;

          // Determine if this is an RTO status
          const isRTO = this.isRTOStatus(status, statusCode);

          // Determine if this is an NDR status
          const isNDR = ShipmentBucketManager.isNDRStatus(status, statusCode);

          // Map to bucket using helper method
          const bucket = this.bucketMappingService
            ? await this.bucketMappingService.detectBucket(status, statusCode, this.name.toUpperCase())
            : await this.mapStatusToBucket(status, statusCode);

          trackingEvents.push({
            status,
            status_code: statusCode,
            description: scan.Instructions || status,
            location: scan.ScannedLocation || '',
            timestamp,
            activity: status,
            isRTO,
            isNDR,
            bucket,
          });
        }
      }

      // Add current status if not already included in scans
      if (shipmentData.Status && !trackingEvents.some((e) => e.status === shipmentData.Status)) {
        const currentStatusBucket = this.bucketMappingService
          ? await this.bucketMappingService.detectBucket(shipmentData.Status, '', this.name.toUpperCase())
          : await this.mapStatusToBucket(shipmentData.Status);

        trackingEvents.push({
          status: shipmentData.Status,
          status_code: shipmentData.Status.toUpperCase().replace(/\s+/g, '_'),
          description: shipmentData.StatusDescription || shipmentData.Status,
          location: shipmentData.Destination || '',
          timestamp: new Date(),
          activity: shipmentData.Status,
          isRTO: this.isRTOStatus(shipmentData.Status),
          isNDR: ShipmentBucketManager.isNDRStatus(shipmentData.Status),
          bucket: currentStatusBucket,
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
      console.error(`Error tracking shipment with Delhivery ${this.weightCategory}:`, error);
      return {
        success: false,
        message: `Error tracking shipment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
        trackingEvents: [],
      };
    }
  }

  /**
   * Handle NDR action with Delhivery
   *
   * Important constraints and considerations:
   * 1. For RE-ATTEMPT:
   *    - Can only be applied if current NSL code is in: ["EOD-74", "EOD-15", "EOD-104", "EOD-43", "EOD-86", "EOD-11", "EOD-69", "EOD-6"]
   *    - Attempt count should be 1 or 2
   *    - Recommended to apply after 9 PM for best results
   *
   * 2. For PICKUP_RESCHEDULE (used for returns):
   *    - Can be applied if NSL code is in: ["EOD-777", "EOD-21"]
   *    - Shipment status will be marked as Cancelled (Non OTP Cancelled)
   *    - Attempt count should be 1 or 2
   *    - Apply after 9 PM to ensure dispatches are closed
   *
   * 3. The API is asynchronous and returns a UPL ID for status tracking
   *
   * @param ndrData NDR action data
   * @returns Promise resolving to NDR result
   */
  public async ndrAction(ndrData: NDRData): Promise<VendorNDRResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: `Failed to get Delhivery ${this.weightCategory} kg authentication token`,
          data: null,
        };
      }

      // Validate required fields
      if (!ndrData.awb) {
        return {
          success: false,
          message: 'AWB number is required for Delhivery NDR action',
          data: null,
        };
      }

      // Map action types to Delhivery's expected values
      let delhiveryAction: string;
      switch (ndrData.action) {
        case 'reattempt':
          delhiveryAction = 'RE-ATTEMPT';
          break;
        case 'return':
          // Delhivery uses PICKUP_RESCHEDULE for return/cancellation scenarios
          delhiveryAction = 'PICKUP_RESCHEDULE';
          break;
        default:
          // Default to re-attempt for unknown actions
          delhiveryAction = 'RE-ATTEMPT';
      }

      // Prepare the request payload
      const requestBody = {
        data: [
          {
            waybill: ndrData.awb,
            act: delhiveryAction,
          },
        ],
      };

      // Make API request to Delhivery NDR endpoint
      const response = await this.makeRequest(APIs.DELHIVERY.NDR_ACTION, 'POST', requestBody, {
        Authorization: token,
      });

      // Check if the response was successful
      if (!response.data) {
        return {
          success: false,
          message: 'Invalid response from Delhivery NDR API',
          data: response.data,
        };
      }

      // Delhivery NDR API is asynchronous and returns a UPL ID for tracking
      const uplId = response.data.upl_id || response.data.data?.upl_id;

      if (!uplId) {
        // Check for errors in the response
        const errorMessage = response.data.error || response.data.message || 'Failed to process NDR action';
        return {
          success: false,
          message: `Delhivery NDR API error: ${errorMessage}`,
          data: response.data,
        };
      }

      return {
        success: true,
        message: `NDR action '${ndrData.action}' (${delhiveryAction}) processed successfully with Delhivery ${this.weightCategory} kg. UPL ID: ${uplId}`,
        data: {
          vendor: `Delhivery-${this.weightCategory}`,
          awb: ndrData.awb,
          action: ndrData.action,
          delhivery_action: delhiveryAction,
          upl_id: uplId,
          comment: ndrData.comment,
          response: response.data,
        },
      };
    } catch (error: any) {
      console.error(`Error handling NDR action with Delhivery ${this.weightCategory}:`, error);

      // Check for specific API errors
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message;
        if (errorMessage?.includes('NSL') || errorMessage?.includes('attempt count')) {
          return {
            success: false,
            message: `Delhivery NDR constraint violation: ${errorMessage}. Please check NSL code and attempt count requirements.`,
            data: error.response?.data,
          };
        }
      }

      return {
        success: false,
        message: error.response?.data?.message || error.message || `Failed to process NDR action with Delhivery ${this.weightCategory}`,
        data: error.response?.data || null,
      };
    }
  }

  /**
   * Check NDR status using UPL ID
   * @param uplId UPL ID returned from NDR action
   * @returns Promise resolving to NDR status result
   */
  public async checkNDRStatus(uplId: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: `Failed to get Delhivery ${this.weightCategory} kg authentication token`,
          data: null,
        };
      }

      if (!uplId) {
        return {
          success: false,
          message: 'UPL ID is required to check NDR status',
          data: null,
        };
      }

      // Make API request to check NDR status
      const response = await this.makeRequest(`${APIs.DELHIVERY.NDR_STATUS}?upl_id=${uplId}`, 'GET', null, { Authorization: token });

      return {
        success: true,
        message: 'NDR status retrieved successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error(`Error checking NDR status with Delhivery ${this.weightCategory}:`, error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to check NDR status',
        data: error.response?.data || null,
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
   * @param bucketMappingService Optional bucket mapping service
   * @returns Array of Delhivery vendor instances
   */
  public static getAllVendors(bucketMappingService?: BucketMappingService): DelhiveryVendor[] {
    return [new DelhiveryVendor('0.5', bucketMappingService), new DelhiveryVendor('5', bucketMappingService), new DelhiveryVendor('10', bucketMappingService)];
  }

  /**
   * Get Delhivery vendor instance for a specific weight category
   * @param weightCategory Weight category
   * @param bucketMappingService Optional bucket mapping service
   * @returns Delhivery vendor instance
   */
  public static getVendor(weightCategory: '0.5' | '5' | '10', bucketMappingService?: BucketMappingService): DelhiveryVendor {
    return new DelhiveryVendor(weightCategory, bucketMappingService);
  }
}
