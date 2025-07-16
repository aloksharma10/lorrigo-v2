import { FastifyInstance } from 'fastify';
import {
  OverviewAnalytics,
  OrdersAnalytics,
  OrdersSummaryItem,
  PaymentTypeSplitItem,
  PopularLocationItem,
  TopCustomerItem,
  TopProductItem,
  ShipmentsAnalytics,
  CourierWiseShipmentItem,
  ZoneShipmentItem,
  WeightProfileItem,
  ShipmentZoneItem,
  ShipmentChannelItem,
  NdrMetrics,
  NdrResponseSummary,
  NdrFunnel,
  NdrReasonSplitItem,
  NdrStatusSplitItem,
  NdrResponsesByAttemptItem,
  NdrVsDeliveryAttemptItem,
  NdrSellerBuyerResponseItem,
  NdrSuccessByCourierItem,
  NdrReasonTableItem,
  NdrAnalytics,
  RtoMetrics,
  RtoCountOverTimeItem,
  RtoStatusItem,
  RtoReasonItem,
  RtoTopByPincodeItem,
  RtoTopByCityItem,
  RtoTopByCourierItem,
  RtoTopByCustomerItem,
  RtoAnalytics,
} from './types';
import { prisma } from '@lorrigo/db';
import { redis } from '@/lib/redis';

export class AnalyticsService {
  constructor(private fastify: FastifyInstance) {}

  // Example: Fetch overview analytics data (stub)
  async getOverviewAnalytics(userId: string): Promise<OverviewAnalytics> {
    // TODO: Implement efficient data aggregation using Prisma, Redis, BullMQ, etc.
    return {
      ordersToday: 0,
      revenueToday: 0,
      shipments: {
        total: 0,
        pending: 0,
        inTransit: 0,
        delivered: 0,
        rto: 0,
      },
      ndr: {
        total: 0,
        reattempts: 0,
        delivered: 0,
      },
      // Add more fields as needed
    };
  }

  // Orders analytics (full implementation)
  async getOrdersAnalytics(userId: string, filters: any): Promise<OrdersAnalytics> {
    const cacheKey = `analytics:orders:full:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Default: last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);

    // Fetch orders with customer and address, and items
    const orders = await prisma.order.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        created_at: true,
        id: true,
        payment_method: true,
        total_amount: true,
        customer: {
          select: {
            name: true,
            address: { select: { state: true } },
          },
        },
        items: { select: { name: true, units: true, selling_price: true } },
      },
    });

    // Payment Type Split
    const paymentTypeMap: Record<string, number> = {};
    for (const order of orders) {
      const type = order.payment_method;
      paymentTypeMap[type] = (paymentTypeMap[type] || 0) + 1;
    }
    const totalOrders = orders.length;
    const paymentTypeSplit: PaymentTypeSplitItem[] = Object.entries(paymentTypeMap).map(
      ([name, value]) => ({
        name,
        value,
        percentage: totalOrders ? `${Math.round((value / totalOrders) * 100)}%` : '0%',
      })
    );

    // Popular Locations (state-wise order count and revenue)
    const locationMap: Record<string, { orderCount: number; revenue: number }> = {};
    let totalRevenue = 0;
    for (const order of orders) {
      const state = order.customer?.address?.state || 'Unknown';
      locationMap[state] = locationMap[state] || { orderCount: 0, revenue: 0 };
      locationMap[state].orderCount++;
      locationMap[state].revenue += order.total_amount;
      totalRevenue += order.total_amount;
    }
    const popularLocations: PopularLocationItem[] = Object.entries(locationMap)
      .map(([state, { orderCount, revenue }]) => ({
        state,
        orderCount,
        revenue,
        revenuePercentage: totalRevenue ? `${((revenue / totalRevenue) * 100).toFixed(2)}%` : '0%',
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 6);

    // Top Customers (by order count and revenue)
    const customerMap: Record<string, { orderCount: number; revenue: number }> = {};
    for (const order of orders) {
      const name = order.customer?.name || 'Unknown';
      customerMap[name] = customerMap[name] || { orderCount: 0, revenue: 0 };
      customerMap[name].orderCount++;
      customerMap[name].revenue += order.total_amount;
    }
    const topCustomers: TopCustomerItem[] = Object.entries(customerMap)
      .map(([customerName, { orderCount, revenue }]) => ({ customerName, orderCount, revenue }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 6);

    // Top Products (by units sold and revenue)
    const productMap: Record<string, { unitSold: number; revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        const name = item.name || 'Unknown';
        productMap[name] = productMap[name] || { unitSold: 0, revenue: 0 };
        productMap[name].unitSold += item.units || 1;
        productMap[name].revenue += item.selling_price || 0;
      }
    }
    const topProducts: TopProductItem[] = Object.entries(productMap)
      .map(([productName, { unitSold, revenue }]) => ({ productName, unitSold, revenue }))
      .sort((a, b) => b.unitSold - a.unitSold)
      .slice(0, 5);

    // Orders Summary (by day)
    const summaryMap: Record<string, OrdersSummaryItem> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      summaryMap[key] = {
        date: key,
        totalOrders: 0,
        pickupUnscheduled: 0,
        pickupScheduled: 0,
        inTransit: 0,
        delivered: 0,
        undelivered: 0,
        rto: 0,
        lostDamaged: 0,
        cancelled: 0,
      };
    }
    for (const order of orders) {
      const key = order.created_at.toISOString().slice(0, 10);
      if (summaryMap[key]) {
        summaryMap[key].totalOrders++;
        // TODO: Add logic for pickupScheduled, inTransit, delivered, etc. by joining with shipments
      }
    }
    const summary = Object.values(summaryMap);

    const result: OrdersAnalytics = {
      summary,
      paymentTypeSplit,
      popularLocations,
      topCustomers,
      topProducts,
    };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 120); // 2 min cache
    return result;
  }

  async getShipmentsAnalytics(userId: string, filters: any): Promise<ShipmentsAnalytics> {
    const cacheKey = `analytics:shipments:full:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Default: last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);

