import { APP_CONFIG } from '@/config/app';
import { BaseVendor } from './base-vendor';
import { ShiprocketVendor } from './shiprocket.vendor';
import { DelhiveryVendorFactory } from './delhivery.vendor';
import { SmartShipVendor } from './smart-ship.vendor';
import { VendorServiceabilityResult } from '@/types/vendor';
import { FastifyInstance } from 'fastify';
import { Courier, Hub, Order } from '@lorrigo/db';

/**
 * Service for managing vendor operations
 * Handles vendor selection and delegation to specific vendor implementations
 */
export class VendorService {
  private vendors: Map<string, BaseVendor>;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.vendors = new Map();
    this.initializeVendors();
  }

  /**
   * Initialize vendor instances
   */
  private initializeVendors(): void {
    // Initialize Shiprocket
    this.vendors.set('SHIPROCKET', new ShiprocketVendor());

    // Initialize Delhivery with different weight categories
    const delhiveryVendors = DelhiveryVendorFactory.getAllVendors();
    delhiveryVendors.forEach((vendor) => {
      this.vendors.set(`DELHIVERY_${vendor.getName().split('-')[1]}`, vendor);
    });

    // Initialize SmartShip
    this.vendors.set('SMARTSHIP', new SmartShipVendor());
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
      // Get user's plan and associated couriers
      const user = await this.fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          plan: {
            include: {
              plan_courier_pricings: {
                include: {
                  courier: {
                    include: {
                      channel_config: true,
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
        return {
          success: false,
          message: 'User has no assigned plan',
          serviceableCouriers: [],
        };
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
            const result = await vendor.checkServiceability(
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
            // Match serviceability results with courier pricing
            return {
              vendorName,
              result: {
                ...result,
                serviceableCouriers: result.serviceableCouriers.map((sc) => {
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

      return {
        success: allServiceableCouriers.length > 0,
        message:
          allServiceableCouriers.length > 0
            ? 'Serviceable couriers found'
            : 'No serviceable couriers found for the plan',
        serviceableCouriers: allServiceableCouriers,
      };
    } catch (error) {
      console.error('Error checking serviceability for plan:', error);
      return {
        success: false,
        message: 'Failed to check serviceability for plan',
        serviceableCouriers: [],
      };
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
      isBulkShipment?: boolean;
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
      const { order, courier, hub, awb, isSchedulePickup, isBulkShipment } = shipmentData;

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
        isBulkShipment,
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
}
