import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { APIs } from '@/config/api';
import { CACHE_KEYS } from '@/config/cache';
import { prisma } from '@lorrigo/db';
import {
  formatAddress,
  formatPhoneNumber,
  formatShiprocketAddress,
  PickupAddress,
  ShipmentBucketManager,
} from '@lorrigo/utils';
import { BucketMappingService } from '../shipments/services/bucket-mapping.service';
import {
  VendorRegistrationResult,
  VendorServiceabilityResult,
  VendorShipmentResult,
  VendorPickupResult,
  VendorCancellationResult,
  VendorShipmentData,
  ShipmentPickupData,
  ShipmentCancelData,
  VendorTrackingResult,
  TrackingEventData,
  ShipmentTrackingData,
  NDRData,
  VendorNDRResult,
} from '@/types/vendor';
import { getPincodeDetails } from '@/utils/pincode';
import { redis } from '@/lib/redis';
import { QueueNames, addJob } from '@/lib/queue';
import { JobType } from '../shipments/queues/shipmentQueue';

/**
 * Shiprocket vendor implementation
 * Handles token generation and hub registration with Shiprocket API
 */
export class ShiprocketVendor extends BaseVendor {
  private email: string;
  private password: string;
  private bucketMappingService?: BucketMappingService;

  constructor(bucketMappingService?: BucketMappingService) {
    const vendorConfig = APP_CONFIG.VENDOR.SHIPROCKET;
    super(
      'Shiprocket',
      vendorConfig.API_BASEURL || '',
      vendorConfig.API_KEY,
      CACHE_KEYS.SHIPROCKET_TOKEN
    );
    this.email = vendorConfig.EMAIL || '';
    this.password = vendorConfig.PASSWORD || '';
    this.bucketMappingService = bucketMappingService;
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
    couriers?: string[],
    isReverseOrder?: boolean
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

      const pincodeConfig = await getPincodeDetails(hubData.pincode);
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
      // Use the base class method to handle hub registration errors
      return this.handleHubRegistrationError(error, 'Shiprocket');
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

  /**
   * Track a shipment with Shiprocket
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
        const parsedData = JSON.parse(cachedData);
        return {
          success: true,
          message: 'Tracking data retrieved from cache',
          data: parsedData.data,
          trackingEvents: parsedData.trackingEvents,
          cached: true,
        };
      }

      const token = await this.getAuthToken();

      // Prepare API request
      const endpoint = `${APIs.SHIPROCKET.TRACK_SHIPMENT}${trackingInput.awb}`;
      const apiConfig = {
        Authorization: token,
      };

      // Make API request
      const response: any = await this.makeRequest(endpoint, 'GET', null, apiConfig);

      if (!response.data || !response.data.tracking_data) {
        return {
          success: false,
          message: 'Failed to get tracking data from Shiprocket',
          data: null,
          trackingEvents: [],
        };
      }

      // Process tracking data
      const trackingData = response.data.tracking_data;

      // Get shipment details
      const shipmentTrack = trackingData.shipment_track?.[0];
      if (!shipmentTrack) {
        return {
          success: false,
          message: 'No shipment tracking data available',
          data: null,
          trackingEvents: [],
        };
      }

      // Extract EDD (Estimated Delivery Date) if available
      let edd = null;
      if (shipmentTrack.edd) {
        edd = new Date(shipmentTrack.edd);

        // Queue EDD update for batch processing
        if (trackingInput.shipmentId && edd) {
          const eddUpdate = {
            id: trackingInput.shipmentId,
            edd: edd.toISOString(),
          };

          await redis.rpush('shipment:edd:updates', JSON.stringify(eddUpdate));
        } else if (trackingInput.shipment?.id && edd) {
          const eddUpdate = {
            id: trackingInput.shipment.id,
            edd: edd.toISOString(),
          };

          await redis.rpush('shipment:edd:updates', JSON.stringify(eddUpdate));
        }
      }

      // Process tracking events
      const trackingEvents: TrackingEventData[] = [];

      // Process tracking activities
      const activities = trackingData.shipment_track_activities || [];

      for (const activity of activities) {
        // Parse date
        const timestamp = activity.date ? new Date(activity.date) : new Date();

        // Get status code
        const statusCode = activity['sr-status'] || '';
        const statusLabel = activity['sr-status-label'] || activity.activity;

        // Use optimized bucket detection with vendor-specific mappings
        const bucket = this.bucketMappingService
          ? await this.bucketMappingService.detectBucket(statusLabel, statusCode, 'SHIPROCKET')
          : ShipmentBucketManager.detectBucketFromVendorStatus(
              statusLabel,
              statusCode,
              'SHIPROCKET'
            );

        const status_code = ShipmentBucketManager.getStatusFromBucket(bucket);
        // If status code is not mapped, queue it for admin to map
        if (!bucket) {
          const unmappedStatus = {
            courier_name: 'SHIPROCKET',
            status_code: statusCode,
            status_label: statusLabel,
          };

          await redis.rpush('courier:unmapped:statuses', JSON.stringify(unmappedStatus));
        }

        // Determine if this is an RTO status
        const isNDR = ShipmentBucketManager.isNDRStatus(
          statusLabel || activity.activity,
          statusCode
        );
        const isRTO = ShipmentBucketManager.isRTOStatus(activity.activity, statusCode);

        // Create tracking event
        const trackingEvent: TrackingEventData = {
          status: activity.activity,
          status_code,
          description: activity.activity,
          location: activity.location || '',
          timestamp,
          activity: activity.activity,
          isRTO,
          isNDR,
          bucket,
          vendor_name: 'SHIPROCKET',
          raw_data: activity,
        };

        trackingEvents.push(trackingEvent);

        // Queue tracking event for bulk processing
        const shipmentId = trackingInput.shipmentId || trackingInput.shipment?.id;
        if (shipmentId) {
          const eventData = {
            ...trackingEvent,
            shipment_id: shipmentId,
          };

          // await redis.rpush('tracking:events:queue', JSON.stringify(eventData));
          // await addJob(QueueNames.SHIPMENT_TRACKING, JobType.PROCESS_BULK_TRACKING_EVENTS, [eventData], {
          //   priority: 2, // High priority for NDR processing
          //   delay: 5000, // 5 second delay to ensure tracking event is processed first
          // });
          
          // Queue NDR processing if this is a new NDR status
          if (isNDR && trackingInput.awb) {
            // We'll need to get the order ID from the shipment in the processor
            // since it's not available in the tracking input
            const ndrJobData = {
              shipmentId,
              awb: trackingInput.awb,
              vendorName: 'SHIPROCKET',
              orderId: '', // Will be fetched in the processor
              timestamp: new Date().toISOString(),
            };

            await addJob(QueueNames.SHIPMENT_TRACKING, JobType.PROCESS_NDR_DETAILS, ndrJobData, {
              priority: 2, // High priority for NDR processing
              delay: 5000, // 5 second delay to ensure tracking event is processed first
            });
          }
        }
      }

      // Get current status
      const currentStatus = shipmentTrack.current_status || '';

      // Determine the latest status bucket based on the most recent event
      let latestBucket = 0;
      if (trackingEvents.length > 0) {
        // Sort events by timestamp (newest first)
        const sortedEvents = [...trackingEvents].sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );

        latestBucket = sortedEvents?.[0]?.bucket ?? 0;
      }

      // Queue status update for batch processing
      const shipmentId = trackingInput.shipmentId || trackingInput.shipment?.id;
      if (shipmentId && latestBucket > 0) {
        const statusUpdate = {
          id: shipmentId,
          status: ShipmentBucketManager.getStatusFromBucket(latestBucket),
        };

        await redis.rpush('shipment:status:updates', JSON.stringify(statusUpdate));
      }

      // Prepare result data
      const resultData = {
        awb: trackingInput.awb,
        courier: 'SHIPROCKET',
        currentStatus,
        edd,
        activities: trackingEvents.map((event) => ({
          date: event.timestamp,
          status: event.status,
          location: event.location,
          activity: event.activity,
        })),
      };

      // Cache the result - use adaptive TTL based on status
      const isDelivered = trackingEvents.some((event) =>
        ShipmentBucketManager.isDeliveredStatus(event.status)
      );
      const isRTODelivered = trackingEvents.some(
        (event) => event.isRTO && ShipmentBucketManager.isDeliveredStatus(event.status)
      );

      // Use longer TTL for final statuses
      const cacheTTL = isDelivered || isRTODelivered ? 86400 : 1800; // 24 hours or 30 minutes

      await redis.set(
        cacheKey,
        JSON.stringify({
          data: resultData,
          trackingEvents,
        }),
        'EX',
        cacheTTL
      );

      return {
        success: true,
        message: 'Tracking data retrieved successfully',
        data: resultData,
        trackingEvents,
      };
    } catch (error: any) {
      console.error('Error tracking shipment with Shiprocket:', error);
      return {
        success: false,
        message: `Failed to track shipment: ${error.message}`,
        data: null,
        trackingEvents: [],
      };
    }
  }

  /**
   * Get NDR details from Shiprocket API
   * @param awb AWB number
   * @returns Promise resolving to NDR details result
   */
  public async getNdrDetails(awb: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get Shiprocket authentication token',
          data: null,
        };
      }

