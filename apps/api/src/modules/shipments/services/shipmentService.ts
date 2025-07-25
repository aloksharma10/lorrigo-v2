import { ChargeType, ShipmentStatus, TransactionStatus } from '@lorrigo/db';
import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import {
  CreateShipmentSchema,
  formatDateAddDays,
  generateId,
  getFinancialYearStartDate,
  getFinancialYear,
  compareDates,
  ShipmentBucketManager,
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
import {
  TransactionService,
  TransactionType,
  TransactionEntityType,
} from '@/modules/transactions/services/transaction-service';
import { JobType } from '../queues/shipmentQueue';
import { ChargeProcessingService } from './charge-processing.service';
import { TransactionJobType } from '@/modules/transactions/queues/transaction-worker';
import { RateCalculationParams } from '@/modules/plan/services/plan.service';
import { getPincodeDetails } from '@/utils/pincode';

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
  private chargeProcessingService: ChargeProcessingService;
  constructor(
    fastify: FastifyInstance,
    private orderService: OrderService
  ) {
    this.fastify = fastify as ExtendedFastifyInstance;
    this.vendorService = new VendorService(fastify);
    this.transactionService = new TransactionService(fastify);
    this.chargeProcessingService = new ChargeProcessingService(fastify);

    this.fastify.redis
      .flushall()
      .then(() => {
        this.fastify.log.info('Redis flushed successfully');
      })
      .catch((error) => {
        this.fastify.log.error('Failed to flush Redis:', error);
      });
  }

   /**
   * Check if user can create shipment based on wallet balance
   */
   async canCreateShipment(userId: string, shipmentAmount: number): Promise<{ canCreate: boolean; reason?: string, message?: string }> {
    const wallet = await this.fastify.prisma.userWallet.findUnique({
      where: { user_id: userId },
    });
    
    if (!wallet) {
      return { canCreate: false, reason: 'Wallet not found' };
    }

    const availableAmount = wallet.balance + wallet.max_negative_amount - shipmentAmount;
    
    if (availableAmount <= 0) {
      return {
        canCreate: false,
        reason: `Insufficient balance. Available: ${wallet.balance.toFixed(2)}, Max negative: ${wallet.max_negative_amount.toFixed(2)}`,
        message: `Insufficient balance. Available: ${wallet.balance.toFixed(2)}, Required: ${shipmentAmount.toFixed(2)}, Please recharge your wallet` 
      };
    }
    return { canCreate: true };
  }

  async getServiceableCouriers(userId : string, params : RateCalculationParams){
    console.log(params, 'params')

    const dimensionsStr = `${params.boxLength || 0}x${params.boxWidth || 0}x${params.boxHeight || 0}x${params.weight || 0}`;
    const ratesKey = `rates-${userId}-${params.isReversedOrder ? 'reverse' : 'forward'}-${params.pickupPincode}-${params.deliveryPincode}-${params.weight}-${dimensionsStr}-${params.paymentType}-${params.collectableAmount}`;

    // Try to get rates from cache first
    const cachedRates = await this.fastify.redis.get(ratesKey);
    if (cachedRates) {
      const parsedCache = JSON.parse(cachedRates);
      return {
        rates: parsedCache.rates,
        cached: true,
      };
    }

    const pickupPincodeDetails = await getPincodeDetails(params.pickupPincode);
    const deliveryPincodeDetails = await getPincodeDetails(params.deliveryPincode);
    console.log(pickupPincodeDetails, deliveryPincodeDetails)

    if (!pickupPincodeDetails || !deliveryPincodeDetails) {
      return {
        rates: [],

        message: 'Invalid or not serviceable pincode',
      };
    }

    const pickupDetails: PincodeDetails = {
      city: pickupPincodeDetails?.city || '',
      state: pickupPincodeDetails?.state || '',
    };
  
    const deliveryDetails: PincodeDetails = {
      city: deliveryPincodeDetails?.city || '',
      state: deliveryPincodeDetails?.state || '',
    };

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
      params.paymentType as 0 | 1,
      params.orderValue || 0,      
      params.collectableAmount || 0,
      params.isReversedOrder || false
    );

    let rates: PriceCalculationResult[] = [];

    // If no serviceability, return empty rates with message
    if (!serviceabilityResult.success || serviceabilityResult.serviceableCouriers.length === 0) {
      const emptyResult = {
        rates: [],
        message: serviceabilityResult.message || 'No courier is serviceable for this order',
      };

      // Cache empty rates for shorter duration (1 hour)
      await this.fastify.redis.set(
        ratesKey,
        JSON.stringify({
          rates: [],
          message: emptyResult.message,
          timestamp: Date.now(),
        }),
        'EX',
        3600
      );

      return emptyResult;
    }

    // Calculate rates for serviceable couriers using utility function
    rates = calculatePricesForCouriers(
      params as PriceCalculationParams,
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
          is_reversed_courier: !!params.isReversedOrder,
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
      estimated_delivery_days: rate.courier.estimated_delivery_days,
      etd: rate.courier.etd,
      pickup_time: rate.courier.pickup_time,
      expected_pickup: rate.expected_pickup,
      rating: rate.courier.rating,
      pickup_performance: rate.courier.pickup_performance,
      delivery_performance: rate.courier.delivery_performance,
      rto_performance: rate.courier.rto_performance,
      zone: rate.zoneName,
      weight_slab: rate.courier.weight_slab,
      final_weight: rate.final_weight,
      volumetric_weight: rate.volumetric_weight,
      base_price: rate.base_price,
      weight_charges: rate.weight_charges,
      cod_charges: rate.cod_charges,
      rto_charges: rate.rto_charges,
      total_price: rate.total_price,
      breakdown: rate.breakdown,
    }));

    // Sort rates by total price (ascending - cheapest first)
    formattedRates.sort((a, b) => a.total_price - b.total_price);

    // Prepare cache data
    const cacheData = {
      rates: formattedRates,
      internalRates: rates,
      serviceableCount: serviceabilityResult.serviceableCouriers.length,
      timestamp: Date.now(),
    };

    // Cache the rates for 24 hours
    await this.fastify.redis.set(ratesKey, JSON.stringify(cacheData), 'EX', 86400);

    return { rates: formattedRates };
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

    if (order.shipment?.status === ShipmentStatus.CANCELLED_ORDER) {
      return { rates: [], order, message: 'Order is cancelled' };
    }

    if (order.shipment?.status === ShipmentStatus.COURIER_ASSIGNED) {
      return { rates: [], order, message: 'Order already has a courier assigned' };
    }

    // Build comprehensive cache key including all rate-affecting parameters
    const dimensionsStr = `${order?.package?.length || 0}x${order?.package?.breadth || 0}x${order?.package?.height || 0}x${order?.package?.dead_weight || 0}`;
    const ratesKey = `rates-${userId}-${order?.is_reverse_order ? 'reverse' : 'forward'}-${order?.hub?.address?.pincode}-${order?.customer?.address?.pincode}-${order?.applicable_weight}-${dimensionsStr}-${order?.payment_method}-${order.amount_to_collect}`;

    // Try to get rates from cache first
    const cachedRates = await this.fastify.redis.get(ratesKey);
    if (cachedRates) {
      const parsedCache = JSON.parse(cachedRates);
      return {
        rates: parsedCache.formattedRates || parsedCache.rates || [],
        order,
        cached: true,
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
      paymentType: order?.payment_method === 'COD' ? 1 : 0,
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
      order.total_amount,      
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
      await this.fastify.redis.set(
        ratesKey,
        JSON.stringify({
          rates: [],
          message: emptyResult.message,
          timestamp: Date.now(),
        }),
        'EX',
        3600
      );

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
      internalRates: rates,
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
    try {
      // Step 1: Quick validation and data preparation (parallel execution)
      const [order, lastShipment, shipmentCount] = await Promise.all([
        this.orderService.getOrderById(data.order_id, userId),
        this.fastify.prisma.shipment.findFirst({
          orderBy: { created_at: 'desc' },
        }),
        this.fastify.prisma.shipment.count({
          where: {
            user_id: userId,
            created_at: { gte: getFinancialYearStartDate(new Date().getFullYear().toString()) },
          },
        }),
      ]);
  
      if (!order) {
        return { error: 'Order not found' };
      }
  
      // Step 2: Get cached rates and courier info in parallel
      const dimensionsStr = `${order?.package?.length || 0}x${order?.package?.breadth || 0}x${order?.package?.height || 0}x${order?.package?.dead_weight || 0}`;
      const ratesKey = `rates-${userId}-${order?.is_reverse_order ? 'reverse' : 'forward'}-${order?.hub?.address?.pincode}-${order?.customer?.address?.pincode}-${order?.applicable_weight}-${dimensionsStr}-${order?.payment_method}-${order.amount_to_collect}`;
      
      const [cachedRatesString, courier] = await Promise.all([
        this.fastify.redis.get(ratesKey),
        this.fastify.prisma.courier.findUnique({
          where: { id: data.courier_id },
          include: { channel_config: true },
        })
      ]);
  
      if (!cachedRatesString) {
        return { error: 'Rate information not available. Please refresh the page and try again.' };
      }
  
      if (!courier || !courier.channel_config) {
        return { error: 'Selected courier not found or not properly configured' };
      }
  
      // Step 3: Process rates and validate
      const cachedRates = JSON.parse(cachedRatesString);
      const selectedCourierRate = normalizeCourierRate(
        cachedRates.internalRates.find((rate: any) => rate.courier.id === data.courier_id)
      );
  
      if (!selectedCourierRate) {
        return { error: 'Selected courier not found in available options' };
      }
  
      const courier_curr_zone_pricing = selectedCourierRate.pricing.pricing.zone_pricing.find(
        (zone: any) => zone.zone === selectedCourierRate.zone
      );
      const fwCharges = selectedCourierRate.pricing.fwCharges || 0;
      const codCharges = selectedCourierRate.pricing.codCharges || 0;
      const shippingCost = selectedCourierRate.pricing.totalPrice || 0;
  
      // Step 4: Quick wallet validation
      const canCreateShipment = await this.canCreateShipment(userId, shippingCost);
      if (!canCreateShipment.canCreate) {
        return { error: canCreateShipment.message || canCreateShipment.reason };
      }
  
      // Step 5: Generate shipment code
      const shipmentCode = generateId({
        tableName: 'shipment',
        entityName: 'shipment',
        lastUsedFinancialYear: getFinancialYear(lastShipment?.created_at || new Date()),
        lastSequenceNumber: shipmentCount,
      }).id;
  
      const isReverseOrder = order.is_reverse_order;
      const isSchedulePickup = data.is_schedule_pickup === true || 
        courier.channel_config.name.toLowerCase().split('_')[0]?.includes('delhivery');


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
  
      // Step 6: Create minimal shipment record FIRST (fast DB operation)
      const preliminaryShipment = await this.fastify.prisma.shipment.update({
        where: { order_id: data.order_id },
        data: {
          status: ShipmentStatus.COURIER_ASSIGNED,
          bucket: ShipmentBucketManager.getBucketFromStatus(ShipmentStatus.COURIER_ASSIGNED),
          pickup_id: shipmentCode,
          shipping_charge: shippingCost,
          fw_charge: selectedCourierRate.pricing.fwCharges,
          cod_charge: selectedCourierRate.pricing.codCharges,
          rto_charge: selectedCourierRate.pricing.rtoCharges,
          order_zone: getOrderZoneFromCourierZone(selectedCourierRate.zoneName),
          edd: selectedCourierRate.etd ? new Date(selectedCourierRate.etd) : null,
          courier: {
            connect: { id: data.courier_id },
          },
        },
      });

  
  
      // Step 7: Queue the vendor shipment creation for background processing
      await addJob(QueueNames.BULK_OPERATION, JobType.CREATE_SHIPMENT, {
        shipmentId: preliminaryShipment.id,
        order,
        courier,
        shipmentCode,
        isSchedulePickup,
        selectedCourierRate,
        courier_curr_zone_pricing,
        fwCharges,
        codCharges,
        userId,
        isReverseOrder,
        vendorResult
      }, {
        priority: 1, // High priority for immediate processing
        delay: 0,
      });
  
      // Step 8: Return immediate response with preliminary data
      return {
        success: true,
        shipment: {
          ...preliminaryShipment,
          awb: vendorResult.awb, // Will be updated via webhook/polling
          is_reverse_order: isReverseOrder,
          courier: courier?.name || 'Unknown',
          status: isSchedulePickup
          ? ShipmentStatus.PICKUP_SCHEDULED
          : ShipmentStatus.COURIER_ASSIGNED, // Indicate that vendor creation is in progress
        },
      };
  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.fastify.log.error(`Error creating shipment: ${errorMessage}`);
  
      if (errorMessage.includes('The change you are trying to make would violate the required relation')) {
        return { error: 'A shipment already exists for this order.' };
      }
  
      return { error: 'Failed to create shipment. Please try again.' };
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
            // status: true,
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
        courier: {
          include: {
            channel_config: true,
          },
        },
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
          bucket: ShipmentBucketManager.getBucketFromStatus(ShipmentStatus.PICKUP_SCHEDULED),
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
      return await this.fastify.prisma
        .$transaction(
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
            const fwCharges = shipment.fw_charge || 0;
            const codCharges = shipment.cod_charge || 0;

            // Update shipment status
            await prisma.shipment.update({
              where: { id: shipment.id }, // Use shipment.id, not the input id
              data: {
                bucket: ShipmentBucketManager.getBucketFromStatus(shipmentStatus),
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
              data: { shipment: { update: { status: shipmentStatus } } },
            });
            // i want separate transaction for fw and cod
            return {
              success: true,
              message: 'Shipment cancelled successfully',
              refundAmount: fwCharges + codCharges > 0 ? fwCharges + codCharges : undefined,
              // Return additional data for transaction creation
              _transactionData:
                fwCharges > 0 ? {
                  amount: fwCharges,
                  description: `Forward shipping charge for AWB: ${shipment.awb || 'No AWB'}`,
                  charge_type: ChargeType.FORWARD_CHARGE,
                } : undefined,
              _transactionDataCod:
                codCharges > 0 ? {  
                  amount: codCharges,
                  description: `COD charge for AWB: ${shipment.awb || 'No AWB'}`,
                  charge_type: ChargeType.COD_CHARGE,
                } : undefined,
            };
          },
          {
            maxWait: 5000,
            timeout: 10000,
            isolationLevel: 'ReadCommitted',
          }
        )
        .then(async (result) => {
          // Create transaction record after the transaction is complete
          if (result.success && result._transactionData) {
            // await this.transactionService.createShipmentTransaction({
            //   shipmentId: shipment.id,
            //   userId: shipment.user_id,
            //   amount: result._transactionData.amount,
            //   type: TransactionType.CREDIT,
            //   description: result._transactionData.description,
            //   awb: shipment.awb || undefined,
            //   charge_type: result._transactionData.charge_type,
            // });
            // if (result._transactionDataCod) {
            //   await this.transactionService.createShipmentTransaction({
            //     shipmentId: shipment.id,
            //     userId: shipment.user_id,
            //     amount: result._transactionDataCod.amount,
            //     type: TransactionType.CREDIT,
            //     description: result._transactionDataCod.description,
            //     awb: shipment.awb || undefined,
            //     charge_type: result._transactionDataCod.charge_type,
            //   });
            // }

            await addJob(QueueNames.TRANSACTION_QUEUE, TransactionJobType.BULK_PROCESS_TRANSACTIONS, {
              transactions: [
                result._transactionData ? {
                  shipmentId: shipment.id,
                  userId: shipment.user_id,
                  amount: result._transactionData.amount,
                  type: TransactionType.CREDIT,
                  description: result._transactionData.description,
                  awb: shipment.awb || undefined,
                  charge_type: result._transactionData.charge_type,
                } : {},
                result._transactionDataCod ?  {
                  shipmentId: shipment.id,
                  userId: shipment.user_id,
                  amount: result._transactionDataCod.amount,
                  type: TransactionType.CREDIT,
                  description: result._transactionDataCod.description,
                  awb: shipment.awb || undefined,
                  charge_type: result._transactionDataCod.charge_type,
                } : {},
              ],
              entityType: TransactionEntityType.SHIPMENT,
            });

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
            in: [
              ShipmentStatus.COURIER_ASSIGNED,
              ShipmentStatus.PICKUP_SCHEDULED,
              ShipmentStatus.OUT_FOR_PICKUP,
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
                in: [
                  ShipmentStatus.COURIER_ASSIGNED,
                  ShipmentStatus.PICKUP_SCHEDULED,
                  ShipmentStatus.OUT_FOR_PICKUP,
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

  /**
   * Process a batch of shipments for tracking
   * @param shipments Array of shipments to track
   * @returns Promise resolving to processing results
   */
  async processShipmentTrackingBatch(
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
    try {
      this.fastify.log.info(`Processing ${shipments.length} shipments for tracking updates`);

      // Use the vendor service to process the batch
      return await this.vendorService.processShipmentTrackingBatch(shipments);
    } catch (error) {
      this.fastify.log.error('Error processing shipment tracking batch:', error);
      return {
        processed: shipments.length,
        updated: 0,
        skipped: 0,
        failed: shipments.length,
        results: shipments.map((shipment) => ({
          shipmentId: shipment.id,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        })),
      };
    }
  }

  /**
   * Track a shipment and update its status
   * @param shipmentId Shipment ID
   * @param vendorName Vendor name
   * @param awb AWB number
   * @param orderId Order ID
   * @returns Promise resolving to tracking result
   */
  async trackShipment(
    shipmentId: string,
    vendorName: string,
    awb: string,
    orderId: string
  ): Promise<{
    success: boolean;
    message: string;
    updated: boolean;
    status_code?: ShipmentStatus;
    newStatus?: string;
    newBucket?: number;
    events?: any[];
  }> {
    try {
      // Get vendor service from fastify instance
      const vendorService = this.vendorService;
      if (!vendorService) {
        return {
          success: false,
          message: 'Vendor service not initialized',
          updated: false,
        };
      }

      // Track shipment with vendor
      const trackingResult = await vendorService.trackShipment(vendorName, {
        awb,
        shipmentId,
        orderId: orderId || '',
      });

      if (!trackingResult.success) {
        return {
          success: false,
          message: trackingResult.message,
          updated: false,
        };
      }

      // Get latest tracking event
      const events = trackingResult.trackingEvents || [];
      if (events.length === 0) {
        return {
          success: true,
          message: 'No tracking events found',
          updated: false,
          events,
        };
      }

      // Sort events by timestamp (newest first)
      events.sort(
        (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Get the latest event
      const latestEvent = events[0];
      const bucket = latestEvent?.bucket || trackingResult.latestBucket;

      // Get current shipment status
      const shipment = await this.fastify.prisma.shipment.findUnique({
        where: { id: shipmentId },
        select: { status: true, bucket: true },
      });

      if (!shipment) {
        return {
          success: false,
          message: 'Shipment not found',
          updated: false,
        };
      }

      // Determine if status needs to be updated
      let newStatus =
        latestEvent?.description ||
        latestEvent?.activity ||
        latestEvent?.status_code ||
        shipment.status;
      const status_code = latestEvent?.status_code || ShipmentStatus.AWAITING;
      let statusUpdated = false;

      if (
        bucket !== undefined &&
        bucket !== null &&
        (shipment.status !== status_code || bucket !== shipment.bucket)
      ) {
        // Map bucket to status
        const bucketStatus = ShipmentBucketManager.getStatusFromBucket(bucket);
        if (bucketStatus && bucketStatus !== shipment.status) {
          newStatus = bucketStatus;
          statusUpdated = true;
        }
      }

      // Check for RTO status in events
      const hasRtoEvent = events.some((event: any) => event.isRTO);
      if (hasRtoEvent && !newStatus.includes('RTO')) {
        newStatus = ShipmentStatus.RTO_INITIATED;
        statusUpdated = true;
      }

      // Update shipment if status changed
      if (statusUpdated) {
        // Prepare date fields to update
        const updateData: any = {
          status: status_code as ShipmentStatus,
          bucket: bucket !== undefined && bucket !== null ? bucket : undefined,
        };

        // Use the timestamp from the latest event if available, else now
        const eventTimestamp = latestEvent?.timestamp ? new Date(latestEvent.timestamp) : new Date();

        // Fetch current shipment date fields
        const currentShipment = await this.fastify.prisma.shipment.findUnique({
          where: { id: shipmentId },
          select: { delivered_date: true, rto_delivered_date: true, picked_up_date: true },
        });

        // Set delivered_date if moving to DELIVERED and not already set
        if (
          (status_code === ShipmentStatus.DELIVERED || newStatus === 'DELIVERED') &&
          !currentShipment?.delivered_date
        ) {
          updateData.delivered_date = eventTimestamp;
        }
        // Set rto_delivered_date if moving to RTO_DELIVERED and not already set
        if (
          (status_code === ShipmentStatus.RTO_DELIVERED || newStatus === 'RTO_DELIVERED') &&
          !currentShipment?.rto_delivered_date
        ) {
          updateData.rto_delivered_date = eventTimestamp;
        }
        // Set picked_up_date if moving to PICKED_UP or IN_TRANSIT for the first time and not already set
        if (
          ((status_code === ShipmentStatus.PICKED_UP || newStatus === 'PICKED_UP' ||
            status_code === ShipmentStatus.IN_TRANSIT || newStatus === 'IN_TRANSIT') &&
            !currentShipment?.picked_up_date)
        ) {
          updateData.picked_up_date = eventTimestamp;
        }

        await this.fastify.prisma.shipment.update({
          where: { id: shipmentId },
          data: updateData,
        });

        // If status changed to RTO, schedule RTO charges processing
        if (newStatus.includes('RTO')) {
          await this.chargeProcessingService.processRtoShipmentCharges(shipment);
        }

        // Store tracking events
        // await this.storeTrackingEvents(shipmentId, events);

        return {
          success: true,
          message: `Shipment status updated to ${newStatus}`,
          updated: true,
          status_code: status_code as ShipmentStatus,
          newStatus,
          newBucket: bucket,
          events,
        };
      }

      return {
        success: true,
        message: 'Tracking data retrieved but no status change',
        updated: false,
        status_code: shipment.status as ShipmentStatus,
        newStatus: shipment.status,
        newBucket: shipment.bucket || undefined,
        events,
      };
    } catch (error) {
      this.fastify.log.error(`Error tracking shipment ${shipmentId}: ${error}`);
      return {
        success: false,
        message: `Error tracking shipment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updated: false,
      };
    }
  }

  /**
   * Create an NDR (Non-Delivery Report) record
   * @param data NDR data
   * @param userId User ID
   * @returns Promise resolving to creation result
   */
  async createNDRRecord(
    data: any,
    userId: string
  ): Promise<{
    success: boolean;
    message: string;
    ndr?: any;
  }> {
    try {
      const { shipment_id, order_id, reason, comment } = data;

      // Validate shipment exists and belongs to user
      const shipment = await this.fastify.prisma.shipment.findFirst({
        where: {
          id: shipment_id,
          order: {
            user_id: userId,
          },
        },
        include: {
          order: {
            include: {
              customer: true,
            },
          },
        },
      });

      if (!shipment) {
        return {
          success: false,
          message: 'Shipment not found or access denied',
        };
      }

      // Create NDR record
      const ndr = await this.fastify.prisma.nDROrder.create({
        data: {
          shipment_id,
          order_id: order_id || shipment.order_id,
          customer_id: shipment.order.customer_id,
          awb: shipment.awb || '',
          cancellation_reason: reason || 'Customer not available',
          ndr_raised_at: new Date(),
          action_taken: false,
        },
      });

      return {
        success: true,
        message: 'NDR record created successfully',
        ndr,
      };
    } catch (error) {
      this.fastify.log.error('Error creating NDR record:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create NDR record',
      };
    }
  }

  /**
   * Get NDR orders for a user
   * @param userId User ID
   * @param page Page number
   * @param limit Items per page
   * @param status Filter by status
   * @param awb Filter by AWB
   * @param startDate Filter by start date
   * @param endDate Filter by end date
   * @param actionTaken Filter by action taken status
   * @returns Promise resolving to NDR orders
   */
  async getNDROrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    awb?: string,
    startDate?: Date,
    endDate?: Date,
    actionTaken?: boolean
  ): Promise<{
    success: boolean;
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      // Build filter conditions for NDROrder
      const where: any = {
        order: {
          user_id: userId,
        },
      };

      if (actionTaken !== undefined) {
        where.action_taken = actionTaken;
      }

      if (awb) {
        where.awb = {
          contains: awb,
          mode: 'insensitive',
        };
      }

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = startDate;
        if (endDate) where.created_at.lte = endDate;
      }

      // Get total count
      const total = await this.fastify.prisma.nDROrder.count({ where });

      // Get NDR records
      const ndrOrders = await this.fastify.prisma.nDROrder.findMany({
        where,
        include: {
          shipment: {
            include: {
              courier: true,
            },
          },
          order: {
            include: {
              customer: true,
            },
          },
          customer: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: ndrOrders,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.fastify.log.error('Error getting NDR orders:', error);
      return {
        success: false,
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }

  /**
   * Take action on an NDR order
   * @param ndrId NDR record ID
   * @param actionType Type of action (reattempt, return, cancel)
   * @param comment Action comment
   * @param userId User ID
   * @returns Promise resolving to action result
   */
  async takeNDRAction(
    ndrId: string,
    actionType: 'reattempt' | 'return' | 'cancel',
    comment: string,
    userId: string
  ): Promise<{
    success: boolean;
    message: string;
    ndr?: any;
  }> {
    try {
      // Validate NDR exists and belongs to user
      const ndr = await this.fastify.prisma.nDROrder.findFirst({
        where: {
          id: ndrId,
          order: {
            user_id: userId,
          },
        },
        include: {
          shipment: true,
          order: true,
        },
      });

      if (!ndr) {
        return {
          success: false,
          message: 'NDR record not found or access denied',
        };
      }

      if (ndr.action_taken) {
        return {
          success: false,
          message: 'Action has already been taken on this NDR',
        };
      }

      // Update NDR record
      const updatedNdr = await this.fastify.prisma.nDROrder.update({
        where: { id: ndrId },
        data: {
          action_type: actionType,
          action_comment: comment,
          action_taken: true,
          action_date: new Date(),
          updated_at: new Date(),
        },
      });

      // Handle different action types
      let message = '';
      switch (actionType) {
        case 'reattempt':
          // Logic for reattempt (could involve scheduling pickup again)
          message = 'Reattempt delivery has been scheduled';
          break;
        case 'return':
          // Logic for return (could involve updating shipment status)
          if (ndr.shipment) {
            await this.fastify.prisma.shipment.update({
              where: { id: ndr.shipment_id! },
              data: {
                status: ShipmentStatus.RTO_INITIATED,
                updated_at: new Date(),
              },
            });
          }
          message = 'Return to origin has been initiated';
          break;
        case 'cancel':
          // Logic for cancellation
          if (ndr.shipment) {
            await this.fastify.prisma.shipment.update({
              where: { id: ndr.shipment_id! },
              data: {
                status: ShipmentStatus.CANCELLED_SHIPMENT,
                updated_at: new Date(),
              },
            });
          }
          message = 'Shipment has been cancelled';
          break;
      }

      return {
        success: true,
        message,
        ndr: updatedNdr,
      };
    } catch (error) {
      this.fastify.log.error('Error taking NDR action:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to take action on NDR',
      };
    }
  }
}
