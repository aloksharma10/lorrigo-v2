import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { ShiprocketVendor } from './shiprocket.vendor';
import { DelhiveryVendorFactory, DelhiveryVendor } from './delhivery.vendor';
import { SmartShipVendor } from './smart-ship.vendor';
import { VendorServiceabilityResult, ShipmentTrackingData, TrackingEventData } from '@/types/vendor';
import { FastifyInstance } from 'fastify';
import { Courier, Order, ShipmentStatus } from '@lorrigo/db';
import { ShipmentBucketManager } from '@lorrigo/utils';
import { BucketMappingService } from '../shipments/services/bucket-mapping.service';

/**
 * Service for managing vendor operations
 * Handles vendor selection and delegation to specific vendor implementations
 */
export class VendorService {
  private vendors: Map<string, BaseVendor>;
  private fastify: FastifyInstance;
  private bucketMappingService: BucketMappingService;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.vendors = new Map();
    this.bucketMappingService = new BucketMappingService(fastify);
    this.initializeVendors();
  }

  /**
   * Initialize vendor instances
   */
  private initializeVendors(): void {
    // Initialize Shiprocket
    this.vendors.set('SHIPROCKET', new ShiprocketVendor(this.bucketMappingService));

    // Initialize Delhivery with different weight categories
    const delhiveryVendors = DelhiveryVendorFactory.getAllVendors(this.bucketMappingService);
    delhiveryVendors.forEach((vendor) => {
      this.vendors.set(`DELHIVERY_${vendor.getName().split('-')[1]}`, vendor);
    });

    // Initialize SmartShip
    this.vendors.set('SMARTSHIP', new SmartShipVendor(this.bucketMappingService));
  }

  /**
   * Get vendor instance by name
   * @param vendorName Vendor name
   * @returns Vendor instance or null if not found
   */
  public getVendor(vendorName: string): BaseVendor | null {
    return this.vendors.get(vendorName) || null;
  }

  /**
   * Get all available vendor instances
   * @returns Array of vendor instances
   */
  public getAllVendors(): BaseVendor[] {
    return Array.from(this.vendors.values());
  }

  /**
   * Get the bucket mapping service instance
   * @returns BucketMappingService instance
   */
  public getBucketMappingService(): BucketMappingService {
    return this.bucketMappingService;
  }

  /**
   * Check serviceability across all vendors or specified vendors
   * @param pickupPincode Pickup pincode
   * @param deliveryPincode Delivery pincode
   * @param volumeWeight Volume weight in kg
   * @param dimensions Package dimensions
   * @param paymentType Payment type (0 for prepaid, 1 for COD)
   * @param collectableAmount Collectable amount for COD
   * @param vendorNames List of vendor names to check
   * @returns Promise resolving to combined serviceability results
   */
  public async checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
    volumeWeight: number,
    dimensions: { length: number; width: number; height: number; weight: number },
    paymentType: 0 | 1,
    collectableAmount: number = 0,
    vendorNames?: string[]
  ): Promise<{
    success: boolean;
    message: string;
    serviceableVendors: {
      [vendorName: string]: VendorServiceabilityResult;
    };
  }> {
    try {
      // Determine which vendors to check
      const vendorsToCheck =
        vendorNames && vendorNames.length > 0
          ? (vendorNames.map((name) => this.vendors.get(name)).filter(Boolean) as BaseVendor[])
          : this.getAllVendors();

      if (vendorsToCheck.length === 0) {
        return {
          success: false,
          message: 'No vendors available to check serviceability',
          serviceableVendors: {},
        };
      }

      // Check serviceability for each vendor
      const serviceabilityPromises = vendorsToCheck.map(async (vendor) => {
        const vendorName = vendor.getName();
        try {
          const result = await vendor.checkServiceability(
            pickupPincode,
            deliveryPincode,
            volumeWeight,
            dimensions,
            paymentType,
            collectableAmount
          );
          return { vendorName, result };
        } catch (error) {
          console.error(`Error checking serviceability for ${vendorName}:`, error);
          return {
            vendorName,
            result: {
              success: false,
              message: `Error checking serviceability for ${vendorName}`,
              serviceableCouriers: [],
            },
          };
        }
      });

      const results = await Promise.all(serviceabilityPromises);

      // Combine results
      const serviceableVendors: { [vendorName: string]: VendorServiceabilityResult } = {};
      results.forEach(({ vendorName, result }) => {
        serviceableVendors[vendorName] = result;
      });

      // Determine overall success
      const anyServiceable = results.some(
        ({ result }) => result.success && result.serviceableCouriers.length > 0
      );

      return {
        success: anyServiceable,
        message: anyServiceable
          ? 'Serviceable couriers found'
          : 'No serviceable couriers found across vendors',
        serviceableVendors,
      };
    } catch (error) {
      console.error('Error in vendor serviceability check:', error);
      return {
        success: false,
        message: 'Failed to check serviceability',
        serviceableVendors: {},
      };
    }
  }

  /**
   * Check serviceability for couriers associated with a specific plan
   * @param userId User ID
   * @param planId Plan ID
   * @param pickupPincode Pickup pincode
   * @param deliveryPincode Delivery pincode
   * @param volumeWeight Volume weight in kg
   * @param dimensions Package dimensions
   * @param paymentType Payment type (0 for prepaid, 1 for COD)
   * @param collectableAmount Collectable amount for COD
   * @returns Promise resolving to serviceable couriers
   */
  public async checkServiceabilityForPlan(
    userId: string,
    pickupPincode: string,
    deliveryPincode: string,
    volumeWeight: number,
    dimensions: { length: number; width: number; height: number; weight: number },
    paymentType: 0 | 1,
    collectableAmount: number = 0,
    isReverseOrder: boolean = false
  ): Promise<{
    success: boolean;
    message: string;
    serviceableCouriers: Array<{
      id: string;
      name: string;
      code: string;
      serviceability: boolean;
      pricing?: any;
      vendor?: string;
      data?: any;
    }>;
  }> {
    try {
      // Create Redis cache key - similar pattern to getShipmentRates
      const dimensionsStr = `${dimensions.length}x${dimensions.width}x${dimensions.height}x${dimensions.weight}`;
      const cacheKey = `serviceability-${userId}-${isReverseOrder ? 'reverse' : 'forward'}-${pickupPincode}-${deliveryPincode}-${volumeWeight}-${dimensionsStr}-${paymentType}-${collectableAmount}`;

      // Try to get cached result first
      const cachedResult = await this.fastify.redis.get(cacheKey);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      // Get user's plan and associated couriers
      const user = await this.fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          plan: {
            where: {
              is_active: true,
            },
            include: {
              plan_courier_pricings: {
                where: {
                  courier: {
                    is_active: true,
                    channel_config: {
                      is_active: true,
                    },
                  },
                },
                include: {
                  courier: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                      courier_code: true,
                      is_active: true,
                      weight_unit: true,
                      weight_slab: true,
                      increment_weight: true,
                      cod_charge_hard: true,
                      cod_charge_percent: true,
                      is_reversed_courier: true,
                      type: true,
                      channel_config: {
                        select: {
                          name: true,
                          nickname: true,
                          is_active: true,
                        },
                      },
                    },
                  },
                  zone_pricing: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.plan) {
        const errorResult = {
          success: false,
          message: 'User has no assigned plan',
          serviceableCouriers: [],
        };
        // Cache error result for 5 minutes to avoid repeated DB queries
        await this.fastify.redis.set(cacheKey, JSON.stringify(errorResult), 'EX', 180);
        return errorResult;
      }

      // Extract couriers from the plan
      const planCouriers = user.plan.plan_courier_pricings.map((pricing) => pricing.courier);

      // Group couriers by vendor
      const couriersByVendor: { [vendorName: string]: { courierId: string; courier: any }[] } = {};

      planCouriers.forEach((courier) => {
        // Extract vendor name from courier config
        const vendorName = courier.channel_config.name;
        if (!couriersByVendor[vendorName]) {
          couriersByVendor[vendorName] = [];
        }
        couriersByVendor[vendorName].push({
          courierId: courier.courier_code || courier.code,
          courier,
        });
      });

      // Check serviceability for each vendor with their associated couriers
      const serviceabilityPromises = Object.entries(couriersByVendor).map(
        async ([vendorName, couriers]) => {
          const vendor = this.getVendor(vendorName);
          if (!vendor) return null;

          const courierIds = couriers.map((c) => c.courierId);
          try {
            // Different vendors have different parameter requirements
            // We need to adapt based on the vendor name
            let result;
            
            if (vendorName.startsWith('DELHIVERY')) {
              // Delhivery vendors have extended the base interface with additional parameters
              // Use type assertion to call with the extended parameter list
              const delhiveryVendor = vendor as DelhiveryVendor;
              result = await delhiveryVendor.checkServiceability(
                pickupPincode,
                deliveryPincode,
                volumeWeight,
                dimensions,
                paymentType,
                collectableAmount,
                courierIds,
                isReverseOrder,
                couriers
              );
            } else {
              // Default call for other vendors that follow the base interface
              result = await vendor.checkServiceability(
                pickupPincode,
                deliveryPincode,
                volumeWeight,
                dimensions,
                paymentType,
                collectableAmount,
                courierIds
              );
            }

            // Match serviceability results with courier pricing
            return {
              vendorName,
              result: {
                ...result,
                serviceableCouriers: result.serviceableCouriers.map((sc: any) => {
                  // Find courier in the plan
                  const courierInfo = couriers.find(
                    (c) => c.courierId === sc.id || c.courier.code === sc.code
                  );
                  // Find pricing for this courier
                  const pricing = user.plan?.plan_courier_pricings.find(
                    (p) => p.courier_id === courierInfo?.courier.id
                  );

                  return {
                    id: courierInfo?.courier.id,
                    name: courierInfo?.courier.name,
                    code: courierInfo?.courier.code,
                    serviceability: sc.serviceability,
                    data: {
                      min_weight: sc.data.min_weight,
                      estimated_delivery_days: sc.data.estimated_delivery_days,
                      etd: sc.data.etd,
                      rating: sc.data.rating ?? 4,
                      pickup_performance: sc.data.pickup_performance,
                      rto_performance: sc.data.rto_performance,
                      delivery_performance: sc.data.delivery_performance,
                      zone: sc.data.zone,
                    },
                    pricing: pricing || null,
                    vendor: vendorName,
                  };
                }),
              },
            };
          } catch (error) {
            console.error(`Error checking serviceability for ${vendorName}:`, error);
            return null;
          }
        }
      );

      const results = await Promise.all(serviceabilityPromises);

      // Combine serviceable couriers from all vendors
      const allServiceableCouriers = results
        .filter(Boolean)
        .flatMap((result) => result?.result.serviceableCouriers || []);

      const finalResult = {
        success: allServiceableCouriers.length > 0,
        message:
          allServiceableCouriers.length > 0
            ? 'Serviceable couriers found'
            : 'No serviceable couriers found for the plan',
        serviceableCouriers: allServiceableCouriers,
      };

      // Cache the result - success results for 1 hour, no serviceability for 30 minutes
      const cacheExpiry = finalResult.success ? 3600 : 1800;
      await this.fastify.redis.set(cacheKey, JSON.stringify(finalResult), 'EX', cacheExpiry);

      return finalResult;
    } catch (error) {
      console.error('Error checking serviceability for plan:', error);

      // Create error result
      const errorResult = {
        success: false,
        message: 'Failed to check serviceability for plan',
        serviceableCouriers: [],
      };

      // Cache error for short duration to prevent repeated failures
      try {
        const errorCacheKey = `serviceability-error-${userId}-${pickupPincode}-${deliveryPincode}`;
        await this.fastify.redis.set(errorCacheKey, JSON.stringify(errorResult), 'EX', 60);
      } catch (cacheError) {
        console.error('Error caching serviceability error:', cacheError);
      }

      return errorResult;
    }
  }
  /**
   * Create a shipment with a specific vendor
   * @param vendorName Vendor name
   * @param shipmentData Shipment data
   * @returns Promise resolving to shipment creation result
   */
  public async createShipmentOnVendor(
    vendorName: string,
    shipmentData: {
      order: Order;
      courier: Courier;
      hub: any;
      awb?: string;
      shipmentCode: string;
      isSchedulePickup?: boolean;
    }
  ): Promise<{
    success: boolean;
    message: string;
    awb?: string;
    pickup_date?: string;
    routingCode?: string;
    data?: any;
  }> {
    try {
      const vendor = this.getVendor(vendorName);
      if (!vendor) {
        return {
          success: false,
          message: `Vendor ${vendorName} not found`,
          data: null,
        };
      }

      // Prepare data for vendor API
      const { order, courier, hub, awb, isSchedulePickup } = shipmentData;

      // Check if hub is valid
      if (!hub || !hub.address || !hub.address.pincode) {
        return {
          success: false,
          message: 'Invalid hub data. Please select a valid pickup location.',
          data: null,
        };
      }

      // Extract order items
      const orderItems = await this.fastify.prisma.orderItem.findMany({
        where: { order_id: order.id },
      });

      // Get order package details
      const packageDetails = await this.fastify.prisma.package.findUnique({
        where: { id: order.package_id },
      });

      if (!packageDetails) {
        return {
          success: false,
          message: 'Package details not found',
          data: null,
        };
      }

      // Get user's business details if available
      const userDetails = await this.fastify.prisma.user.findUnique({
        where: { id: order.user_id },
        select: {
          business_name: true,
          gstin: true,
        },
      });

      // Prepare vendor shipment data
      const vendorShipmentData = {
        order,
        hub,
        orderItems,
        paymentMethod: order.payment_mode,
        dimensions: {
          length: packageDetails.length,
          width: packageDetails.breadth,
          height: packageDetails.height,
          weight: packageDetails.dead_weight,
        },
        courier,
        seller_gst: userDetails?.gstin || '',
        isSchedulePickup,
      };

      // Create shipment with vendor
      const result = await vendor.createShipment(vendorShipmentData);

      return {
        success: result.success,
        message: result.message || '',
        awb: result.awb || awb,
        routingCode: result.routingCode || '',
        pickup_date: result.pickup_date || '',
        data: result.data,
      };
    } catch (error: unknown) {
      console.error(`Error creating shipment with vendor ${vendorName}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : `Failed to create shipment with ${vendorName}`,
        data: null,
      };
    }
  }

  /**
   * Schedule pickup with a specific vendor
   * @param vendorName Vendor name
   * @param pickupData Pickup data
   * @returns Promise resolving to pickup scheduling result
   */
  public async schedulePickup(
    vendorName: string,
    pickupData: {
      awb: string;
      pickupDate: string;
      hub: any;
      shipment: any;
    }
  ): Promise<{
    success: boolean;
    message: string;
    pickup_date: string | null;
    data?: any;
  }> {
    try {
      const vendor = this.getVendor(vendorName);
      if (!vendor) {
        return {
          success: false,
          message: `Vendor ${vendorName} not found`,
          pickup_date: null,
          data: null,
        };
      }

      // Directly use the vendor's implementation
      const result = await vendor.schedulePickup(pickupData);

      return {
        success: result.success,
        message: result.message,
        pickup_date: result.pickup_date || null,
        data: result.data,
      };
    } catch (error: unknown) {
      console.error(`Error scheduling pickup with vendor ${vendorName}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : `Failed to schedule pickup with ${vendorName}`,
        pickup_date: null,
        data: null,
      };
    }
  }

  /**
   * Cancel a shipment with a specific vendor
   * @param vendorName Vendor name
   * @param cancelData Cancellation data
   * @returns Promise resolving to cancellation result
   */
  public async cancelShipment(
    vendorName: string,
    cancelData: {
      awb: string;
      shipment: any;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const vendor = this.getVendor(vendorName);
      if (!vendor) {
        return {
          success: false,
          message: `Vendor ${vendorName} not found`,
          data: null,
        };
      }

      // Directly use the vendor's implementation
      const result = await vendor.cancelShipment(cancelData);

      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    } catch (error: unknown) {
      console.error(`Error cancelling shipment with vendor ${vendorName}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : `Failed to cancel shipment with ${vendorName}`,
        data: null,
      };
    }
  }

  /**
   * Track a shipment with a specific vendor
   * @param vendorName Vendor name
   * @param trackingData Tracking data
   * @returns Promise resolving to tracking result
   */
  public async trackShipment(
    vendorName: string,
    trackingData: ShipmentTrackingData
  ): Promise<{
    success: boolean;
    message: string;
    trackingEvents?: TrackingEventData[];
    data?: any;
    latestBucket?: number;
  }> {
    try {
      const vendor = this.getVendor(vendorName);
      if (!vendor) {
        return {
          success: false,
          message: `Vendor ${vendorName} not found`,
          trackingEvents: [],
          data: null,
        };
      }

      // Skip tracking for shipments in final states
      if (trackingData.shipment?.status) {
        const status = trackingData.shipment.status as ShipmentStatus;
        if (ShipmentBucketManager.isFinalStatus(status)) {
          return {
            success: false,
            message: `Shipment is in final status (${status}), no tracking needed`,
            trackingEvents: [],
            data: null,
          };
        }
      }

      // Get tracking data from vendor
      const result = await vendor.trackShipment(trackingData);
      
      if (!result.success || !result.trackingEvents || result.trackingEvents.length === 0) {
        return {
          success: false,
          message: result.message || 'No tracking events found',
          trackingEvents: [],
          data: result.data,
        };
      }

      // Find the latest event with a bucket
      const eventsWithBuckets = result.trackingEvents.filter(event => event.bucket !== undefined);
      if (eventsWithBuckets.length === 0) {
        return {
          success: true,
          message: 'Tracking events found but no bucket information available',
          trackingEvents: result.trackingEvents,
          data: result.data,
        };
      }

      // Sort events by timestamp (newest first) to get the latest status
      const sortedEvents = [...eventsWithBuckets].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      // Make sure we have sorted events
      if (sortedEvents.length === 0) {
        return {
          success: false,
          message: 'No valid tracking events with bucket information found',
          trackingEvents: result.trackingEvents,
          data: result.data,
        };
      }

      // Get the latest bucket (we've already checked that sortedEvents is not empty)
      const latestBucket = sortedEvents[0]?.bucket;

      return {
        success: true,
        message: result.message || 'Successfully retrieved tracking data',
        trackingEvents: result.trackingEvents,
        data: result.data,
        latestBucket,
      };
    } catch (error: unknown) {
      console.error(`Error tracking shipment with vendor ${vendorName}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : `Failed to track shipment with ${vendorName}`,
        trackingEvents: [],
        data: null,
      };
    }
  }

  /**
   * Process shipment tracking in batches
   * @param shipments Array of shipments to track
   * @returns Promise resolving to tracking results
   */
  public async processShipmentTrackingBatch(
    shipments: Array<{
      id: string;
      awb: string | null;
      status: ShipmentStatus;
      order: {
        id: string;
        code: string;
      };
      courier: {
        channel_config: {
          name: string;
        };
      } | null;
    }>
  ): Promise<{
    processed: number;
    updated: number;
    skipped: number;
    failed: number;
    results: Array<{
      shipmentId: string;
      success: boolean;
      message: string;
      newStatus?: ShipmentStatus;
      newBucket?: number;
    }>;
  }> {
    const results = [];
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const shipment of shipments) {
      try {
        // Skip shipments without AWB or courier
        if (!shipment.awb || !shipment.courier) {
          results.push({
            shipmentId: shipment.id,
            success: false,
            message: 'Missing AWB or courier information',
          });
          skipped++;
          continue;
        }

        // Skip shipments in final states
        if (ShipmentBucketManager.isFinalStatus(shipment.status)) {
          results.push({
            shipmentId: shipment.id,
            success: false,
            message: `Shipment is in final status (${shipment.status}), skipping tracking`,
          });
          skipped++;
          continue;
        }

        // Get vendor name from courier channel config
        const vendorName = shipment.courier.channel_config.name;
        if (!vendorName) {
          results.push({
            shipmentId: shipment.id,
            success: false,
            message: 'Vendor name not found in courier configuration',
          });
          skipped++;
          continue;
        }

        // Track shipment
        const trackingResult = await this.trackShipment(vendorName, {
          awb: shipment.awb,
          shipment,
        });

        if (!trackingResult.success || !trackingResult.latestBucket) {
          results.push({
            shipmentId: shipment.id,
            success: false,
            message: trackingResult.message || 'Failed to track shipment',
          });
          failed++;
          continue;
        }

        // Get status from bucket
        const newStatus = ShipmentBucketManager.getStatusFromBucket(trackingResult.latestBucket) as ShipmentStatus;
        
        // If status has changed, update it
        if (newStatus && newStatus !== shipment.status) {
          // Update shipment status in database
          await this.fastify.prisma.shipment.update({
            where: { id: shipment.id },
            data: { 
              status: newStatus,
              updated_at: new Date()
            },
          });

          // Also update order status
          await this.fastify.prisma.order.update({
            where: { id: shipment.order.id },
            data: { 
              status: newStatus,
              updated_at: new Date()
            },
          });

          // Create tracking event
          if (trackingResult.trackingEvents && trackingResult.trackingEvents.length > 0) {
            const latestTrackingEvent = trackingResult.trackingEvents[0];
            if (latestTrackingEvent) {
              await this.fastify.prisma.trackingEvent.create({
                data: {
                  status: newStatus,
                  location: latestTrackingEvent.location || '',
                  description: latestTrackingEvent.description || latestTrackingEvent.status || '',
                  timestamp: latestTrackingEvent.timestamp || new Date(),
                  shipment_id: shipment.id,
                },
              });
            }
          }

          results.push({
            shipmentId: shipment.id,
            success: true,
            message: `Shipment status updated from ${shipment.status} to ${newStatus}`,
            newStatus,
            newBucket: trackingResult.latestBucket,
          });
          updated++;
        } else {
          results.push({
            shipmentId: shipment.id,
            success: true,
            message: 'No status change detected',
          });
          skipped++;
        }
      } catch (error) {
        console.error(`Error processing shipment ${shipment.id}:`, error);
        results.push({
          shipmentId: shipment.id,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
        failed++;
      }
    }

    return {
      processed: shipments.length,
      updated,
      skipped,
      failed,
      results,
    };
  }
}