      if (!awb) {
        return {
          success: false,
          message: 'AWB number is required for NDR details',
          data: null,
        };
      }

      // Make API request to get NDR details
      const response = await this.makeRequest(
        `${APIs.SHIPROCKET.NDR_DETAILS}/${awb}`,
        'GET',
        null,
        { Authorization: token }
      );

      if (!response.data?.data || response.data.data.length === 0) {
        return {
          success: false,
          message: `No NDR details found for AWB ${awb}`,
          data: response.data,
        };
      }

      return {
        success: true,
        message: `NDR details retrieved successfully for AWB ${awb}`,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error getting NDR details from Shiprocket:', error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to get NDR details',
        data: error.response?.data || null,
      };
    }
  }

  /**
   * Handle NDR action with Shiprocket
   * @param ndrData NDR action data
   * @returns Promise resolving to NDR result
   */
  public async ndrAction(ndrData: NDRData): Promise<VendorNDRResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get Shiprocket authentication token',
          data: null,
        };
      }

      // Validate required fields
      if (!ndrData.awb) {
        return {
          success: false,
          message: 'AWB number is required for NDR action',
          data: null,
        };
      }

      // Format the reschedule date for Shiprocket (they expect "dd MMM" format)
      let formattedDate = '';
      if (ndrData.next_attempt_date) {
        try {
          const date = new Date(ndrData.next_attempt_date);
          formattedDate = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          });
        } catch (error) {
          console.error('Error formatting date for Shiprocket NDR:', error);
          formattedDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          });
        }
      }

      // Map action types to Shiprocket's expected values
      let shiprocketAction: string;
      switch (ndrData.action) {
        case 'reattempt':
          shiprocketAction = 're-attempt';
          break;
        case 'return':
          shiprocketAction = 'return';
          break;
        case 'fake-attempt':
          shiprocketAction = 'fake-attempt';
          break;
        default:
          shiprocketAction = 're-attempt';
      }

      const orderReattemptPayload = {
        action: shiprocketAction,
        comment: ndrData.comment || 'NDR action requested',
        deferred_date: formattedDate,
      };

      // Make API request to Shiprocket NDR endpoint
      const response = await this.makeRequest(
        `${APIs.SHIPROCKET.NDR_DETAILS}/${ndrData.awb}/action`,
        'POST',
        orderReattemptPayload,
        { Authorization: token }
      );

      // Check if the response was successful
      if (!response.data?.success) {
        return {
          success: false,
          message: response.data?.message || 'Failed to process NDR action with Shiprocket',
          data: response.data,
        };
      }

      return {
        success: true,
        message: `NDR action '${ndrData.action}' processed successfully with Shiprocket`,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error handling NDR action with Shiprocket:', error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to process NDR action',
        data: error.response?.data || null,
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

      const pincodeConfig = await getPincodeDetails(hubData.pincode);
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

  // TODO: Implement schedule pickup
  public schedulePickup(pickupData: any): Promise<VendorPickupResult> {
    throw new Error('Method not implemented.');
  }

  // TODO: Implement cancel shipment
  public cancelShipment(cancelData: any): Promise<VendorCancellationResult> {
    throw new Error('Method not implemented.');
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

  /**
   * Track a shipment with Shiprocket B2B
   * @param trackingData Tracking data including AWB and shipment details
   * @returns Promise resolving to tracking result
   */
  public async trackShipment(trackingInput: ShipmentTrackingData): Promise<VendorTrackingResult> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to get Shiprocket B2B authentication token',
          data: null,
          trackingEvents: [],
        };
      }

      const { awb } = trackingInput;

      // Make API request to Shiprocket B2B tracking endpoint
      // Using direct URL construction since APIs.SHIPROCKET_B2B.TRACK_SHIPMENT might not be defined
      const endpoint = `/v1/external/b2b/courier/track/awb/${awb}`;
      const response = await this.makeRequest(endpoint, 'GET', null, {
        Authorization: token,
      });

      const trackingResponse = response.data;
      if (!trackingResponse || !trackingResponse.status_history) {
        return {
          success: false,
          message: `No tracking data found for AWB ${awb}`,
          data: null,
          trackingEvents: [],
        };
      }

      const history = trackingResponse.status_history || [];
      if (history.length === 0) {
        return {
          success: false,
          message: `No tracking history found for AWB ${awb}`,
          data: trackingResponse,
          trackingEvents: [],
        };
      }

      // Sort history by timestamp (oldest first)
      history.sort(
        (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Try to fetch status mappings from database
      let statusMappings: any[] = [];
      try {
        // Check if courierStatusMapping model exists in prisma client
        if (prisma.courierStatusMapping) {
          statusMappings = await prisma.courierStatusMapping.findMany({
            where: {
              courier_name: 'SHIPROCKET_B2B',
              is_active: true,
            },
          });
        }
      } catch (dbError) {
        console.error('Error fetching courier status mappings:', dbError);
      }

      // Map history to tracking events
      const trackingEvents: TrackingEventData[] = history.map((item: any) => {
        const status = item.status || '';
        const statusCode = item.status || ''; // B2B API might use the same value for status and statusCode
        const description = item.reason || '';

        // Try to find bucket from status mappings
        let bucket: number | undefined;
        const mapping = statusMappings.find((m) => m.status_code === statusCode);
        if (mapping) {
          bucket = mapping.bucket;
        } else {
          // Use ShipmentBucketManager to detect bucket from status
          bucket = ShipmentBucketManager.detectBucketFromVendorStatus(
            status,
            statusCode,
            'SHIPROCKET_B2B'
          );
        }

        const isRTO = ShipmentBucketManager.isRTOStatus(status, statusCode);
        const isDelivered = ShipmentBucketManager.isDeliveredStatus(status, statusCode);
        const isNDR = ShipmentBucketManager.isNDRStatus(status, statusCode);

        return {
          status: status,
          status_code: statusCode,
          description: description,
          location: item.location || '',
          timestamp: new Date(item.timestamp),
          activity: item.remarks || status,
          isRTO: isRTO,
          isNDR: isNDR,
          isDelivered: isDelivered,
          bucket: bucket,
          vendor_name: 'SHIPROCKET_B2B',
          raw_data: item,
        };
      });

      return {
        success: true,
        message: `Successfully retrieved tracking data for AWB ${awb}`,
        data: trackingResponse,
        trackingEvents,
      };
    } catch (error: any) {
      console.error('Error tracking shipment with Shiprocket B2B:', error);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to track shipment',
        data: null,
        trackingEvents: [],
      };
    }
  }

  /**
   * Handle NDR action with Shiprocket B2B
   * Note: Shiprocket B2B may have different NDR handling than regular Shiprocket
   * @param ndrData NDR action data
   * @returns Promise resolving to NDR result
   */
  public async ndrAction(ndrData: NDRData): Promise<VendorNDRResult> {
    try {
      // Shiprocket B2B NDR handling is similar to regular Shiprocket
      // but might have different endpoints or authentication
      console.log('NDR action requested for Shiprocket B2B:', {
        awb: ndrData.awb,
        action: ndrData.action,
        comment: ndrData.comment,
      });

      return {
        success: false,
        message:
          'Shiprocket B2B NDR actions are not yet implemented. Please use regular Shiprocket or contact support.',
        data: {
          vendor: 'ShiprocketB2B',
          awb: ndrData.awb,
          action: ndrData.action,
          comment: ndrData.comment,
          manual_action_required: true,
        },
      };
    } catch (error: any) {
      console.error('Error handling NDR action with Shiprocket B2B:', error);

      return {
        success: false,
        message: 'Failed to process NDR action with Shiprocket B2B',
        data: null,
      };
    }
  }
}
