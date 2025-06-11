import { ShipmentStatus, ZoneLabel } from '@lorrigo/db';
import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import { CreateShipmentSchema, UpdateShipmentSchema, AddTrackingEventSchema, formatDateAddDays, generateId, getFinancialYearStartDate, getFinancialYear } from '@lorrigo/utils';
import { OrderService } from '@/modules/orders/services/order-service';
import { VendorService } from '@/modules/vendors/vendor.service';
import { calculatePricesForCouriers, calculateVolumetricWeight, getOrderZoneFromCourierZone, PincodeDetails, PriceCalculationParams } from '@/utils/calculate-order-price';
import { PriceCalculationResult } from '@/utils/calculate-order-price';
import { Queue } from 'bullmq';

// Define the interface for the extended FastifyInstance
interface ExtendedFastifyInstance extends FastifyInstance {
  bulkOperationQueue?: Queue;
  config?: {
    REDIS_HOST: string;
    REDIS_PORT: string;
    REDIS_PASSWORD: string;
  };
}

/**
 * Service for handling shipment-related business logic
 */
export class ShipmentService {

  private vendorService: VendorService;
  private fastify: ExtendedFastifyInstance;

  constructor(
    fastify: FastifyInstance,
    private orderService: OrderService
  ) {
    this.fastify = fastify as ExtendedFastifyInstance;
    this.vendorService = new VendorService(fastify);
    // this.fastify.redis.flushall().then(() => {
    //   console.log('Redis flushed');
    // }).catch((err) => {
    //   console.error('Error flushing Redis', err);
    // });
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
      return { rates: JSON.parse(cachedRates).formattedRates, order };
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
    await this.fastify.redis.set(key, JSON.stringify({ formattedRates, rates, order }), 'EX', 60 * 60 * 24);

    return { rates: formattedRates, order };
  }