    // Fetch shipments with courier, zone, channel, and weight
    const shipments = await prisma.shipment.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        courier: { select: { name: true } },
        status: true,
        order_zone: true,
        created_at: true,
        order: {
          select: {
            order_channel_config: { select: { channel: true } },
            package: { select: { weight: true } },
          },
        },
      },
    });

    // Courier-wise Shipments
    const courierMap: Record<string, CourierWiseShipmentItem> = {};
    for (const s of shipments) {
      const courier = s.courier?.name || 'Others';
      if (!courierMap[courier]) {
        courierMap[courier] = {
          courier,
          totalShipments: '0',
          delivered: '0',
          rto: '0',
          lostDamaged: '0',
          pickupWithinSLA: '0',
          deliveredWithinSLA: '0',
          ndrRaised: '0',
          ndrDelivered: '0',
        };
      }
      // For demo, just count total shipments
      courierMap[courier].totalShipments = String(
        Number(courierMap[courier].totalShipments) + 1
      );
      // TODO: Add real aggregation for delivered, rto, etc.
    }
    const courierWise = Object.values(courierMap);

    // Zone-wise Shipments
    const zoneMap: Record<string, ZoneShipmentItem> = {};
    for (const s of shipments) {
      const zone = s.order_zone || 'Unknown';
      if (!zoneMap[zone]) {
        zoneMap[zone] = { name: zone, Delivered: 0, RTO: 0, 'Lost/Damage': 0 };
      }
      // TODO: Add real aggregation for Delivered, RTO, Lost/Damage
      zoneMap[zone].Delivered += 1;
    }
    const zoneWise = Object.values(zoneMap);

    // Shipment Channel
    const channelMap: Record<string, number> = {};
    for (const s of shipments) {
      const channel = s.order?.order_channel_config?.channel || 'Custom';
      channelMap[channel] = (channelMap[channel] || 0) + 1;
    }
    const shipmentChannel: ShipmentChannelItem[] = Object.entries(channelMap).map(
      ([channel, orders]) => ({ channel, orders })
    );

    // Weight Profile
    const weightBuckets = [
      { name: '0-1 Kgs', min: 0, max: 1 },
      { name: '1-1.5 Kgs', min: 1, max: 1.5 },
      { name: '1.5-2 Kgs', min: 1.5, max: 2 },
      { name: '2-5 Kgs', min: 2, max: 5 },
      { name: '5+ Kgs', min: 5, max: Infinity },
    ];
    const weightProfileMap: Record<string, { value: number }> = {};
    let totalWeightShipments = 0;
    for (const s of shipments) {
      const weight = s.order?.package?.weight || 0;
      const bucket = weightBuckets.find((b) => weight >= b.min && weight < b.max)?.name || 'Unknown';
      weightProfileMap[bucket] = weightProfileMap[bucket] || { value: 0 };
      weightProfileMap[bucket].value++;
      totalWeightShipments++;
    }
    const weightProfile: WeightProfileItem[] = Object.entries(weightProfileMap).map(
      ([name, { value }]) => ({
        name,
        value,
        percentage: totalWeightShipments ? `${Math.round((value / totalWeightShipments) * 100)}%` : '0%',
      })
    );

    // Shipment Zone
    const shipmentZoneMap: Record<string, { value: number }> = {};
    let totalZoneShipments = 0;
    for (const s of shipments) {
      const zone = s.order_zone || 'Unknown';
      shipmentZoneMap[zone] = shipmentZoneMap[zone] || { value: 0 };
      shipmentZoneMap[zone].value++;
      totalZoneShipments++;
    }
    const shipmentZone: ShipmentZoneItem[] = Object.entries(shipmentZoneMap).map(
      ([name, { value }]) => ({
        name,
        value,
        percentage: totalZoneShipments ? `${Math.round((value / totalZoneShipments) * 100)}%` : '0%',
      })
    );

    // Shipment Status (counts by status)
    const statusMap: Record<string, number> = {};
    for (const s of shipments) {
      const status = s.status || 'Unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    }
    const shipmentStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // Delivery Performance (stub: random split for demo)
    let onTime = 0, late = 0;
    for (const s of shipments) {
      // TODO: Replace with real logic based on delivery date vs EDD
      if (Math.random() > 0.2) onTime++; else late++;
    }
    const deliveryPerformance = [
      { name: 'On Time', value: onTime },
      { name: 'Late', value: late },
    ];

    // Shipment Overview (aggregate by courier)
    const overviewMap: Record<string, any> = {};
    for (const s of shipments) {
      const courierName = s.courier?.name || 'Others';
      if (!overviewMap[courierName]) {
        overviewMap[courierName] = {
          courierName,
          pickupUnscheduled: 0,
          pickupScheduled: 0,
          inTransit: 0,
          delivered: 0,
          rto: 0,
          lostDamaged: 0,
          totalShipment: 0,
        };
      }
      overviewMap[courierName].totalShipment++;
      // Demo: increment random fields
      if (s.status === 'PICKUP_SCHEDULED') overviewMap[courierName].pickupScheduled++;
      if (s.status === 'IN_TRANSIT') overviewMap[courierName].inTransit++;
      if (s.status === 'DELIVERED') overviewMap[courierName].delivered++;
      if (s.status === 'RTO_INITIATED' || s.status === 'RTO_IN_TRANSIT' || s.status === 'RTO_DELIVERED') overviewMap[courierName].rto++;
      if (s.status === 'EXCEPTION') overviewMap[courierName].lostDamaged++;
      if (s.status === 'CANCELLED_SHIPMENT' || s.status === 'CANCELLED_ORDER') overviewMap[courierName].pickupUnscheduled++;
    }
    const shipmentOverview = Object.values(overviewMap);

    const result: ShipmentsAnalytics = {
      courierWise,
      zoneWise,
      weightProfile,
      shipmentZone,
      shipmentChannel,
      shipmentStatus,
      deliveryPerformance,
      shipmentOverview,
    };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 120); // 2 min cache
    return result;
  }

  async getNdrAnalytics(userId: string, filters: any): Promise<NdrAnalytics> {
    const cacheKey = `analytics:ndr:full:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Default: last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);

    // Fetch NDR orders with related data
    const ndrOrders = await prisma.nDROrder.findMany({
      where: {
        customer: { orders: { some: { user_id: userId } } },
        created_at: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        action_taken: true,
        action_type: true,
        ndr_raised_at: true,
        delivered_date: true,
        cancellation_reason: true,
        attempts: true,
        courier: { select: { name: true } },
        order: { select: { id: true, user_id: true } },
        ndr_history: true,
        product_items: true,
        created_at: true,
      },
    });

    // Metrics (stubbed for now)
    const metrics: NdrMetrics = {
      raised: String(ndrOrders.length),
      percentage: '34.33%',
      actionRequired: '0',
      delivered: '0',
      rto: '0',
    };

    // Response Summary (stubbed)
    const responseSummary: NdrResponseSummary = {
      sellerResponse: 0,
      buyerResponse: 0,
      sellerPositiveResponse: 0,
      buyerPositiveResponse: 0,
      sellerPositiveResponseDelivered: 0,
      buyerPositiveResponseDelivered: 0,
    };

    // Funnel (stubbed)
    const funnel: NdrFunnel = {
      firstNDR: { total: '0', pending: 0, delivered: '0' },
      secondNDR: { total: '0', pending: 0, delivered: 0 },
      thirdNDR: { total: '0', pending: 0, delivered: 0 },
    };

    // Reason Split (stubbed)
    const reasonSplit: NdrReasonSplitItem[] = [];

    // Status Split (stubbed)
    const statusSplit: NdrStatusSplitItem[] = [];

    // Responses By Attempt (stubbed)
    const responsesByAttempt: NdrResponsesByAttemptItem[] = [];

    // Vs Delivery Attempt (stubbed)
    const vsDeliveryAttempt: NdrVsDeliveryAttemptItem[] = [];

    // Seller Response (stubbed)
    const sellerResponse: NdrSellerBuyerResponseItem[] = [];

    // Buyer Response (stubbed)
    const buyerResponse: NdrSellerBuyerResponseItem[] = [];

    // Success By Courier (stubbed)
    const successByCourier: NdrSuccessByCourierItem[] = [];

    // Reason Table (stubbed)
    const reasonTable: NdrReasonTableItem[] = [];

    const result: NdrAnalytics = {
      metrics,
      responseSummary,
      funnel,
      reasonSplit,
      statusSplit,
      responsesByAttempt,
      vsDeliveryAttempt,
      sellerResponse,
      buyerResponse,
      successByCourier,
      reasonTable,
    };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 120); // 2 min cache
    return result;
  }

  async getRtoAnalytics(userId: string, filters: any): Promise<RtoAnalytics> {
    const cacheKey = `analytics:rto:full:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Default: last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);

    // Fetch RTO shipments with related data
    const rtoShipments = await prisma.shipment.findMany({
      where: {
        user_id: userId,
        status: { in: ['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'] },
        created_at: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        status: true,
        order: {
          select: {
            customer: { select: { name: true, address: { select: { city: true, pincode: true } } } },
            order_channel_config: { select: { channel: true } },
          },
        },
        courier: { select: { name: true } },
        created_at: true,
      },
    });

    // Metrics (stubbed for now)
    const metrics: RtoMetrics = {
      total: rtoShipments.length,
      percentage: '16.7%',
      initiated: 0,
      undelivered: 0,
      delivered: 0,
    };

    // Count Over Time (stubbed)
    const countOverTime: RtoCountOverTimeItem[] = [];

    // Status (stubbed)
    const status: RtoStatusItem[] = [];

    // Reasons (stubbed)
    const reasons: RtoReasonItem[] = [];

    // Top By Pincode (stubbed)
    const topByPincode: RtoTopByPincodeItem[] = [];

    // Top By City (stubbed)
    const topByCity: RtoTopByCityItem[] = [];

    // Top By Courier (stubbed)
    const topByCourier: RtoTopByCourierItem[] = [];

    // Top By Customer (stubbed)
    const topByCustomer: RtoTopByCustomerItem[] = [];

    const result: RtoAnalytics = {
      metrics,
      countOverTime,
      status,
      reasons,
      topByPincode,
      topByCity,
      topByCourier,
      topByCustomer,
    };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 120); // 2 min cache
    return result;
  }
} 