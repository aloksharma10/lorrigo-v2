import { ShipmentStatus, TransactionStatus } from '@lorrigo/db';
import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import {
  CreateShipmentSchema,
  formatDateAddDays,
  generateId,
  getFinancialYearStartDate,
  getFinancialYear,
  compareDates,
} from '@lorrigo/utils';
import { OrderService } from '@/modules/orders/services/order-service';
import { VendorService } from '@/modules/vendors/vendor.service';
import {
  calculatePricesForCouriers,
  calculateVolumetricWeight,
  getOrderZoneFromCourierZone,
  PincodeDetails,
  PriceCalculationParams,
} from '@/utils/calculate-order-price';
import { PriceCalculationResult } from '@/utils/calculate-order-price';
import { Queue } from 'bullmq';
import { normalizeCourierRate } from '@/utils/normalize';
import { addJob, QueueNames } from '@/lib/queue';
import { queues } from '@/lib/queue';
import { format } from 'date-fns';
import { TransactionService, TransactionType, TransactionEntityType } from '@/modules/transactions/services/transaction-service';
import { JobType } from '../queues/shipmentQueue';

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
  private transactionService: TransactionService;

  constructor(
    fastify: FastifyInstance,
    private orderService: OrderService
  ) {
    this.fastify = fastify as ExtendedFastifyInstance;
    this.vendorService = new VendorService(fastify);
    this.transactionService = new TransactionService(fastify);

    // this.fastify.redis.flushall().then(() => {
    //   this.fastify.log.info('Redis flushed successfully');
    // }).catch((error) => {
    //   this.fastify.log.error('Failed to flush Redis:', error);
    // });
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

    if (order.status === ShipmentStatus.CANCELLED_ORDER) {
      return { rates: [], order, message: 'Order is cancelled' };
    }

    if (order.status === ShipmentStatus.COURIER_ASSIGNED) {
      return { rates: [], order, message: 'Order already has a courier assigned' };
    }

    // Build comprehensive cache key including all rate-affecting parameters
    const dimensionsStr = `${order?.package?.length || 0}x${order?.package?.breadth || 0}x${order?.package?.height || 0}x${order?.package?.dead_weight || 0}`;
    const ratesKey = `rates-${userId}-${order?.is_reverse_order ? 'reverse' : 'forward'}-${order?.hub?.address?.pincode}-${order?.customer?.address?.pincode}-${order?.applicable_weight}-${dimensionsStr}-${order?.payment_mode}-${order.amount_to_collect}`;

    // Try to get rates from cache first
    const cachedRates = await this.fastify.redis.get(ratesKey);
    if (cachedRates) {
      const parsedCache = JSON.parse(cachedRates);
      return {
        rates: parsedCache.formattedRates || parsedCache.rates || [],
        order,
        cached: true
      };
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
      isReversedOrder: !!order?.is_reverse_order,
    };

    // Prepare pincode details
    const pickupDetails: PincodeDetails = {
      city: order?.hub?.address?.city || '',
      state: order?.hub?.address?.state || '',
    };

    const deliveryDetails: PincodeDetails = {
      city: order?.customer?.address?.city || '',
      state: order?.customer?.address?.state || '',
    };

    // Calculate volumetric weight once
    const volumetricWeight = calculateVolumetricWeight(
      params.boxLength,
      params.boxWidth,
      params.boxHeight,
      params.sizeUnit as 'cm' | 'inch'
    );

    // Check serviceability for the user's plan (this will use its own cache)
    const serviceabilityResult = await this.vendorService.checkServiceabilityForPlan(
      userId,
      params.pickupPincode,
      params.deliveryPincode,
      volumetricWeight,
      {
        length: params.boxLength,
        width: params.boxWidth,
        height: params.boxHeight,
        weight: params.weight,
      },
      params.paymentType,
      params.collectableAmount,
      order?.is_reverse_order
    );

    let rates: PriceCalculationResult[] = [];

    // If no serviceability, return empty rates with message
    if (!serviceabilityResult.success || serviceabilityResult.serviceableCouriers.length === 0) {
      const emptyResult = {
        rates: [],
        order,
        message: serviceabilityResult.message || 'No courier is serviceable for this order',
      };

      // Cache empty rates for shorter duration (1 hour)
      await this.fastify.redis.set(ratesKey, JSON.stringify({
        rates: [],
        message: emptyResult.message,
        timestamp: Date.now()
      }), 'EX', 3600);

      return emptyResult;
    }

    // Calculate rates for serviceable couriers using utility function
    rates = calculatePricesForCouriers(
      params,
      serviceabilityResult.serviceableCouriers.map((courier) => ({
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
          type: courier.pricing?.courier?.type || '', // Safe access
          is_active: true,
          is_reversed_courier: !!order?.is_reverse_order,
          pickup_time: undefined,
          weight_slab: courier.pricing?.weight_slab || 0.5,
          nickname: courier.pricing?.courier?.channel_config?.nickname || courier.name,
        },
        pricing: {
          weight_slab: courier.pricing?.weight_slab || 0.5,
          increment_weight: courier.pricing?.increment_weight || 0.5,
          cod_charge_hard: courier.pricing?.cod_charge_hard || 0,
          cod_charge_percent: courier.pricing?.cod_charge_percent || 0,
          is_cod_applicable: true,
          is_rto_applicable: true,
          is_fw_applicable: true,
          is_cod_reversal_applicable: true,
          zone_pricing: courier.pricing?.zone_pricing || [],
        },
      })),
      pickupDetails,
      deliveryDetails
    );

    // Format rates for response
    const formattedRates = rates.map((rate) => ({
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
      breakdown: rate.breakdown,
    }));

    // Sort rates by total price (ascending - cheapest first)
    formattedRates.sort((a, b) => a.total_price - b.total_price);

    // Prepare cache data
    const cacheData = {
      rates: formattedRates,
      serviceableCount: serviceabilityResult.serviceableCouriers.length,
      timestamp: Date.now(),
      orderId: id,
    };

    // Cache the rates for 24 hours
    await this.fastify.redis.set(ratesKey, JSON.stringify(cacheData), 'EX', 86400);

    return { rates: formattedRates, order };
  }
  /**
   * Create a new shipment
   */
  async createShipment(
    data: z.infer<typeof CreateShipmentSchema>,
    userId: string
  ): Promise<{
    success?: boolean;
    shipment?: any;
    error?: string;
  }> {
    // Check if order exists and belongs to the user
    const order = await this.orderService.getOrderById(data.order_id, userId);

    if (!order) {
      return { error: 'Order not found' };
    }

    // Get rates from cache
    const dimensionsStr = `${order?.package?.length || 0}x${order?.package?.breadth || 0}x${order?.package?.height || 0}x${order?.package?.dead_weight || 0}`;
    const ratesKey = `rates-${userId}-${order?.is_reverse_order ? 'reverse' : 'forward'}-${order?.hub?.address?.pincode}-${order?.customer?.address?.pincode}-${order?.applicable_weight}-${dimensionsStr}-${order?.payment_mode}-${order.amount_to_collect}`;
    const cachedRatesString = await this.fastify.redis.get(ratesKey);

    if (!cachedRatesString) {
      return { error: 'Rate information not available. Please recalculate rates first.' };
    }

    const cachedRates = JSON.parse(cachedRatesString);
    const selectedCourierRate = normalizeCourierRate(
      cachedRates.rates.find((rate: any) => rate.courier.id === data.courier_id)
    );
    const courier_curr_zone_pricing = selectedCourierRate.pricing.pricing.zone_pricing.find(
      (zone: any) => zone.zone === selectedCourierRate.zone
    );
    const shippingCost = selectedCourierRate.pricing.totalPrice;

    if (!selectedCourierRate) {
      return { error: 'Selected courier not found in available options' };
    }

    try {
      // Prepare data outside of transaction to minimize transaction time
      const [lastShipment, shipmentCount, userWallet, courier] = await Promise.all([
        this.fastify.prisma.shipment.findFirst({
          orderBy: { created_at: 'desc' },
        }),
        this.fastify.prisma.shipment.count({
          where: {
            user_id: userId,
            created_at: { gte: getFinancialYearStartDate(new Date().getFullYear().toString()) },
          },
        }),
        this.fastify.prisma.userWallet.findUnique({
          where: { user_id: userId },
        }),
        this.fastify.prisma.courier.findUnique({
          where: { id: data.courier_id },
          include: { channel_config: true },
        }),
      ]);

      if (!userWallet) {
        return { error: 'User wallet not found' };
      }

      if (userWallet.balance < shippingCost) {
        return { error: 'Insufficient wallet balance' };
      }

      if (!courier || !courier.channel_config) {
        return { error: 'Selected courier not found or not properly configured' };
      }

      const shipmentCode = generateId({
        tableName: 'shipment',
        entityName: 'shipment',
        lastUsedFinancialYear: getFinancialYear(lastShipment?.created_at || new Date()),
        lastSequenceNumber: shipmentCount,
      }).id;

      // Determine if this is a combined creation + scheduling request
      const isSchedulePickup =
        data.is_schedule_pickup === true ||
        courier.channel_config.name.toLowerCase().split('_')[0]?.includes('delhivery');

      // Step 1: Create shipment on vendor's platform first (outside transaction)
      const vendorResult = await this.vendorService.createShipmentOnVendor(
        courier.channel_config.name,
        {
          order,
          courier,
          hub: order.hub || {},
          awb: '',
          shipmentCode,
          isSchedulePickup,
        }
      );

      if (!vendorResult.success || !vendorResult.awb) {
        return { error: `Failed to create shipment with vendor: ${vendorResult.message}` };
      }

      // Use the AWB from the vendor
      const awb = vendorResult.awb;

      // Get hub city from order if available for tracking event
      const hubCity = order.hub?.address?.city || 'Unknown';
      const orderZone = getOrderZoneFromCourierZone(selectedCourierRate.zoneName);

      // Separate database operations into a shorter transaction
      return await this.fastify.prisma
        .$transaction(
          async (prisma) => {
            // Step 2: Perform database operations in parallel to save time
            const [shipment, orderUpdate] = await Promise.all([
              // Create shipment record
              prisma.shipment.update({
                where: { order_id: data.order_id },
                data: {
                  awb,
                  sr_shipment_id: vendorResult.data?.sr_shipment_id?.toString() || '',
                  status: isSchedulePickup
                    ? ShipmentStatus.PICKUP_SCHEDULED
                    : ShipmentStatus.COURIER_ASSIGNED,
                  shipping_charge: shippingCost,
                  fw_charge: selectedCourierRate.pricing.fwCharges,
                  cod_charge: selectedCourierRate.pricing.codCharges,
                  rto_charge: selectedCourierRate.pricing.rtoCharges,
                  order_zone: orderZone,
                  edd: selectedCourierRate.etd ? new Date(selectedCourierRate.etd) : null,
                  pickup_id: shipmentCode,
                  pickup_date:
                    isSchedulePickup && vendorResult.pickup_date
                      ? new Date(vendorResult.pickup_date)
                      : null,
                  routing_code: vendorResult.routingCode,
                  tracking_events: {
                    create: {
                      status: isSchedulePickup
                        ? ShipmentStatus.PICKUP_SCHEDULED
                        : ShipmentStatus.COURIER_ASSIGNED,
                      location: hubCity,
                      description: isSchedulePickup
                        ? 'Shipment created and pickup scheduled'
                        : 'Shipment created and ready for pickup',
                    },
                  },
                  courier: {
                    connect: { id: data.courier_id },
                  },
                },
              }),

              // Update order status
              prisma.order.update({
                where: { id: data.order_id },
                data: {
                  status: isSchedulePickup
                    ? ShipmentStatus.PICKUP_SCHEDULED
                    : ShipmentStatus.COURIER_ASSIGNED,
                },
              }),

              // Deduct amount from wallet
              // prisma.userWallet.update({
              //   where: { id: userWallet.id },
              //   data: { balance: { decrement: shippingCost } },
              // }),
            ]);

            // Step 3: Create additional records that depend on the shipment ID
            await Promise.all([
              // Store shipment pricing
              prisma.shipmentPricing.create({
                data: {
                  shipment_id: shipment.id,
                  cod_charge_hard: selectedCourierRate.cod.hardCharge,
                  cod_charge_percent: selectedCourierRate.cod.percentCharge,
                  is_fw_applicable: selectedCourierRate.pricing.pricing.is_fw_applicable,
                  is_rto_applicable: selectedCourierRate.pricing.pricing.is_rto_applicable,
                  is_cod_applicable: selectedCourierRate.pricing.pricing.is_cod_applicable,
                  is_cod_reversal_applicable:
                    selectedCourierRate.pricing.pricing.is_cod_reversal_applicable,
                  weight_slab: selectedCourierRate.pricing.pricing.weight_slab,
                  increment_weight: selectedCourierRate.pricing.pricing.increment_weight,
                  zone: orderZone,

                  is_rto_same_as_fw: courier_curr_zone_pricing.is_rto_same_as_fw,
                  increment_price: courier_curr_zone_pricing.increment_price,
                  base_price: courier_curr_zone_pricing.base_price,
                  rto_base_price: courier_curr_zone_pricing.rto_base_price,
                  rto_increment_price: courier_curr_zone_pricing.rto_increment_price,
                  flat_rto_charge: courier_curr_zone_pricing.flat_rto_charge,

                  // store other zone pricing: to calculate zone change charges
                  courier_other_zone_pricing: {
                    createMany: {
                      data: selectedCourierRate.pricing.pricing.zone_pricing.map((zone: any) => {
                        const { id, plan_courier_pricing_id, created_at, updated_at, ...rest } =
                          zone;
                        return { ...rest };
                      }),
                    },
                  },
                },
              }),
            ]);

            // Log vendor data for reference but don't store it directly
            // if (vendorResult.data) {
            //   console.info(`Vendor data for shipment ${shipment.id}:`, JSON.stringify(vendorResult.data).substring(0, 200) + '...');
            // }

            return {
              success: true,
              shipment: {
                ...shipment,
                awb,
                courier: courier?.name || 'Unknown',
              },
            };
          },
          {
            timeout: 20000, // Increase timeout to 20 seconds
            maxWait: 15000, // Increase max wait time to 15 seconds
          }
        )
        .then(async (result) => {
          // Create transaction record for the shipment after the transaction is complete
          await this.transactionService.createTransaction(
            TransactionEntityType.SHIPMENT,
            {
              amount: shippingCost,
              type: TransactionType.DEBIT,
              description: `Shipping charges for AWB: ${awb}`,
              userId: userId,
              shipmentId: result.shipment.id,
              awb: awb,
              srShipmentId: vendorResult.data?.sr_shipment_id?.toString(),
              status: TransactionStatus.COMPLETED,
              currency: 'INR',
            }
          );
          return result;
        })
        .catch((error) => {
          console.error('Error creating shipment:', error);
          throw error;
        });
    } catch (error) {
      // Improved error handling with detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      this.fastify.log.error(`Error creating shipment: ${errorMessage}\n${errorStack}`);

      if (errorMessage.includes('timeout')) {
        return {
          error: 'Transaction timeout. The operation took too long to complete. Please try again.',
        } as { error: string };
      }

      if (
        errorMessage.includes(
          'The change you are trying to make would violate the required relation'
        )
      ) {
        return { error: 'A shipment already exists for this order.' } as { error: string };
      }

      return { error: 'Failed to create shipment. Please try again.' } as { error: string };
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
        order_id: id,
        user_id: userId,
        status: {
          in: [ShipmentStatus.COURIER_ASSIGNED, ShipmentStatus.PICKUP_SCHEDULED],
        },
      },
      include: {
        courier: {
          include: {
            channel_config: true,
          },
        },
        order: {
          include: {
            hub: {
              include: {
                address: true,
              },
            },
          },
        },
      },
    });

    if (!shipment || !shipment.courier) {
      return { error: 'Shipment not found or not in a valid state for pickup scheduling' };
    }

    try {
      // Parse and validate pickup date
      const pickupDateTime = new Date(pickupDate);
      const today = new Date();
      // edd: 5 day from today
      const edd = shipment.edd;

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

      const pickupResult = await this.vendorService.schedulePickup(channelName, {
        awb: awbToUse,
        pickupDate: pickupDateTime.toISOString().split('T')[0] as string, // Force as string
        hub: shipment.order.hub,
        shipment,
      });
      const res_pickup_date = pickupResult.pickup_date
        ? new Date(pickupResult.pickup_date)
        : pickupDateTime;
      const date_diff = compareDates(
        pickupResult.pickup_date || pickupDate || '',
        shipment.edd?.toISOString().split('T')[0] || ''
      );
      const pickup_date = date_diff.isAfter ? res_pickup_date : pickupDateTime;
      const estimated_delivery_date = date_diff.isAfter
        ? new Date(pickup_date).setDate(pickup_date.getDate() + 3)
        : edd
          ? new Date(edd)
          : undefined;

      if (!pickupResult.success) {
        return { error: pickupResult.message || 'Failed to schedule pickup with vendor' };
      }

      // Get hub city safely
      const hubCity = shipment.order.hub?.address?.city || 'Unknown';

      // Update shipment status using shipment.id
      await this.fastify.prisma.shipment.update({
        where: { id: shipment.id }, // Use shipment.id from the found record
        data: {
          status: ShipmentStatus.PICKUP_SCHEDULED,
          pickup_date: pickup_date,
          edd: estimated_delivery_date ? new Date(estimated_delivery_date) : undefined,
        },
      });

      // Add tracking event
      await this.fastify.prisma.trackingEvent.create({
        data: {
          status: ShipmentStatus.PICKUP_SCHEDULED,
          location: hubCity,
          description: 'Pickup scheduled with courier',
          shipment_id: shipment.id, // Use shipment.id here as well
        },
      });

      return {
        success: true,
        message: `Your package has been successfully scheduled for ${format(pickup_date as Date, 'dd MMM yyyy')}`,
        pickupDate: pickup_date,
      };
    } catch (error) {
      this.fastify.log.error(`Error scheduling pickup: ${error}`);
      return { error: 'Failed to schedule pickup' };
    }
  }

  /**
   * Cancel a shipment and process refund
   */
  async cancelShipment(
    id: string,
    cancelType: 'shipment' | 'order',
    userId: string,
    reason: string = 'Cancelled by seller'
  ) {
    // Verify shipment exists and belongs to user
    const shipment = await this.fastify.prisma.shipment.findFirst({
      where: {
        order_id: id, // id is the order_id
        user_id: userId,
        status: {
          in: [
            ShipmentStatus.NEW,
            ShipmentStatus.COURIER_ASSIGNED,
            ShipmentStatus.PICKUP_SCHEDULED,
            ShipmentStatus.OUT_FOR_PICKUP,
          ],
        },
      },
      include: {
        courier: {
          include: {
            channel_config: true,
          },
        },
        order: true,
        pricing: true,
      },
    });

    if (!shipment) {
      return { error: 'Invalid stage to cancel shipment' };
    }

    try {
      return await this.fastify.prisma.$transaction(
        async (prisma) => {

          const shipmentStatus =
            cancelType === 'shipment'
              ? ShipmentStatus.CANCELLED_SHIPMENT
              : ShipmentStatus.CANCELLED_ORDER;

          // Cancel shipment with vendor if needed
          if (shipment.status !== ShipmentStatus.NEW) {
            const channelName = shipment.courier?.channel_config?.name || '';
            const awbToUse = shipment.awb || '';

            const cancelResult = await this.vendorService.cancelShipment(channelName, {
              awb: awbToUse,
              shipment,
            });

            if (!cancelResult.success) {
              return { error: cancelResult.message || 'Failed to cancel shipment with vendor' };
            }
          }


          // Determine refund amount based on shipment status
          // let refundAmount = 0;
          // let refundDescription = '';
          // if (
          //   shipment.status === ShipmentStatus.NEW ||
          //   shipment.status === ShipmentStatus.PICKUP_SCHEDULED
          // ) {
          // Full refund for shipments that haven't been picked up
          // refundAmount =
          //   (shipment.fw_charge || 0) +
          //   (shipment.order.payment_mode === 'COD' ? shipment.cod_charge || 0 : 0);
          // refundDescription = `Full refund for cancelled shipment: ${shipment.awb || 'No AWB'}`;
          // }

          const refundAmount = (shipment.fw_charge || 0) +
            (shipment.order.payment_mode === 'COD' ? shipment.cod_charge || 0 : 0);
          const refundDescription = `Full refund for cancelled shipment: ${shipment.awb || 'No AWB'}`;

          // else if (shipment.status === ShipmentStatus.IN_TRANSIT) {
          // Partial refund for picked-up shipments (no COD refund)
          //   refundAmount = (shipment.fw_charge || 0) * 0.5; // 50% of forward charge
          //   refundDescription = `Partial refund for cancelled picked-up shipment: ${shipment.awb || 'No AWB'}`;
          // }

          // Update shipment status
          await prisma.shipment.update({
            where: { id: shipment.id }, // Use shipment.id, not the input id
            data: {
              status: shipmentStatus,
              cancel_reason: reason,
              ...(cancelType === 'shipment' &&
                shipment.status !== ShipmentStatus.NEW && {
                is_reshipped: true,
                courier: { disconnect: true },
                awb: null,
                shipping_charge: null,
                fw_charge: null,
                cod_charge: null,
                rto_charge: null,
                order_zone: null,
                edd: null,
                pickup_date: null,
                pickup_id: null,
                routing_code: null,
              }),
            },
          });

          await prisma.shipmentPricing.deleteMany({
            where: { shipment_id: shipment.id },
          });

          // Add tracking event
          await prisma.trackingEvent.create({
            data: {
              status: shipmentStatus,
              location: 'System',
              description: reason || 'Shipment cancelled by seller',
              shipment_id: shipment.id, // Use shipment.id
            },
          });

          // Update order status
          await prisma.order.update({
            where: { id: shipment.order_id },
            data: { status: shipmentStatus },
          });

          return {
            success: true,
            message: 'Shipment cancelled successfully',
            refundAmount: refundAmount > 0 ? refundAmount : undefined,
            // Return additional data for transaction creation
            _transactionData: refundAmount > 0 ? {
              amount: refundAmount,
              description: refundDescription,
              shipmentId: shipment.id,
              awb: shipment.awb,
              srShipmentId: shipment.sr_shipment_id,
            } : undefined,
          };
        },
        {
          maxWait: 5000,
          timeout: 10000,
          isolationLevel: 'ReadCommitted',
        }
      ).then(async (result) => {
        // Create transaction record after the transaction is complete
        if (result.success && result._transactionData) {
          await this.transactionService.createTransaction(
            TransactionEntityType.SHIPMENT,
            {
              amount: result._transactionData.amount,
              type: TransactionType.CREDIT,
              description: result._transactionData.description,
              userId: userId,
              shipmentId: result._transactionData.shipmentId,
              awb: result._transactionData.awb || undefined,
              srShipmentId: result._transactionData.srShipmentId || undefined,
              status: TransactionStatus.COMPLETED,
              currency: 'INR',
            }
          );

          // Remove the internal transaction data before returning
          const { _transactionData, ...cleanResult } = result;
          return cleanResult;
        }
        return result;
      });
    } catch (error) {
      this.fastify.log.error(`Error cancelling shipment for order ${id}: ${error}`);
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
   * Create shipments in bulk
   * @param data Bulk shipment creation data
   * @param userId User ID
   * @returns Promise resolving to bulk operation details
   */
  async createShipmentBulk(data: any, userId: string) {
    try {
      const { order_ids, courier_ids, is_schedule_pickup, pickup_date, filters } = data;

      // Start with an empty array of orders to process
      let ordersToProcess: any[] = [];

      // If order_ids are provided, fetch those specific orders
      if (order_ids && order_ids.length > 0) {
        const orders = await this.fastify.prisma.order.findMany({
          where: {
            id: { in: order_ids },
            user_id: userId,
          },
        });

        // Map orders to the format needed for processing
        ordersToProcess = orders.map((order) => ({
          order_id: order.id,
          courier_ids: courier_ids,
          is_schedule_pickup: is_schedule_pickup,
          pickup_date: pickup_date,
        }));
      } else if (filters) {
        // If filters are provided, use them to find matching orders
        const { status, dateRange } = filters;

        // Build the where clause for filtering orders
        const where: any = {
          user_id: userId,
          status: status || 'NEW',
        };

        // Add date range filter if provided
        if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
          where.created_at = {
            gte: new Date(dateRange[0]),
            lte: new Date(dateRange[1]),
          };
        }

        // Count orders matching the filter for total count
        const totalCount = await this.fastify.prisma.order.count({ where });

        // Fetch orders matching the filter
        const orders = await this.fastify.prisma.order.findMany({
          where,
          include: {
            hub: true,
          },
          take: 1000, // Limit to 1000 orders for performance
        });

        // Map orders to the format needed for processing
        ordersToProcess = orders.map((order) => ({
          order_id: order.id,
          courier_ids: courier_ids,
          is_schedule_pickup: is_schedule_pickup,
          pickup_date: pickup_date,
        }));

        // Log warning if we're limiting the number of orders
        if (totalCount > 1000) {
          this.fastify.log.warn(
            `Bulk shipment creation limited to 1000 orders. Total matching orders: ${totalCount}`
          );
        }
      }

      // If no orders to process, return error
      if (ordersToProcess.length === 0) {
        return { error: 'No orders found to process' };
      }

      // Create bulk operation record
      const bulkOperation = await this.fastify.prisma.bulkOperation.create({
        data: {
          code: generateId({
            tableName: 'bulk_operation',
            entityName: 'bulk_operation',
            lastUsedFinancialYear: getFinancialYear(new Date()),
            lastSequenceNumber: Math.floor(Math.random() * 1000000),
          }).id,
          type: 'CREATE_SHIPMENT',
          status: 'PENDING',
          total_count: ordersToProcess.length,
          user_id: userId,
        },
      });

      // Add job to queue
      const queue = this.fastify.queues[QueueNames.BULK_OPERATION];
      if (!queue) {
        throw new Error('Bulk operation queue not initialized');
      }

      await queue.add(JobType.BULK_CREATE_SHIPMENT, {
        type: 'CREATE_SHIPMENT',
        data: ordersToProcess,
        userId,
        operationId: bulkOperation.id,
      });

      return {
        success: true,
        message: 'Bulk shipment creation started',
        operation: bulkOperation,
      };
    } catch (error) {
      this.fastify.log.error(`Error in createShipmentBulk: ${error}`);
      return { error: 'Failed to start bulk shipment creation' };
    }
  }

  /**
   * Schedule pickups for multiple shipments in bulk
   * @param shipmentIds Array of shipment IDs to schedule pickups for
   * @param pickupDate Date for pickup scheduling
   * @param userId User ID
   * @param filters Optional filters to apply when fetching shipments
   * @returns Promise resolving to bulk operation details
   */
  async schedulePickupBulk(
    shipmentIds: string[],
    pickupDate: string,
    userId: string,
    filters?: { status?: ShipmentStatus; dateRange?: [Date, Date] }
  ) {
    try {
      // Generate operation code
      const operationCode = `BO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Validate pickup date
      try {
        const pickupDateTime = new Date(pickupDate);
        if (isNaN(pickupDateTime.getTime())) {
          return { error: 'Invalid pickup date format' };
        }
      } catch (e) {
        return { error: 'Invalid pickup date format' };
      }

      // If filters are provided, fetch matching shipments
      let processedShipmentIds = [...shipmentIds];
      if (filters) {
        const where: any = {
          user_id: userId,
          status: ShipmentStatus.COURIER_ASSIGNED, // Only NEW shipments can be scheduled
          // Only consider shipments with AWB
          awb: { not: null },
        };

        if (filters.dateRange && filters.dateRange.length === 2) {
          where.created_at = {
            gte: filters.dateRange[0],
            lte: filters.dateRange[1],
          };
        }

        // If shipmentIds are provided, add them to the filter
        if (shipmentIds.length > 0) {
          where.id = { in: shipmentIds };
        }

        const shipments = await this.fastify.prisma.shipment.findMany({
          where,
          select: { id: true, awb: true },
        });

        // Filter out shipments without AWB
        const validShipments = shipments.filter((s) => s.awb);

        // If we're filtering with provided shipmentIds, use the intersection
        // Otherwise use all shipments that match the filter
        if (shipmentIds.length > 0) {
          const filteredShipmentIds = validShipments.map((shipment) => shipment.id);
          processedShipmentIds = shipmentIds.filter((id) => filteredShipmentIds.includes(id));
        } else {
          processedShipmentIds = validShipments.map((shipment) => shipment.id);
        }
      } else {
        // If no filters, still verify shipments have AWB
        if (shipmentIds.length > 0) {
          const shipments = await this.fastify.prisma.shipment.findMany({
            where: {
              id: { in: shipmentIds },
              user_id: userId,
              awb: { not: null },
            },
            select: { id: true },
          });
          processedShipmentIds = shipments.map((s) => s.id);
        }
      }

      // If no shipments to process, return early
      if (processedShipmentIds.length === 0) {
        return { error: 'No valid shipments found to process' };
      }

      // Create bulk operation record
      const bulkOperation = await this.fastify.prisma.bulkOperation.create({
        data: {
          user_id: userId,
          code: operationCode,
          type: 'SCHEDULE_PICKUP',
          status: 'PENDING',
          total_count: processedShipmentIds.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
        },
      });

      // Prepare data for processing
      const shipmentData = processedShipmentIds.map((id, index) => ({
        shipment_id: id,
        pickup_date: pickupDate,
        index,
      }));

      try {
        // Add job to the bulk operation queue using the queue.ts helper
        await addJob(
          QueueNames.BULK_OPERATION,
          'bulk-schedule-pickup',
          {
            type: 'BULK_SCHEDULE_PICKUP',
            data: shipmentData,
            userId,
            operationId: bulkOperation.id,
          },
          {
            attempts: 3,
          }
        );

        this.fastify.log.info(`Bulk pickup scheduling job added to queue: ${bulkOperation.id}`);

        return {
          success: true,
          message: 'Bulk pickup scheduling operation started',
          operation: {
            id: bulkOperation.id,
            code: bulkOperation.code,
            status: bulkOperation.status,
            total: bulkOperation.total_count,
          },
        };
      } catch (error) {
        this.fastify.log.error(`Failed to add job to queue: ${error}`);

        // Fallback to synchronous processing if queue fails
        this.fastify.log.warn('Falling back to synchronous processing');

        // Process shipments in parallel batches
        const batchSize = 5; // Process 5 shipments at a time
        let successCount = 0;
        let failedCount = 0;
        const results = [];

        // Process in batches
        for (let i = 0; i < shipmentData.length; i += batchSize) {
          const batch = shipmentData.slice(i, i + batchSize);

          // Process batch in parallel
          const batchResults = await Promise.all(
            batch.map(async (item) => {
              try {
                const result = await this.schedulePickup(
                  item.shipment_id,
                  userId,
                  item.pickup_date
                );
                if (result.error) {
                  return {
                    id: item.shipment_id,
                    success: false,
                    message: result.error,
                    timestamp: new Date(),
                    index: item.index,
                  };
                } else {
                  return {
                    id: item.shipment_id,
                    success: true,
                    message: 'Pickup scheduled successfully',
                    timestamp: new Date(),
                    index: item.index,
                  };
                }
              } catch (error) {
                return {
                  id: item.shipment_id,
                  success: false,
                  message: error instanceof Error ? error.message : 'Unknown error',
                  timestamp: new Date(),
                  index: item.index,
                };
              }
            })
          );

          // Update counts and collect results
          for (const result of batchResults) {
            if (result.success) {
              successCount++;
            } else {
              failedCount++;
            }
            results.push(result);
          }

          // Update bulk operation status after each batch
          await this.fastify.prisma.bulkOperation.update({
            where: { id: bulkOperation.id },
            data: {
              processed_count: i + batch.length,
              success_count: successCount,
              failed_count: failedCount,
            },
          });
        }

        // Sort results by original index
        results.sort((a, b) => a.index - b.index);

        // Update bulk operation status to completed
        await this.fastify.prisma.bulkOperation.update({
          where: { id: bulkOperation.id },
          data: {
            status: 'COMPLETED',
            processed_count: processedShipmentIds.length,
            success_count: successCount,
            failed_count: failedCount,
          },
        });

        return {
          success: true,
          message: 'Bulk pickup scheduling operation completed synchronously',
          operation: {
            id: bulkOperation.id,
            code: bulkOperation.code,
            status: 'COMPLETED',
            total: processedShipmentIds.length,
            processed: processedShipmentIds.length,
            successful: successCount,
            failed: failedCount,
            results,
          },
        };
      }
    } catch (error) {
      this.fastify.log.error(`Error scheduling bulk pickups: ${error}`);
      return { error: 'Failed to start bulk pickup scheduling' };
    }
  }

  /**
   * Cancel multiple shipments in bulk
   * @param shipmentIds Array of shipment IDs to cancel
   * @param reason Cancellation reason
   * @param userId User ID
   * @param filters Optional filters to apply when fetching shipments
   * @returns Promise resolving to bulk operation details
   */
  async cancelShipmentBulk(
    shipmentIds: string[],
    reason: string,
    userId: string,
    filters?: { status?: ShipmentStatus; dateRange?: [Date, Date] }
  ) {
    try {
      // Generate operation code
      const operationCode = `BO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Default reason if not provided
      const cancellationReason = reason || 'Cancelled by seller in bulk operation';

      // If filters are provided, fetch matching shipments
      let processedShipmentIds = [...shipmentIds];
      if (filters) {
        const where: any = {
          user_id: userId,
          status: {
            notIn: [
              ShipmentStatus.DELIVERED,
              ShipmentStatus.RETURNED,
              ShipmentStatus.CANCELLED_SHIPMENT,
              ShipmentStatus.CANCELLED_ORDER,
            ],
          },
          // Only consider shipments with AWB
          awb: { not: null },
        };

        if (filters.status) {
          where.status = filters.status;
        }

        if (filters.dateRange && filters.dateRange.length === 2) {
          where.created_at = {
            gte: filters.dateRange[0],
            lte: filters.dateRange[1],
          };
        }

        // If shipmentIds are provided, add them to the filter
        if (shipmentIds.length > 0) {
          where.id = { in: shipmentIds };
        }

        const shipments = await this.fastify.prisma.shipment.findMany({
          where,
          select: { id: true, awb: true },
        });

        // Filter out shipments without AWB
        const validShipments = shipments.filter((s) => s.awb);

        // If we're filtering with provided shipmentIds, use the intersection
        // Otherwise use all shipments that match the filter
        if (shipmentIds.length > 0) {
          const filteredShipmentIds = validShipments.map((shipment) => shipment.id);
          processedShipmentIds = shipmentIds.filter((id) => filteredShipmentIds.includes(id));
        } else {
          processedShipmentIds = validShipments.map((shipment) => shipment.id);
        }
      } else {
        // If no filters, still verify shipments have AWB
        if (shipmentIds.length > 0) {
          const shipments = await this.fastify.prisma.shipment.findMany({
            where: {
              id: { in: shipmentIds },
              user_id: userId,
              awb: { not: null },
              status: {
                notIn: [
                  ShipmentStatus.DELIVERED,
                  ShipmentStatus.RETURNED,
                  ShipmentStatus.CANCELLED_SHIPMENT,
                  ShipmentStatus.CANCELLED_ORDER,
                ],
              },
            },
            select: { id: true },
          });
          processedShipmentIds = shipments.map((s) => s.id);
        }
      }

      // If no shipments to process, return early
      if (processedShipmentIds.length === 0) {
        return { error: 'No valid shipments found to process' };
      }

      // Create bulk operation record
      const bulkOperation = await this.fastify.prisma.bulkOperation.create({
        data: {
          user_id: userId,
          code: operationCode,
          type: 'CANCEL_SHIPMENT',
          status: 'PENDING',
          total_count: processedShipmentIds.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
        },
      });

      // Prepare data for processing
      const shipmentData = processedShipmentIds.map((id, index) => ({
        shipment_id: id,
        reason: cancellationReason,
        index,
      }));

      try {
        // Add job to the bulk operation queue using the queue.ts helper
        await addJob(
          QueueNames.BULK_OPERATION,
          'bulk-cancel-shipment',
          {
            type: 'BULK_CANCEL_SHIPMENT',
            data: shipmentData,
            userId,
            operationId: bulkOperation.id,
          },
          {
            attempts: 3,
          }
        );

        this.fastify.log.info(`Bulk shipment cancellation job added to queue: ${bulkOperation.id}`);

        return {
          success: true,
          message: 'Bulk shipment cancellation operation started',
          operation: {
            id: bulkOperation.id,
            code: bulkOperation.code,
            status: bulkOperation.status,
            total: bulkOperation.total_count,
          },
        };
      } catch (error) {
        this.fastify.log.error(`Failed to add job to queue: ${error}`);

        // Fallback to synchronous processing if queue fails
        this.fastify.log.warn('Falling back to synchronous processing');

        // Process shipments in parallel batches
        const batchSize = 5; // Process 5 shipments at a time
        let successCount = 0;
        let failedCount = 0;
        const results = [];

        // Process in batches
        for (let i = 0; i < shipmentData.length; i += batchSize) {
          const batch = shipmentData.slice(i, i + batchSize);

          // Process batch in parallel
          const batchResults = await Promise.all(
            batch.map(async (item) => {
              try {
                const result = await this.cancelShipment(
                  item.shipment_id,
                  'shipment',
                  userId,
                  item.reason
                );
                if (result.error) {
                  return {
                    id: item.shipment_id,
                    success: false,
                    message: result.error,
                    timestamp: new Date(),
                    index: item.index,
                  };
                } else {
                  return {
                    id: item.shipment_id,
                    success: true,
                    message: 'Shipment cancelled successfully',
                    timestamp: new Date(),
                    index: item.index,
                  };
                }
              } catch (error) {
                return {
                  id: item.shipment_id,
                  success: false,
                  message: error instanceof Error ? error.message : 'Unknown error',
                  timestamp: new Date(),
                  index: item.index,
                };
              }
            })
          );

          // Update counts and collect results
          for (const result of batchResults) {
            if (result.success) {
              successCount++;
            } else {
              failedCount++;
            }
            results.push(result);
          }

          // Update bulk operation status after each batch
          await this.fastify.prisma.bulkOperation.update({
            where: { id: bulkOperation.id },
            data: {
              processed_count: i + batch.length,
              success_count: successCount,
              failed_count: failedCount,
            },
          });
        }

        // Sort results by original index
        results.sort((a, b) => a.index - b.index);

        // Update bulk operation status to completed
        await this.fastify.prisma.bulkOperation.update({
          where: { id: bulkOperation.id },
          data: {
            status: 'COMPLETED',
            processed_count: processedShipmentIds.length,
            success_count: successCount,
            failed_count: failedCount,
          },
        });

        return {
          success: true,
          message: 'Bulk shipment cancellation operation completed synchronously',
          operation: {
            id: bulkOperation.id,
            code: bulkOperation.code,
            status: 'COMPLETED',
            total: processedShipmentIds.length,
            processed: processedShipmentIds.length,
            successful: successCount,
            failed: failedCount,
            results,
          },
        };
      }
    } catch (error) {
      this.fastify.log.error(`Error cancelling bulk shipments: ${error}`);
      return { error: 'Failed to start bulk shipment cancellation' };
    }
  }

  /**
   * Get bulk operation status
   * @param operationId Bulk operation ID
   * @param userId User ID
   * @returns Bulk operation status
   */
  async getBulkOperationStatus(operationId: string, userId: string) {
    try {
      // Get bulk operation
      const operation = await this.fastify.prisma.bulkOperation.findUnique({
        where: { id: operationId },
      });

      if (!operation) {
        return { error: 'Bulk operation not found' };
      }

      // Get job from queue to check progress
      let progress = 0;
      let results = [];

      try {
        const bulkOperationQueue = queues[QueueNames.BULK_OPERATION];
        if (bulkOperationQueue) {
          const job = await bulkOperationQueue.getJob(operationId);
          if (job) {
            progress = (await job.progress()) || 0;

            // If job is completed, get the results
            if (await job.isCompleted()) {
              const jobResult = await job.returnValue();
              results = jobResult?.results || [];
            }
          }
        }
      } catch (error) {
        this.fastify.log.error(`Error getting job from queue: ${error}`);
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
          updated_at: operation.updated_at,
        },
      };
    } catch (error) {
      this.fastify.log.error(`Error getting bulk operation status: ${error}`);
      return { error: 'Failed to get bulk operation status' };
    }
  }
}