  /**
   * Create a new shipment
   */
  async createShipment(data: z.infer<typeof CreateShipmentSchema> & { isBulkShipment?: boolean }, userId: string) {
    // Check if order exists and belongs to the user
    const order = await this.orderService.getOrderById(data.order_id, userId);

    if (!order) {
      return { error: 'Order not found' };
    }

    // Get rates from cache
    const cacheKey = `rates-${order?.is_reverse_order ? 'reversed' : 'forward'}-${order?.hub?.address?.pincode}-${order?.customer?.address?.pincode}-${order?.applicable_weight}-${order?.payment_mode}-${order.amount_to_collect}`;
    const cachedRatesString = await this.fastify.redis.get(cacheKey);

    if (!cachedRatesString) {
      return { error: 'Rate information not available. Please recalculate rates first.' };
    }

    const cachedRates = JSON.parse(cachedRatesString);

    const selectedCourier = cachedRates.formattedRates.find((rate: any) => (rate.id === data.courier_id));

    if (!selectedCourier) {
      return { error: 'Selected courier not found in available options' };
    }

    try {
      // Begin transaction
      return await this.fastify.prisma.$transaction(async (prisma) => {
        // Check wallet balance
        const userWallet = await prisma.wallet.findUnique({
          where: { user_id: userId }
        });

        if (!userWallet) {
          return { error: 'User wallet not found' };
        }

        const shippingCost = selectedCourier.total_price;

        // if (userWallet.balance < shippingCost) {
        //   return { error: 'Insufficient wallet balance' };
        // }

        // Generate temporary shipment code
        const [lastShipment, shipmentCount] = await Promise.all([
          this.fastify.prisma.shipment.findFirst({
            orderBy: {
              created_at: 'desc',
            },
          }),
          // this year shipment count
          this.fastify.prisma.shipment.count({
            where: { user_id: userId, created_at: { gte: getFinancialYearStartDate(new Date().getFullYear().toString()) } }
          })
        ])

        const shipmentCode = generateId({
          tableName: 'shipment',
          entityName: 'shipment',
          lastUsedFinancialYear: getFinancialYear(lastShipment?.created_at || new Date()),
          lastSequenceNumber: shipmentCount,
        }).id;

        // Fetch courier details - we need this for the vendor
        const courier = await prisma.courier.findUnique({
          where: { id: data.courier_id },
          include: { channel_config: true }
        });

        if (!courier || !courier.channel_config) {
          return { error: 'Selected courier not found or not properly configured' };
        }

        // Determine if this is a combined creation + scheduling request
        const isSchedulePickup = data.schedule_pickup === true;

        // Step 1: Create shipment on vendor's platform first to get the AWB
        const vendorResult = await this.vendorService.createShipmentOnVendor(
          courier.channel_config.name,
          {
            order,
            courier,
            hub: order.hub || {},
            awb: '', // Empty AWB as we'll get it from the vendor
            shipmentCode,
            isSchedulePickup,
            isBulkShipment: data.isBulkShipment
          }
        );

        if (!vendorResult.success || !vendorResult.awb) {
          return { error: `Failed to create shipment with vendor: ${vendorResult.message}` };
        }

        // Use the AWB from the vendor
        const awb = vendorResult.awb;

        // Step 2: Perform independent operations in parallel
        const [shipment, orderUpdate, walletUpdate, transactionRecord] = await Promise.all([
          // Create shipment record
          prisma.shipment.create({
            data: {
              code: shipmentCode,
              awb,
              status: isSchedulePickup ? ShipmentStatus.PICKUP_SCHEDULED : ShipmentStatus.COURIER_ASSIGNED,
              shipping_charge: selectedCourier.base_price,
              fw_charge: selectedCourier.weight_charges,
              cod_amount: order.payment_mode === 'COD' ? order.amount_to_collect : 0,
              rto_charge: selectedCourier.rto_charges,
              order_zone: getOrderZoneFromCourierZone(selectedCourier.zone),
              edd: selectedCourier.etd ? new Date(selectedCourier.etd) : null,
              pickup_id: `LS-${shipmentCode}`,
              pickup_date: isSchedulePickup ? vendorResult.pickup_date : null,
              order: {
                connect: { id: data.order_id }
              },
              user: {
                connect: { id: userId }
              },
              courier: {
                connect: { id: data.courier_id }
              }
            }
          }),

          // Update order status
          prisma.order.update({
            where: { id: data.order_id },
            data: { status: isSchedulePickup ? ShipmentStatus.PICKUP_SCHEDULED : ShipmentStatus.NEW }
          }),

          // Deduct amount from wallet
          prisma.wallet.update({
            where: { id: userWallet.id },
            data: { balance: { decrement: shippingCost } }
          }),

          // Record transaction
          prisma.transaction.create({
            data: {
              code: `TR-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
              amount: shippingCost,
              type: 'DEBIT',
              description: `Shipping charges for AWB: ${awb}`,
              status: 'COMPLETED',
              currency: 'INR',
              wallet_id: userWallet.id,
              user_id: userId
            }
          })
        ]);

        // Step 3: Create additional records that depend on the shipment ID
        // Get hub city from order if available
        const hubCity = order.hub?.address?.city || 'Unknown';

        await Promise.all([
          // Add first tracking event
          prisma.trackingEvent.create({
            data: {
              code: `TE-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
              status: isSchedulePickup ? ShipmentStatus.PICKUP_SCHEDULED : ShipmentStatus.NEW,
              location: hubCity,
              description: isSchedulePickup ? 'Shipment created and pickup scheduled' : 'Shipment created and ready for pickup',
              shipment_id: shipment.id
            }
          }),

          // Store shipment pricing
          prisma.shipmentPricing.create({
            data: {
              shipment_id: shipment.id,
              cod_charge_hard: selectedCourier.cod_charges > 0 ? 40 : 0,
              cod_charge_percent: selectedCourier.cod_charges > 0 ? 1.5 : 0,
              is_fw_applicable: true,
              is_rto_applicable: true,
              is_cod_applicable: order.payment_mode === 'COD',
              is_cod_reversal_applicable: order.payment_mode === 'COD',
              weight_slab: selectedCourier.weight_slab,
              increment_weight: 0.5,
              increment_price: selectedCourier.weight_charges / Math.max(1, Math.ceil((selectedCourier.final_weight - selectedCourier.weight_slab) / 0.5)),
              zone: selectedCourier.zone,
              base_price: selectedCourier.base_price,
              is_rto_same_as_fw: false,
              rto_base_price: selectedCourier.rto_charges,
              rto_increment_price: 0,
              flat_rto_charge: selectedCourier.rto_charges
            }
          })
        ]);

        // Log vendor data for reference but don't store it directly
        if (vendorResult.data) {
          console.info(`Vendor data for shipment ${shipment.id}:`, vendorResult.data);
        }

        return {
          success: true,
          shipment: {
            ...shipment,
            awb,
            courier: courier?.name || 'Unknown'
          }
        };
      }, {
        timeout: 10000,
        maxWait: 10000
      });
    } catch (error) {
      this.fastify.log.error(`Error creating shipment: ${error}`);
      return { error: 'Failed to create shipment' };
    }
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
   * Schedule pickup for a shipment
   */
  async schedulePickup(id: string, userId: string, pickupDate: string) {
    // Verify shipment exists and belongs to user
    const shipment = await this.fastify.prisma.shipment.findFirst({
      where: {
        id,
        user_id: userId,
        status: ShipmentStatus.NEW, // Only NEW shipments can be scheduled
      },
      include: {
        courier: {
          include: {
            channel_config: true,
          }
        },
        order: {
          include: {
            hub: {
              include: {
                address: true
              }
            }
          }
        }
      }
    });

    if (!shipment || !shipment.courier) {
      return { error: 'Shipment not found or not in a valid state for pickup scheduling' };
    }

    try {
      // Parse and validate pickup date
      const pickupDateTime = new Date(pickupDate);
      const today = new Date();

      if (isNaN(pickupDateTime.getTime()) || pickupDateTime < today) {
        return { error: 'Invalid pickup date. Must be a future date.' };
      }

      // Schedule pickup with vendor
      const channelName = shipment.courier.channel_config.name;

      // Ensure we have a valid AWB before proceeding
      const awbToUse = shipment.awb || '';

      if (!awbToUse) {
        return { error: 'Missing AWB number for shipment' };
      }

      const pickupResult = await this.vendorService.schedulePickup(
        channelName,
        {
          awb: awbToUse,
          pickupDate: pickupDateTime.toISOString().split('T')[0] as string, // Force as string
          hub: shipment.order.hub,
          shipment
        }
      );

      if (!pickupResult.success) {
        return { error: pickupResult.message || 'Failed to schedule pickup with vendor' };
      }

      // Get hub city safely
      const hubCity = shipment.order.hub?.address?.city || 'Unknown';

      // Update shipment status
      await this.fastify.prisma.shipment.update({
        where: { id },
        data: {
          status: ShipmentStatus.PICKUP_SCHEDULED,
          pickup_date: pickupDateTime
        }
      });

      // Add tracking event
      await this.fastify.prisma.trackingEvent.create({
        data: {
          code: `TE-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          status: ShipmentStatus.PICKUP_SCHEDULED,
          location: hubCity,
          description: 'Pickup scheduled with courier',
          shipment_id: id
        }
      });

      return {
        success: true,
        message: 'Pickup scheduled successfully',
        pickupDate: pickupDateTime
      };
    } catch (error) {
      this.fastify.log.error(`Error scheduling pickup: ${error}`);
      return { error: 'Failed to schedule pickup' };
    }
  }

  /**
   * Cancel a shipment and process refund
   */
  async cancelShipment(id: string, userId: string, reason: string = 'Cancelled by seller') {
    // Verify shipment exists and belongs to user
    const shipment = await this.fastify.prisma.shipment.findFirst({
      where: {
        id,
        user_id: userId,
        status: {
          notIn: [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED, ShipmentStatus.CANCELLED]
        }
      },
      include: {
        courier: {
          include: {
            channel_config: true,
          }
        },
        order: true,
        pricing: true
      }
    });

    if (!shipment) {
      return { error: 'Shipment not found or cannot be cancelled' };
    }

    try {
      return await this.fastify.prisma.$transaction(async (prisma) => {
        if (!shipment.courier) {
          return { error: 'Shipment not found or cannot be cancelled' };
        }
        // Cancel shipment with vendor if needed
        if (shipment.status !== ShipmentStatus.NEW) {
          const channelName = shipment.courier.channel_config.name;

          // Ensure we have a valid AWB to pass to vendor
          const awbToUse = shipment.awb || '';

          const cancelResult = await this.vendorService.cancelShipment(
            channelName,
            {
              awb: awbToUse,
              shipment
            }
          );

          if (!cancelResult.success) {
            return { error: cancelResult.message || 'Failed to cancel shipment with vendor' };
          }
        }

        // Determine refund amount based on shipment status
        let refundAmount = 0;
        let refundDescription = '';

        if (!shipment.shipping_charge || !shipment.fw_charge || !shipment.cod_amount) {
          return { error: 'Shipment not found or cannot be cancelled' };
        }

        if (shipment.status === ShipmentStatus.NEW || shipment.status === ShipmentStatus.PICKUP_SCHEDULED) {
          // Full refund for shipments that haven't been picked up
          refundAmount = shipment.shipping_charge + shipment.fw_charge +
            (shipment.order.payment_mode === 'COD' ? shipment.cod_amount || 0 : 0);
          refundDescription = `Full refund for cancelled shipment: ${shipment.awb || 'No AWB'}`;
        } else if (shipment.status === ShipmentStatus.PICKED_UP ||
          shipment.status === ShipmentStatus.IN_TRANSIT) {
          // Partial refund for in-transit shipments (no COD refund)
          refundAmount = shipment.fw_charge * 0.5; // 50% of forward charge
          refundDescription = `Partial refund for cancelled in-transit shipment: ${shipment.awb || 'No AWB'}`;
        }

        if (refundAmount > 0) {
          // Find user wallet
          const userWallet = await prisma.wallet.findUnique({
            where: { user_id: userId }
          });

          if (userWallet) {
            // Credit refund amount to wallet
            await prisma.wallet.update({
              where: { id: userWallet.id },
              data: { balance: { increment: refundAmount } }
            });

            // Record transaction
            await prisma.transaction.create({
              data: {
                code: `TR-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
                amount: refundAmount,
                type: 'CREDIT',
                description: refundDescription,
                status: 'COMPLETED',
                currency: 'INR',
                wallet_id: userWallet.id,
                user_id: userId
              }
            });
          }
        }

        // Update shipment status
        await prisma.shipment.update({
          where: { id },
          data: { status: ShipmentStatus.CANCELLED }
        });

        // Add tracking event
        await prisma.trackingEvent.create({
          data: {
            code: `TE-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
            status: ShipmentStatus.CANCELLED,
            location: 'System',
            description: reason || 'Shipment cancelled by seller',
            shipment_id: id
          }
        });

        // Update order status if needed
        await prisma.order.update({
          where: { id: shipment.order_id },
          data: { status: ShipmentStatus.CANCELLED }
        });

        return {
          success: true,
          message: 'Shipment cancelled successfully',
          refundAmount: refundAmount > 0 ? refundAmount : undefined
        };
      });
    } catch (error) {
      this.fastify.log.error(`Error cancelling shipment: ${error}`);
      return { error: 'Failed to cancel shipment' };
    }
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

  /**
   * Create multiple shipments in bulk
   */
  async createShipmentBulk(
    data: Array<z.infer<typeof CreateShipmentSchema>>,
    userId: string,
    filters?: { status?: string; dateRange?: [Date, Date] }
  ) {
    try {
      // Generate operation code
      const operationCode = `BO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // If filters are provided, fetch matching orders
      let orderIds: string[] = [];
      if (filters) {
        const where: any = { user_id: userId };

        if (filters.status) {
          where.status = filters.status;
        }

        if (filters.dateRange && filters.dateRange.length === 2) {
          where.created_at = {
            gte: filters.dateRange[0],
            lte: filters.dateRange[1]
          };
        }

        const orders = await this.fastify.prisma.order.findMany({
          where,
          select: { id: true }
        });

        orderIds = orders.map(order => order.id);

        // Apply order IDs to the data if not provided
        if (orderIds.length > 0 && (!data || data.length === 0)) {
          // Get available couriers for each order
          const orderCouriers = await Promise.all(
            orderIds.map(async (orderId) => {
              const rates = await this.getShipmentRates(orderId, userId);
              return {
                orderId,
                couriers: rates.rates || []
              };
            })
          );

          // Create data entries for each order with its best courier
          data = orderCouriers
            .filter(oc => oc.couriers && oc.couriers.length > 0)
            .map(oc => ({
              order_id: oc.orderId,
              courier_id: oc.couriers[0].id, // Use the first (cheapest) courier
              schedule_pickup: true, // Always schedule pickup for bulk operations
              pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow
            }));
        } else if (data && data.length > 0) {
          // If data is provided, ensure schedule_pickup is set for all items
          data = data.map(item => ({
            ...item,
            schedule_pickup: item.schedule_pickup !== false, // Default to true if not explicitly false
          }));
        }
      }

      // Create bulk operation record
      const bulkOperation = await this.fastify.prisma.bulkOperation.create({
        data: {
          code: operationCode,
          type: 'CREATE_SHIPMENT',
          status: 'PENDING',
          total_count: data.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0
        }
      });

      // Queue the bulk operation if queue is available
      if (this.fastify.bulkOperationQueue) {
        await this.fastify.bulkOperationQueue.add(
          'bulk-create-shipment',
          {
            type: 'BULK_CREATE_SHIPMENT',
            data,
            userId,
            operationId: bulkOperation.id,
            isBulkShipment: true // Mark as bulk shipment for vendor API
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            }
          }
        );

        return {
          success: true,
          message: 'Bulk shipment creation operation started',
          operation: {
            id: bulkOperation.id,
            code: bulkOperation.code,
            status: bulkOperation.status,
            total: bulkOperation.total_count
          }
        };
      }

      // Fallback if queue is not available (for testing or development)
      this.fastify.log.warn('BulkOperationQueue not available, processing synchronously');

      let successCount = 0;
      let failedCount = 0;
      const results = [];

      for (const item of data) {
        try {
          // Add isBulkShipment flag for vendor API
          const shipmentData = {
            ...item,
            isBulkShipment: true
          };

          const result = await this.createShipment(shipmentData, userId);
          if (result.error) {
            failedCount++;
            results.push({
              id: item.order_id,
              success: false,
              message: result.error
            });
          } else {
            successCount++;
            results.push({
              id: item.order_id,
              success: true,
              message: 'Shipment created successfully'
            });
          }
        } catch (error) {
          failedCount++;
          results.push({
            id: item.order_id,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      await this.fastify.prisma.bulkOperation.update({
        where: { id: bulkOperation.id },
        data: {
          status: 'COMPLETED',
          processed_count: data.length,
          success_count: successCount,
          failed_count: failedCount
        }
      });

      return {
        success: true,
        message: 'Bulk shipment creation operation completed',
        operation: {
          id: bulkOperation.id,
          code: bulkOperation.code,
          status: 'COMPLETED',
          total: bulkOperation.total_count,
          processed: data.length,
          successful: successCount,
          failed: failedCount,
          results
        }
      };
    } catch (error) {
      this.fastify.log.error(`Error creating bulk shipments: ${error}`);
      return { error: 'Failed to start bulk shipment creation' };
    }
  }

  /**
   * Schedule pickups for multiple shipments in bulk
   * @param data Array of pickup scheduling data
   * @param userId User ID
   * @returns Promise resolving to bulk operation details
   */
  async schedulePickupBulk(
    data: Array<{ shipment_id: string; pickup_date: string }>,
    userId: string,
    filters?: { status?: ShipmentStatus; dateRange?: [Date, Date] }
  ) {
    try {
      // Generate operation code
      const operationCode = `BO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // If filters are provided, fetch matching shipments
      if (filters && (!data || data.length === 0)) {
        const where: any = {
          user_id: userId,
          status: ShipmentStatus.NEW // Only NEW shipments can be scheduled
        };

        if (filters.dateRange && filters.dateRange.length === 2) {
          where.created_at = {
            gte: filters.dateRange[0],
            lte: filters.dateRange[1]
          };
        }

        const shipments = await this.fastify.prisma.shipment.findMany({
          where,
          select: { id: true }
        });

        // Set pickup date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const pickupDate = tomorrow.toISOString().split('T')[0];

        // Create data entries for each shipment
        data = shipments.map(shipment => ({
          shipment_id: shipment.id,
          pickup_date: pickupDate
        })) as Array<{ shipment_id: string; pickup_date: string }>;
      }

      // Create bulk operation record
      const bulkOperation = await this.fastify.prisma.bulkOperation.create({
        data: {
          code: operationCode,
          type: 'SCHEDULE_PICKUP',
          status: 'PENDING',
          total_count: data.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0
        }
      });

      // Queue the bulk operation
      if (this.fastify.bulkOperationQueue) {
        await this.fastify.bulkOperationQueue.add(
          'bulk-schedule-pickup',
          {
            type: 'BULK_SCHEDULE_PICKUP',
            data,
            userId,
            operationId: bulkOperation.id
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            }
          }
        );
      } else {
        // Fallback if queue is not available
        this.fastify.log.warn('BulkOperationQueue not available, processing synchronously');

        let successCount = 0;
        let failedCount = 0;
        const results = [];

        for (const item of data) {
          try {
            const result = await this.schedulePickup(item.shipment_id, userId, item.pickup_date);
            if (result.error) {
              failedCount++;
              results.push({
                id: item.shipment_id,
                success: false,
                message: result.error
              });
            } else {
              successCount++;
              results.push({
                id: item.shipment_id,
                success: true,
                message: 'Pickup scheduled successfully'
              });
            }
          } catch (error) {
            failedCount++;
            results.push({
              id: item.shipment_id,
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        await this.fastify.prisma.bulkOperation.update({
          where: { id: bulkOperation.id },
          data: {
            status: 'COMPLETED',
            processed_count: data.length,
            success_count: successCount,
            failed_count: failedCount
          }
        });
      }

      return {
        success: true,
        message: 'Bulk pickup scheduling operation started',
        operation: {
          id: bulkOperation.id,
          code: bulkOperation.code,
          status: bulkOperation.status,
          total: bulkOperation.total_count
        }
      };
    } catch (error) {
      this.fastify.log.error(`Error scheduling bulk pickups: ${error}`);
      return { error: 'Failed to start bulk pickup scheduling' };
    }
  }

  /**
   * Cancel multiple shipments in bulk
   * @param data Array of shipment cancellation data
   * @param userId User ID
   * @returns Promise resolving to bulk operation details
   */
  async cancelShipmentBulk(
    data: Array<{ shipment_id: string; reason?: string }>,
    userId: string,
    filters?: { status?: ShipmentStatus; dateRange?: [Date, Date] }
  ) {
    try {
      // Generate operation code
      const operationCode = `BO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // If filters are provided, fetch matching shipments
      if (filters && (!data || data.length === 0)) {
        const where: any = {
          user_id: userId,
          status: {
            notIn: [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED, ShipmentStatus.CANCELLED]
          }
        };

        if (filters.status) {
          where.status = filters.status;
        }

        if (filters.dateRange && filters.dateRange.length === 2) {
          where.created_at = {
            gte: filters.dateRange[0],
            lte: filters.dateRange[1]
          };
        }

        const shipments = await this.fastify.prisma.shipment.findMany({
          where,
          select: { id: true }
        });

        // Create data entries for each shipment
        data = shipments.map(shipment => ({
          shipment_id: shipment.id,
          reason: 'Cancelled by seller in bulk operation'
        }));
      }

      // Create bulk operation record
      const bulkOperation = await this.fastify.prisma.bulkOperation.create({
        data: {
          code: operationCode,
          type: 'CANCEL_SHIPMENT',
          status: 'PENDING',
          total_count: data.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0
        }
      });

      // Queue the bulk operation
      if (this.fastify.bulkOperationQueue) {
        await this.fastify.bulkOperationQueue.add(
          'bulk-cancel-shipment',
          {
            type: 'BULK_CANCEL_SHIPMENT',
            data,
            userId,
            operationId: bulkOperation.id
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            }
          }
        );
      } else {
        // Fallback if queue is not available
        this.fastify.log.warn('BulkOperationQueue not available, processing synchronously');

        let successCount = 0;
        let failedCount = 0;
        const results = [];

        for (const item of data) {
          try {
            const result = await this.cancelShipment(item.shipment_id, userId, item.reason);
            if (result.error) {
              failedCount++;
              results.push({
                id: item.shipment_id,
                success: false,
                message: result.error
              });
            } else {
              successCount++;
              results.push({
                id: item.shipment_id,
                success: true,
                message: 'Shipment cancelled successfully'
              });
            }
          } catch (error) {
            failedCount++;
            results.push({
              id: item.shipment_id,
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        await this.fastify.prisma.bulkOperation.update({
          where: { id: bulkOperation.id },
          data: {
            status: 'COMPLETED',
            processed_count: data.length,
            success_count: successCount,
            failed_count: failedCount
          }
        });
      }

      return {
        success: true,
        message: 'Bulk shipment cancellation operation started',
        operation: {
          id: bulkOperation.id,
          code: bulkOperation.code,
          status: bulkOperation.status,
          total: bulkOperation.total_count
        }
      };
    } catch (error) {
      this.fastify.log.error(`Error cancelling bulk shipments: ${error}`);
      return { error: 'Failed to start bulk shipment cancellation' };
    }
  }

  /**
   * Get bulk operation status and results
   * @param operationId Bulk operation ID
   * @param userId User ID
   * @returns Promise resolving to operation status and results
   */
  async getBulkOperationStatus(operationId: string, userId: string) {
    try {
      const operation = await this.fastify.prisma.bulkOperation.findUnique({
        where: { id: operationId }
      });

      if (!operation) {
        return { error: 'Bulk operation not found' };
      }

      // Get job from queue to check progress
      let progress = 0;
      let results = [];

      if (this.fastify.bulkOperationQueue) {
        const job = await this.fastify.bulkOperationQueue.getJob(operationId);
        if (job) {
          progress = await job.progress() || 0;

          // If job is completed, get the results
          if (await job.isCompleted()) {
            const jobResult = await job.returnValue();
            results = jobResult.results || [];
          }
        }
      }

      return {
        success: true,
        operation: {
          id: operation.id,
          code: operation.code,
          type: operation.type,
          status: operation.status,
          total: operation.total_count,
          processed: operation.processed_count,
          successful: operation.success_count,
          failed: operation.failed_count,
          progress: progress,
          results: results.length > 0 ? results : undefined,
          created_at: operation.created_at,
          updated_at: operation.updated_at
        }
      };
    } catch (error) {
      this.fastify.log.error(`Error getting bulk operation status: ${error}`);
      return { error: 'Failed to get bulk operation status' };
    }
  }
}
