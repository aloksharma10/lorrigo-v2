import { ShipmentStatus } from '@lorrigo/db';
import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import { CreateShipmentSchema, UpdateShipmentSchema, AddTrackingEventSchema, formatDateAddDays } from '@lorrigo/utils';
import { OrderService } from '@/modules/orders/services/order-service';
import { VendorService } from '@/modules/vendors/vendor.service';
import { calculatePricesForCouriers, calculateVolumetricWeight, PincodeDetails, PriceCalculationParams } from '@/utils/calculate-order-price';
import { PriceCalculationResult } from '@/utils/calculate-order-price';

/**
 * Service for handling shipment-related business logic
 */
export class ShipmentService {

  private vendorService: VendorService;

  constructor(
    private fastify: FastifyInstance,
    private orderService: OrderService
  ) {
    this.vendorService = new VendorService(fastify);
  }

  /**
   * Generate a unique tracking number
   */
  private generateTrackingNumber(): string {
    const prefix = 'LOR';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Calculate shipping rates for an order
   * @param id Order ID
   * @param userId User ID
   * @returns Promise resolving to shipping rates and order details
   */
  async getShipmentRates(id: string, userId: string) {
    // Fetch order details
    const order = await this.orderService.getOrderById(id, userId);
    if (!order) {
      return { error: 'Order not found' };
    }

    // Build cache key
    const key = `rates-${order?.is_reverse_order ? 'reversed' : 'forward'}-${order?.hub?.address?.pincode}-${order?.customer?.address?.pincode}-${order?.applicable_weight}-${order?.payment_mode}-${order.amount_to_collect}`;

    // Try to get rates from cache
    const cachedRates = await this.fastify.redis.get(key);
    if (cachedRates) {
      return { rates: JSON.parse(cachedRates), order };
    }

    // Prepare parameters for price calculation
    const params: PriceCalculationParams = {
      weight: order?.package?.dead_weight || 0,
      weightUnit: 'kg',
      boxLength: order?.package?.length || 0,
      boxWidth: order?.package?.breadth || 0,
      boxHeight: order?.package?.height || 0,
      sizeUnit: 'cm',
      paymentType: order?.payment_mode === 'COD' ? 1 : 0,
      collectableAmount: order?.amount_to_collect || 0,
      pickupPincode: order?.hub?.address?.pincode || '',
      deliveryPincode: order?.customer?.address?.pincode || '',
      isReversedOrder: !!order?.is_reverse_order
    };

    // Prepare pincode details
    const pickupDetails: PincodeDetails = {
      city: order?.hub?.address?.city || '',
      state: order?.hub?.address?.state || ''
    };

    const deliveryDetails: PincodeDetails = {
      city: order?.customer?.address?.city || '',
      state: order?.customer?.address?.state || ''
    };

    // Check serviceability for the user's plan
    const serviceabilityResult = await this.vendorService.checkServiceabilityForPlan(
      userId,
      params.pickupPincode,
      params.deliveryPincode,
      calculateVolumetricWeight(
        params.boxLength,
        params.boxWidth,
        params.boxHeight,
        params.sizeUnit as 'cm' | 'inch'
      ),
      {
        length: params.boxLength,
        width: params.boxWidth,
        height: params.boxHeight,
        weight: params.weight
      },
      params.paymentType,
      params.collectableAmount,
      order?.is_reverse_order
    );

    let rates: PriceCalculationResult[] = [];

    // If no serviceability, return empty rates with message
    if (!serviceabilityResult.success || serviceabilityResult.serviceableCouriers.length === 0) {
      // Cache empty rates
      await this.fastify.redis.set(key, JSON.stringify([]), 'EX', 60 * 60 * 24);
      return {
        rates: [],
        order,
        message: 'No courier is serviceable for this order'
      };
    }
    // Calculate rates for serviceable couriers using utility function
    rates = calculatePricesForCouriers(
      params,
      serviceabilityResult.serviceableCouriers.map(courier => ({
        courier: {
          estimated_delivery_days: courier.data.estimated_delivery_days ?? 5,
          etd: courier.data.etd || formatDateAddDays(5),
          rating: courier.data.rating,
          pickup_performance: courier.data.pickup_performance,
          rto_performance: courier.data.rto_performance,
          delivery_performance: courier.data.delivery_performance,
          id: courier.id,
          name: courier.name,
          courier_code: courier.code,
          type: courier.pricing.courier.type || '', // Ensure type is always string
          is_active: true,
          is_reversed_courier: !!order?.is_reverse_order,
          pickup_time: undefined,
          weight_slab: courier.pricing?.weight_slab || 0.5,
          nickname: courier.pricing?.courier.channel_config.nickname || ''
        },
        pricing: {
          weight_slab: courier.pricing?.weight_slab || 0.5,
          increment_weight: courier.pricing?.increment_weight || 0.5,
          cod_charge_hard: courier.pricing?.cod_charge_hard || 0,
          cod_charge_percent: courier.pricing?.cod_charge_percent || 0,
          is_cod_applicable: true,
          is_rto_applicable: true,
          is_fw_applicable: true,
          zone_pricing: courier.pricing?.zone_pricing || []
        }
      })),
      pickupDetails,
      deliveryDetails
    );

    const formattedRates = rates.map(rate => ({
      // Core courier identification
      id: rate.courier.id,
      name: rate.courier.name,
      nickname: rate.courier.nickname,
      courier_code: rate.courier.courier_code,
      type: rate.courier.type,
      is_active: rate.courier.is_active,
      is_reversed_courier: rate.courier.is_reversed_courier,

      // Delivery and pickup details
      estimated_delivery_days: rate.courier.estimated_delivery_days,
      etd: rate.courier.etd,
      pickup_time: rate.courier.pickup_time,
      expected_pickup: rate.expected_pickup,

      // Performance metrics
      rating: rate.courier.rating,
      pickup_performance: rate.courier.pickup_performance,
      delivery_performance: rate.courier.delivery_performance,
      rto_performance: rate.courier.rto_performance,

      // Weight and zone details
      zone: rate.zoneName,
      weight_slab: rate.courier.weight_slab,
      final_weight: rate.final_weight,
      volumetric_weight: rate.volumetric_weight,

      // Pricing breakdown
      base_price: rate.base_price,
      weight_charges: rate.weight_charges,
      cod_charges: rate.cod_charges,
      rto_charges: rate.rto_charges,
      total_price: rate.total_price,

      // Additional details
      breakdown: rate.breakdown
    }));

    // Sort rates by total price
    rates.sort((a, b) => a.total_price - b.total_price);

    // Cache the rates
    await this.fastify.redis.set(key, JSON.stringify({formattedRates, rates, order}), 'EX', 60 * 60 * 24);

    return { rates: formattedRates, order };
  }
  /**
   * Create a new shipment
   */
  async createShipment(data: z.infer<typeof CreateShipmentSchema>, userId: string) {
    // Check if order exists and belongs to the user
   const order = await this.orderService.getOrderById(data.order_id, userId)

    if (!order) {
      return { error: 'Order not found' };
    }

    const cacheKey = `rates-${order?.is_reverse_order ? 'reversed' : 'forward'}-${order?.hub?.address?.pincode}-${order?.customer?.address?.pincode}-${order?.applicable_weight}-${order?.payment_mode}`;

    const cachedRates = await this.fastify.redis.get(cacheKey);
    console.log(cachedRates, "cachedRates")
    // if (cachedRates) {
    //   return { rates: JSON.parse(cachedRates), order };
    // }


    // Create shipment with tracking number
    // const shipment = await this.fastify.prisma.shipment.create({
    //   data: {
    //     code: `SHP-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
    //     awb: this.generateTrackingNumber(),
    //     status: ShipmentStatus.NEW,
    //     order: {
    //       connect: {
    //         id: data.orderId,
    //       },
    //     },
    //     user: {
    //       connect: {
    //         id: userId,
    //       },
    //     },
    //     courier: {
    //       connect: {
    //         id: data.courierId,
    //       },
    //     },
    //     tracking_events: {
    //       create: {
    //         code: `ST-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
    //         status: ShipmentStatus.NEW,
    //         location: '',
    //         description: 'Shipment created and ready for pickup',
    //       },
    //     },
    //   },
    //   include: {
    //     order: true,
    //     courier: true,
    //     tracking_events: true,
    //   },
    // });

    // Update order status if it's still in CREATED status
    // if (order.status === 'CREATED') {
    //   await prisma.order.update({
    //     where: { id: data.orderId },
    //     data: { status: 'PROCESSING' },
    //   });
    // }

    return { rates: JSON.parse(cachedRates || '[]'), order };
  }

  /**
   * Get all shipments for a user
   */
  async getAllShipments(userId: string) {
    return this.fastify.prisma.shipment.findMany({
      where: {
        user_id: userId,
      },
      include: {
        order: {
          select: {
            order_number: true,
            status: true,
            customer: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        courier: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Get shipment by ID
   */
  async getShipmentById(id: string, userId: string) {
    return this.fastify.prisma.shipment.findFirst({
      where: {
        id,
        user_id: userId,
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        courier: true,
        tracking_events: {
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });
  }

  /**
   * Update a shipment
   */
  async updateShipment(
    id: string,
    userId: string,
    updateData: z.infer<typeof UpdateShipmentSchema>
  ) {
    // Verify shipment exists and belongs to user
    const existingShipment = await this.fastify.prisma.shipment.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!existingShipment) {
      return { error: 'Shipment not found' };
    }

    // Update the shipment
    const updatedShipment = await this.fastify.prisma.shipment.update({
      where: { id },
      data: updateData,
      include: {
        order: true,
        tracking_events: true,
      },
    });

    // If status was updated, add a tracking event
    if (updateData.status && updateData.status !== existingShipment.status) {
      await this.fastify.prisma.trackingEvent.create({
        data: {
          code: `ST-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          shipment_id: id,
          status: updateData.status as ShipmentStatus,
          location: 'System Update',
          description: `Shipment status updated to ${updateData.status}`,
        },
      });

      // Update order status based on shipment status
      if (updateData.status === 'DELIVERED') {
        await this.fastify.prisma.order.update({
          where: { id: existingShipment.order_id },
          data: { status: 'DELIVERED' },
        });
      } else if (updateData.status === 'IN_TRANSIT') {
        await this.fastify.prisma.order.update({
          where: { id: existingShipment.order_id },
          data: { status: ShipmentStatus.IN_TRANSIT },
        });
      }
    }

    return { shipment: updatedShipment };
  }

  /**
   * Add a tracking event to a shipment
   */
  async addTrackingEvent(
    id: string,
    user_id: string,
    eventData: z.infer<typeof AddTrackingEventSchema>
  ) {
    // Verify shipment exists and belongs to user
    const shipment = await this.fastify.prisma.shipment.findFirst({
      where: {
        id,
        user_id: user_id,
      },
    });

    if (!shipment) {
      return { error: 'Shipment not found' };
    }

    // Create the tracking event
    const tracking_event = await this.fastify.prisma.trackingEvent.create({
      data: {
        code: `ST-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        shipment_id: id,
        status: eventData.status as ShipmentStatus,
        location: eventData.location,
        description: eventData.description,
      },
    });

    // Update shipment status
    await this.fastify.prisma.shipment.update({
      where: { id },
      data: { status: eventData.status as ShipmentStatus },
    });

    // Update order status based on tracking event
    if (eventData.status === 'DELIVERED') {
      await this.fastify.prisma.order.update({
        where: { id: shipment.order_id },
        data: { status: 'DELIVERED' },
      });
    } else if (eventData.status === 'IN_TRANSIT') {
      await this.fastify.prisma.order.update({
        where: { id: shipment.order_id },
        data: { status: ShipmentStatus.IN_TRANSIT },
      });
    }

    return { tracking_event };
  }

  /**
   * Get tracking events for a shipment
   */
  async getTrackingEvents(id: string, user_id: string) {
    // Verify shipment exists and belongs to user
    const shipment = await this.fastify.prisma.shipment.findFirst({
      where: {
        id,
        user_id: user_id,
      },
    });

    if (!shipment) {
      return { error: 'Shipment not found' };
    }

    // Get tracking events
    const tracking_events = await this.fastify.prisma.trackingEvent.findMany({
      where: {
        shipment_id: id,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return { tracking_events };
  }

  /**
   * Cancel a shipment
   */
  async cancelShipment(id: string, user_id: string) {
    // Verify shipment exists and belongs to user
    const shipment = await this.fastify.prisma.shipment.findFirst({
      where: {
        id,
        user_id: user_id,
      },
      include: {
        order: true,
      },
    });

    if (!shipment) {
      return { error: 'Shipment not found' };
    }

    // Check if shipment can be cancelled (not already delivered or returned)
    if (shipment.status === 'DELIVERED' || shipment.status === 'RETURNED') {
      return {
        error: `Shipment cannot be cancelled because it is already ${shipment.status.toLowerCase()}`,
      };
    }

    // Update shipment status to EXCEPTION
    const updated_shipment = await this.fastify.prisma.shipment.update({
      where: { id },
      data: { status: 'EXCEPTION' },
    });

    // Add tracking event for cancellation
    await this.fastify.prisma.trackingEvent.create({
      data: {
        code: `ST-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        shipment_id: id,
        status: ShipmentStatus.EXCEPTION,
        location: 'System',
        description: 'Shipment cancelled by seller',
      },
    });

    // If this was the only shipment for the order, update order status
    const otherShipments = await this.fastify.prisma.shipment.findMany({
      where: {
        order_id: shipment.order_id,
        id: { not: id },
        status: { notIn: ['EXCEPTION', 'CANCELLED'] },
      },
    });

    if (otherShipments.length === 0) {
      await this.fastify.prisma.order.update({
        where: { id: shipment.order_id },
        data: { status: 'CANCELLED' },
      });
    }

    return { shipment: updated_shipment };
  }

  /**
   * Get shipment statistics
   */
  async getShipmentStats(user_id: string) {
    // Get count of shipments by status
    const status_counts = await this.fastify.prisma.shipment.groupBy({
      by: ['status'],
      where: {
        user_id: user_id,
      },
      _count: {
        id: true,
      },
    });

    // Get count of recent shipments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recent_shipments = await this.fastify.prisma.shipment.count({
      where: {
        user_id: user_id,
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Format the response
    const stats_by_status = Object.fromEntries(
      status_counts.map((item) => [item.status, item._count.id || 0])
    );

    return {
      total: Object.values(stats_by_status).reduce((a, b) => a + b, 0),
      by_status: stats_by_status,
      recent_shipments,
    };
  }
}
