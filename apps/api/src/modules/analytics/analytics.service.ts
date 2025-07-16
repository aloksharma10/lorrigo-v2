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

  async getOverviewAnalytics(userId: string): Promise<OverviewAnalytics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Orders today
    const ordersToday = await prisma.order.count({
      where: {
        user_id: userId,
        created_at: { gte: today, lte: tomorrow },
      },
    });

    // Revenue today
    const revenueTodayAgg = await prisma.order.aggregate({
      where: {
        user_id: userId,
        created_at: { gte: today, lte: tomorrow },
      },
      _sum: { total_amount: true },
    });
    const revenueToday = revenueTodayAgg._sum.total_amount || 0;

    // Shipments
    const shipments = await prisma.shipment.findMany({
      where: { user_id: userId },
      select: { status: true },
    });
    const shipmentStats = {
      total: shipments.length,
      pending: shipments.filter(s => s.status === 'PICKUP_SCHEDULED').length,
      inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
      delivered: shipments.filter(s => s.status === 'DELIVERED').length,
      rto: shipments.filter(s => ['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(s.status)).length,
    };

    // NDR
    const ndrOrders = await prisma.nDROrder.findMany({
      where: { customer: { orders: { some: { user_id: userId } } } },
      select: { action_taken: true, delivered_date: true },
    });
    const ndrStats = {
      total: ndrOrders.length,
      reattempts: ndrOrders.filter(o => o.action_taken).length,
      delivered: ndrOrders.filter(o => o.delivered_date).length,
    };

    return {
      ordersToday,
      revenueToday,
      shipments: shipmentStats,
      ndr: ndrStats,
    };
  }

  async getOrdersAnalytics(userId: string, filters: any): Promise<OrdersAnalytics> {
    const cacheKey = `analytics:orders:full:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      this.fastify.log.info({ userId, cacheKey }, 'Cache hit for orders analytics');
      return JSON.parse(cached);
    }
    this.fastify.log.info({ userId, cacheKey }, 'Cache miss for orders analytics');

    // Default: last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        created_at: true,
        payment_method: true,
        total_amount: true,
        customer: {
          select: {
            name: true,
            address: { select: { state: true } },
          },
        },
        items: {
          select: {
            name: true,
            units: true,
            selling_price: true,
          },
        },
        shipment: {
          select: {
            status: true,
          },
        },
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
        productMap[name].revenue += (item.selling_price || 0) * (item.units || 1);
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
        const status = order.shipment?.status;
        if (status === 'NEW' || status === 'COURIER_ASSIGNED') summaryMap[key].pickupUnscheduled++;
        if (status === 'PICKUP_SCHEDULED' || status === 'OUT_FOR_PICKUP') summaryMap[key].pickupScheduled++;
        if (status === 'IN_TRANSIT' || status === 'OUT_FOR_DELIVERY') summaryMap[key].inTransit++;
        if (status === 'DELIVERED') summaryMap[key].delivered++;
        if (status === 'NDR') summaryMap[key].undelivered++;
        if (['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(status || '')) summaryMap[key].rto++;
        if (status === 'EXCEPTION') summaryMap[key].lostDamaged++;
        if (['CANCELLED_SHIPMENT', 'CANCELLED_ORDER'].includes(status || '')) summaryMap[key].cancelled++;
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
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 120);
    return result;
  }

  async getShipmentsAnalytics(userId: string, filters: any): Promise<ShipmentsAnalytics> {
    const cacheKey = `analytics:shipments:full:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      this.fastify.log.info({ userId, cacheKey }, 'Cache hit for shipments analytics');
      return JSON.parse(cached);
    }
    this.fastify.log.info({ userId, cacheKey }, 'Cache miss for shipments analytics');

    // Default: last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);

    // Fetch shipments with related data
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
        status: true,
        order_zone: true,
        created_at: true,
        pickup_date: true,
        edd: true,
        courier: { select: { name: true } },
        order: {
          select: {
            order_channel_config: { select: { channel: true } },
            package: { select: { weight: true } },
          },
        },
        ndr: { select: { id: true, delivered_date: true } },
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
      courierMap[courier].totalShipments = String(Number(courierMap[courier].totalShipments) + 1);
      if (s.status === 'DELIVERED') courierMap[courier].delivered = String(Number(courierMap[courier].delivered) + 1);
      if (['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(s.status)) {
        courierMap[courier].rto = String(Number(courierMap[courier].rto) + 1);
      }
      if (s.status === 'EXCEPTION') courierMap[courier].lostDamaged = String(Number(courierMap[courier].lostDamaged) + 1);
      if (s.pickup_date && s.created_at) {
        const pickupDiff = (s.pickup_date.getTime() - s.created_at.getTime()) / (1000 * 3600);
        if (pickupDiff <= 24) courierMap[courier].pickupWithinSLA = String(Number(courierMap[courier].pickupWithinSLA) + 1);
      }
      if (s.status === 'DELIVERED' && s.edd) {
        const deliveryDate = s.created_at; // Assuming created_at as delivery date for simplicity
        if (deliveryDate <= s.edd) {
          courierMap[courier].deliveredWithinSLA = String(Number(courierMap[courier].deliveredWithinSLA) + 1);
        }
      }
      if (s.ndr?.id) courierMap[courier].ndrRaised = String(Number(courierMap[courier].ndrRaised) + 1);
      if (s.ndr?.delivered_date) courierMap[courier].ndrDelivered = String(Number(courierMap[courier].ndrDelivered) + 1);
    }
    const courierWise = Object.values(courierMap);

    // Zone-wise Shipments
    const zoneMap: Record<string, ZoneShipmentItem> = {};
    for (const s of shipments) {
      const zone = s.order_zone || 'Unknown';
      if (!zoneMap[zone]) {
        zoneMap[zone] = { name: zone, Delivered: 0, RTO: 0, 'Lost/Damage': 0 };
      }
      if (s.status === 'DELIVERED') zoneMap[zone].Delivered++;
      if (['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(s.status)) zoneMap[zone].RTO++;
      if (s.status === 'EXCEPTION') zoneMap[zone]['Lost/Damage']++;
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

    // Shipment Status
    const statusMap: Record<string, number> = {};
    for (const s of shipments) {
      const status = s.status || 'Unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    }
    const shipmentStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // Delivery Performance
    let onTime = 0, late = 0;
    for (const s of shipments) {
      if (s.status === 'DELIVERED' && s.edd && s.created_at) {
        const deliveryDate = s.created_at; // Using created_at as proxy; update to actual delivery date if available
        if (deliveryDate <= s.edd) onTime++;
        else late++;
      }
    }
    const deliveryPerformance = [
      { name: 'On Time', value: onTime },
      { name: 'Late', value: late },
    ];

    // Shipment Overview
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
      if (['NEW', 'COURIER_ASSIGNED'].includes(s.status)) overviewMap[courierName].pickupUnscheduled++;
      if (['PICKUP_SCHEDULED', 'OUT_FOR_PICKUP'].includes(s.status)) overviewMap[courierName].pickupScheduled++;
      if (['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status)) overviewMap[courierName].inTransit++;
      if (s.status === 'DELIVERED') overviewMap[courierName].delivered++;
      if (['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(s.status)) overviewMap[courierName].rto++;
      if (s.status === 'EXCEPTION') overviewMap[courierName].lostDamaged++;
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
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 120);
    return result;
  }

  async getNdrAnalytics(userId: string, filters: any): Promise<NdrAnalytics> {
    const cacheKey = `analytics:ndr:full:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      this.fastify.log.info({ userId, cacheKey }, 'Cache hit for NDR analytics');
      return JSON.parse(cached);
    }
    this.fastify.log.info({ userId, cacheKey }, 'Cache miss for NDR analytics');

    // Default: last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);

    // Fetch NDR orders
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
        ndr_history: {
          select: {
            ndr_reason: true,
            action_by: true,
            ndr_attempt: true,
            comment: true,
            created_at: true,
          },
        },
      },
    });

    // Metrics
    const totalShipments = await prisma.shipment.count({
      where: { user_id: userId, created_at: { gte: startDate, lte: endDate } },
    });
    const metrics: NdrMetrics = {
      raised: String(ndrOrders.length),
      percentage: totalShipments ? `${((ndrOrders.length / totalShipments) * 100).toFixed(2)}%` : '0%',
      actionRequired: String(ndrOrders.filter(o => !o.action_taken).length),
      delivered: String(ndrOrders.filter(o => o.delivered_date).length),
      rto: String(ndrOrders.filter(o => o.cancellation_reason?.includes('RTO')).length),
    };

    // Response Summary
    const responseSummary: NdrResponseSummary = {
      sellerResponse: ndrOrders.filter(o => o.ndr_history.some(h => h.action_by === 1)).length,
      buyerResponse: ndrOrders.filter(o => o.ndr_history.some(h => h.action_by === 2)).length,
      sellerPositiveResponse: ndrOrders.filter(o => o.ndr_history.some(h => h.action_by === 1 && h.comment?.includes('ACCEPT'))).length,
      buyerPositiveResponse: ndrOrders.filter(o => o.ndr_history.some(h => h.action_by === 2 && h.comment?.includes('ACCEPT'))).length,
      sellerPositiveResponseDelivered: ndrOrders.filter(o => o.ndr_history.some(h => h.action_by === 1 && h.comment?.includes('ACCEPT')) && o.delivered_date).length,
      buyerPositiveResponseDelivered: ndrOrders.filter(o => o.ndr_history.some(h => h.action_by === 2 && h.comment?.includes('ACCEPT')) && o.delivered_date).length,
    };

    // Funnel
    const funnel: NdrFunnel = {
      firstNDR: {
        total: String(ndrOrders.filter(o => o.attempts === 1).length),
        pending: ndrOrders.filter(o => o.attempts === 1 && !o.delivered_date && !o.cancellation_reason).length,
        delivered: String(ndrOrders.filter(o => o.attempts === 1 && o.delivered_date).length),
      },
      secondNDR: {
        total: String(ndrOrders.filter(o => o.attempts === 2).length),
        pending: ndrOrders.filter(o => o.attempts === 2 && !o.delivered_date && !o.cancellation_reason).length,
        delivered: ndrOrders.filter(o => o.attempts === 2 && o.delivered_date).length,
      },
      thirdNDR: {
        total: String(ndrOrders.filter(o => o.attempts >= 3).length),
        pending: ndrOrders.filter(o => o.attempts >= 3 && !o.delivered_date && !o.cancellation_reason).length,
        delivered: ndrOrders.filter(o => o.attempts >= 3 && o.delivered_date).length,
      },
    };

    // Reason Split
    const reasonMap: Record<string, number> = {};
    for (const o of ndrOrders) {
      const reason = o.ndr_history[0]?.ndr_reason || 'Unknown';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    }
    const reasonSplit: NdrReasonSplitItem[] = Object.entries(reasonMap).map(([name, value]) => ({
      name,
      value,
      percentage: ndrOrders.length ? `${((value / ndrOrders.length) * 100).toFixed(2)}%` : '0%',
    }));

    // Status Split
    // NdrStatusSplitItem: { name, Delivered, RTO, Pending }
    const statusCounts: Record<string, { Delivered: number; RTO: number; Pending: number }> = {};
    for (const o of ndrOrders) {
      const status = o.delivered_date ? 'Delivered' : o.cancellation_reason ? 'RTO' : 'Pending';
      if (!statusCounts[status]) statusCounts[status] = { Delivered: 0, RTO: 0, Pending: 0 };
      if (status === 'Delivered' || status === 'RTO' || status === 'Pending') {
        statusCounts[status][status]++;
      }
    }
    const statusSplit: NdrStatusSplitItem[] = Object.entries(statusCounts).map(([name, counts]) => ({
      name,
      Delivered: counts.Delivered,
      RTO: counts.RTO,
      Pending: counts.Pending,
    }));

    // Responses By Attempt
    // NdrResponsesByAttemptItem: { category, ndrShipments, firstNDRAttempt, firstNDRDelivered, secondNDRAttempt, secondNDRDelivered, thirdNDRAttempt, thirdNDRDelivered, totalDelivered, totalRTO, lostDamaged }
    const responsesByAttempt: NdrResponsesByAttemptItem[] = [
      {
        category: 'First Attempt',
        ndrShipments: ndrOrders.filter(o => o.attempts === 1).length,
        firstNDRAttempt: ndrOrders.filter(o => o.attempts === 1).length,
        firstNDRDelivered: ndrOrders.filter(o => o.attempts === 1 && o.delivered_date).length,
        secondNDRAttempt: 0,
        secondNDRDelivered: 0,
        thirdNDRAttempt: 0,
        thirdNDRDelivered: 0,
        totalDelivered: ndrOrders.filter(o => o.delivered_date).length,
        totalRTO: ndrOrders.filter(o => o.cancellation_reason).length,
        lostDamaged: 0,
      },
      {
        category: 'Second Attempt',
        ndrShipments: ndrOrders.filter(o => o.attempts === 2).length,
        firstNDRAttempt: 0,
        firstNDRDelivered: 0,
        secondNDRAttempt: ndrOrders.filter(o => o.attempts === 2).length,
        secondNDRDelivered: ndrOrders.filter(o => o.attempts === 2 && o.delivered_date).length,
        thirdNDRAttempt: 0,
        thirdNDRDelivered: 0,
        totalDelivered: ndrOrders.filter(o => o.delivered_date).length,
        totalRTO: ndrOrders.filter(o => o.cancellation_reason).length,
        lostDamaged: 0,
      },
      {
        category: 'Third+ Attempt',
        ndrShipments: ndrOrders.filter(o => o.attempts >= 3).length,
        firstNDRAttempt: 0,
        firstNDRDelivered: 0,
        secondNDRAttempt: 0,
        secondNDRDelivered: 0,
        thirdNDRAttempt: ndrOrders.filter(o => o.attempts >= 3).length,
        thirdNDRDelivered: ndrOrders.filter(o => o.attempts >= 3 && o.delivered_date).length,
        totalDelivered: ndrOrders.filter(o => o.delivered_date).length,
        totalRTO: ndrOrders.filter(o => o.cancellation_reason).length,
        lostDamaged: 0,
      },
    ];

    // Vs Delivery Attempt
    // NdrVsDeliveryAttemptItem: { name, ndrRaised, deliveryAttempt }
    const vsDeliveryAttempt: NdrVsDeliveryAttemptItem[] = [
      {
        name: 'First Attempt',
        ndrRaised: ndrOrders.filter(o => o.attempts === 1).length,
        deliveryAttempt: ndrOrders.filter(o => o.attempts === 1 && o.delivered_date).length,
      },
      {
        name: 'Second Attempt',
        ndrRaised: ndrOrders.filter(o => o.attempts === 2).length,
        deliveryAttempt: ndrOrders.filter(o => o.attempts === 2 && o.delivered_date).length,
      },
      {
        name: 'Third+ Attempt',
        ndrRaised: ndrOrders.filter(o => o.attempts >= 3).length,
        deliveryAttempt: ndrOrders.filter(o => o.attempts >= 3 && o.delivered_date).length,
      },
    ];

    // Seller/Buyer Response
    // NdrSellerBuyerResponseItem: { name, ndr, sellerResponse?, buyerResponse? }
    const sellerResponse: NdrSellerBuyerResponseItem[] = [
      {
        name: 'Seller',
        ndr: ndrOrders.filter(o => o.ndr_history.some(h => h.action_by === 1)).length,
        sellerResponse: ndrOrders.filter(o => o.ndr_history.some(h => h.action_by === 1)).length,
      },
    ];
    const buyerResponse: NdrSellerBuyerResponseItem[] = [
      {
        name: 'Buyer',
        ndr: ndrOrders.filter(o => o.ndr_history.some(h => h.action_by === 2)).length,
        buyerResponse: ndrOrders.filter(o => o.ndr_history.some(h => h.action_by === 2)).length,
      },
    ];

    // Success By Courier
    // NdrSuccessByCourierItem: { name, total, zoneA, zoneB, zoneC, zoneD, zoneE }
    const successByCourierMap: Record<string, NdrSuccessByCourierItem> = {};
    for (const o of ndrOrders) {
      const courier = o.courier?.name || 'Others';
      if (!successByCourierMap[courier]) {
        successByCourierMap[courier] = {
          name: courier,
          total: 0,
          zoneA: 0,
          zoneB: 0,
          zoneC: 0,
          zoneD: 0,
          zoneE: 0,
        };
      }
      successByCourierMap[courier].total++;
      // You can add logic to increment zoneA-E based on order_zone if available
    }
    const successByCourier: NdrSuccessByCourierItem[] = Object.values(successByCourierMap);

    // Reason Table
    // NdrReasonTableItem: { reason, total, pending, delivered, rto, lostDamaged }
    const reasonTableMap: Record<string, NdrReasonTableItem> = {};
    for (const o of ndrOrders) {
      const reason = o.ndr_history[0]?.ndr_reason || 'Unknown';
      if (!reasonTableMap[reason]) {
        reasonTableMap[reason] = {
          reason,
          total: 0,
          pending: 0,
          delivered: 0,
          rto: 0,
          lostDamaged: 0,
        };
      }
      reasonTableMap[reason].total++;
      if (o.delivered_date) reasonTableMap[reason].delivered++;
      else if (o.cancellation_reason) reasonTableMap[reason].rto++;
      else reasonTableMap[reason].pending++;
    }
    const reasonTable: NdrReasonTableItem[] = Object.values(reasonTableMap);

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
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 120);
    return result;
  }

  async getRtoAnalytics(userId: string, filters: any): Promise<RtoAnalytics> {
    const cacheKey = `analytics:rto:full:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      this.fastify.log.info({ userId, cacheKey }, 'Cache hit for RTO analytics');
      return JSON.parse(cached);
    }
    this.fastify.log.info({ userId, cacheKey }, 'Cache miss for RTO analytics');

    // Default: last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);

    // Fetch RTO shipments
    const rtoShipments = await prisma.shipment.findMany({
      where: {
        user_id: userId,
        status: { in: ['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'] },
        created_at: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        status: true,
        created_at: true,
        cancel_reason: true,
        courier: { select: { name: true } },
        order: {
          select: {
            customer: { select: { name: true, address: { select: { city: true, pincode: true } } } },
            order_channel_config: { select: { channel: true } },
          },
        },
      },
    });

    // Metrics
    const totalShipments = await prisma.shipment.count({
      where: { user_id: userId, created_at: { gte: startDate, lte: endDate } },
    });
    const metrics: RtoMetrics = {
      total: rtoShipments.length,
      percentage: totalShipments ? `${((rtoShipments.length / totalShipments) * 100).toFixed(2)}%` : '0%',
      initiated: rtoShipments.filter(s => s.status === 'RTO_INITIATED').length,
      undelivered: rtoShipments.filter(s => s.status === 'RTO_IN_TRANSIT').length,
      delivered: rtoShipments.filter(s => s.status === 'RTO_DELIVERED').length,
    };

    // Count Over Time
    const countOverTimeMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      countOverTimeMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const s of rtoShipments) {
      const key = s.created_at.toISOString().slice(0, 10);
      if (typeof countOverTimeMap[key] === 'number') {
        countOverTimeMap[key]++;
      } else {
        countOverTimeMap[key] = 1;
      }
    }
    // RTO Analytics
    // RtoCountOverTimeItem: { name, rtoCount }
    const countOverTime: RtoCountOverTimeItem[] = Object.entries(countOverTimeMap).map(([date, count]) => ({
      name: date,
      rtoCount: count ?? 0,
    }));

    // Status
    const statusMap: Record<string, number> = {};
    for (const s of rtoShipments) {
      const status = s.status;
      statusMap[status] = (statusMap[status] || 0) + 1;
    }
    const status: RtoStatusItem[] = Object.entries(statusMap).map(([name, count]) => ({
      name,
      rtoInitiated: name === 'RTO_INITIATED' ? count : 0,
      rtoDelivered: name === 'RTO_DELIVERED' ? count : 0,
      rtoUndelivered: name === 'RTO_IN_TRANSIT' ? count : 0,
    }));

    // Reasons
    const reasonMap: Record<string, number> = {};
    for (const s of rtoShipments) {
      const reason = s.cancel_reason || 'Unknown';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    }
    const reasons: RtoReasonItem[] = Object.entries(reasonMap).map(([reason, count]) => ({
      name: reason,
      value: count,
      percentage: rtoShipments.length ? `${((count / rtoShipments.length) * 100).toFixed(2)}%` : '0%',
    }));

    // Top By Pincode
    const pincodeMap: Record<string, { count: number; city: string }> = {};
    for (const s of rtoShipments) {
      const pincode = s.order?.customer?.address?.pincode || 'Unknown';
      const city = s.order?.customer?.address?.city || 'Unknown';
      pincodeMap[pincode] = pincodeMap[pincode] || { count: 0, city };
      pincodeMap[pincode].count++;
    }
    const topByPincode: RtoTopByPincodeItem[] = Object.entries(pincodeMap)
      .map(([pincode, { count }]) => ({
        pincode,
        rtoCount: count,
        percentage: rtoShipments.length ? `${((count / rtoShipments.length) * 100).toFixed(2)}%` : '0%',
      }))
      .sort((a, b) => b.rtoCount - a.rtoCount)
      .slice(0, 5);

    // Top By City
    const cityMap: Record<string, number> = {};
    for (const s of rtoShipments) {
      const city = s.order?.customer?.address?.city || 'Unknown';
      cityMap[city] = (cityMap[city] || 0) + 1;
    }
    const topByCity: RtoTopByCityItem[] = Object.entries(cityMap)
      .map(([city, count]) => ({
        city,
        rtoCount: count,
        percentage: rtoShipments.length ? `${((count / rtoShipments.length) * 100).toFixed(2)}%` : '0%',
      }))
      .sort((a, b) => b.rtoCount - a.rtoCount)
      .slice(0, 5);

    // Top By Courier
    const courierMap: Record<string, number> = {};
    for (const s of rtoShipments) {
      const courier = s.courier?.name || 'Others';
      courierMap[courier] = (courierMap[courier] || 0) + 1;
    }
    const topByCourier: RtoTopByCourierItem[] = Object.entries(courierMap)
      .map(([courier, count]) => ({
        name: courier,
        rtoCount: count,
        percentage: rtoShipments.length ? `${((count / rtoShipments.length) * 100).toFixed(2)}%` : '0%',
      }))
      .sort((a, b) => b.rtoCount - a.rtoCount)
      .slice(0, 5);

    // Top By Customer
    const customerMap: Record<string, { count: number; name: string }> = {};
    for (const s of rtoShipments) {
      const customerName = s.order?.customer?.name || 'Unknown';
      customerMap[customerName] = customerMap[customerName] || { count: 0, name: customerName };
      customerMap[customerName].count++;
    }
    const topByCustomer: RtoTopByCustomerItem[] = Object.entries(customerMap)
      .map(([_, entry = { count: 0, name: '' }]) => ({
        name: entry.name ?? '',
        rtoCount: entry.count ?? 0,
        percentage: rtoShipments.length ? `${((entry.count ?? 0) / rtoShipments.length * 100).toFixed(2)}%` : '0%',
      }))
      .sort((a, b) => b.rtoCount - a.rtoCount)
      .slice(0, 5);

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
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 120);
    return result;
  }
}