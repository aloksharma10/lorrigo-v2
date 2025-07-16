import { FastifyInstance } from 'fastify';
import { prisma } from '@lorrigo/db';
import { Redis } from 'ioredis';
import {
  HomePageAnalytics,
  ShipmentPerformanceAnalytics,
  RealTimeAnalytics,
  PredictiveAnalytics,
  ShipmentAnalysisFilters,
  CACHE_KEYS,
  ShipmentAnalysisJobType,
  OptimizedQueryParams,
  QueryResult,
  PerformanceMetrics,
  HomeSummaryItem,
  ActionItem,
  UpcomingPickupItem,
  KycStatusItem,
  ShipmentOverviewMetrics,
  CourierPerformanceItem,
  ZonePerformanceItem,
  StatusDistributionItem,
  DeliveryTimelineItem,
  WeightAnalysisItem,
  ChannelAnalysisItem,
  TopIssueItem,
  SystemAlertItem,
  DeliveryPredictionItem,
  RtoPredictionItem,
  DemandForecastItem,
  CourierRecommendationItem,
} from './types';

export class ShipmentAnalysisService {
  private fastify: FastifyInstance;
  private cacheExpiry = {
    home: 300, // 5 minutes
    performance: 600, // 10 minutes
    realTime: 60, // 1 minute
    predictive: 1800, // 30 minutes
  };

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Get comprehensive home page analytics with intelligent caching
   */
  async getHomePageAnalytics(userId: string): Promise<HomePageAnalytics> {
    const cacheKey = CACHE_KEYS.HOME_ANALYTICS(userId);
    const redis = this.fastify.redis as Redis;

    // Try to get from cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch fresh data
    const [summary, actionItems, upcomingPickups, kycStatus] = await Promise.all([
      this.getHomeSummary(userId),
      this.getActionItems(userId),
      this.getUpcomingPickups(userId),
      this.getKycStatus(userId),
    ]);

    const result: HomePageAnalytics = {
      summary,
      actionItems,
      upcomingPickups,
      kycStatus,
    };

    // Cache the result
    await redis.setex(cacheKey, this.cacheExpiry.home, JSON.stringify(result));

    return result;
  }

  async getShipmentPerformanceAnalytics(
    userId: string,
    filters: ShipmentAnalysisFilters = {}
  ): Promise<ShipmentPerformanceAnalytics> {
    const filtersHash = this.hashFilters(filters);
    const cacheKey = CACHE_KEYS.SHIPMENT_PERFORMANCE(userId, filtersHash);
    const redis = this.fastify.redis as Redis;

    // Try to get from cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Build query parameters
    const params = this.buildQueryParams(userId, filters);

    // Fetch fresh data
    const [
      overview,
      courierPerformance,
      zonePerformance,
      statusDistribution,
      deliveryTimeline,
      weightAnalysis,
      channelAnalysis,
      topIssues,
    ] = await Promise.all([
      this.getShipmentOverview(params),
      this.getCourierPerformance(params),
      this.getZonePerformance(params),
      this.getStatusDistribution(params),
      this.getDeliveryTimeline(params),
      this.getWeightAnalysis(params),
      this.getChannelAnalysis(params),
      this.getTopIssues(params),
    ]);

    // NDR analytics (real queries)
    const ndrOrders = await prisma.nDROrder.findMany({
      where: {
        customer: { orders: { some: { user_id: params.userId } } },
        created_at: { gte: params.startDate, lte: params.endDate },
      },
      select: {
        id: true,
        action_taken: true,
        cancellation_reason: true,
        delivered_date: true,
        attempts: true,
        courier: { select: { name: true } },
        ndr_history: true,
        product_items: true,
        order: { select: { id: true } },
      },
    });
    // ndrMetrics
    const ndrMetrics = {
      raised: ndrOrders.length,
      actionRequired: ndrOrders.filter(o => !o.action_taken).length,
      delivered: ndrOrders.filter(o => o.delivered_date).length,
      rto: ndrOrders.filter(o => o.cancellation_reason === 'RTO').length,
      percentage: ndrOrders.length > 0 ? ((ndrOrders.filter(o => o.cancellation_reason === 'RTO').length / ndrOrders.length) * 100).toFixed(2) + '%' : '0%',
    };
    // ndrResponseSummary
    const ndrResponseSummary = {
      sellerResponse: ndrOrders.filter(o => o.action_taken).length,
      buyerResponse: 0, // Not enough info in schema, set to 0 or implement if available
      sellerPositiveResponse: ndrOrders.filter(o => o.action_taken && o.cancellation_reason !== 'RTO').length,
      buyerPositiveResponse: 0, // Not enough info in schema
      sellerPositiveResponseDelivered: ndrOrders.filter(o => o.action_taken && o.delivered_date).length,
      buyerPositiveResponseDelivered: 0, // Not enough info in schema
    };
    // ndrFunnel
    const ndrFunnel = {
      firstNDR: {
        total: ndrOrders.filter(o => o.attempts === 1).length,
        pending: ndrOrders.filter(o => o.attempts === 1 && !o.action_taken).length,
        delivered: ndrOrders.filter(o => o.attempts === 1 && o.delivered_date).length,
      },
      secondNDR: {
        total: ndrOrders.filter(o => o.attempts === 2).length,
        pending: ndrOrders.filter(o => o.attempts === 2 && !o.action_taken).length,
        delivered: ndrOrders.filter(o => o.attempts === 2 && o.delivered_date).length,
      },
      thirdNDR: {
        total: ndrOrders.filter(o => o.attempts === 3).length,
        pending: ndrOrders.filter(o => o.attempts === 3 && !o.action_taken).length,
        delivered: ndrOrders.filter(o => o.attempts === 3 && o.delivered_date).length,
      },
    };
    // ndrReasonSplit
    const ndrReasonSplit = Object.entries(
      ndrOrders.reduce((acc, o) => {
        const reason = o.cancellation_reason || 'Unknown';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, percentage: ndrOrders.length > 0 ? ((value / ndrOrders.length) * 100).toFixed(2) + '%' : '0%' }));
    // ndrStatusSplit
    const ndrStatusSplit = [
      {
        name: 'NDR',
        Delivered: ndrOrders.filter(o => o.delivered_date).length,
        RTO: ndrOrders.filter(o => o.cancellation_reason === 'RTO').length,
        Pending: ndrOrders.filter(o => !o.action_taken).length,
      },
    ];
    // ndrResponsesByAttempt
    const ndrResponsesByAttempt = [
      {
        category: 'All',
        ndrShipments: ndrOrders.length,
        firstNDRAttempt: ndrOrders.filter(o => o.attempts === 1).length,
        firstNDRDelivered: ndrOrders.filter(o => o.attempts === 1 && o.delivered_date).length,
        secondNDRAttempt: ndrOrders.filter(o => o.attempts === 2).length,
        secondNDRDelivered: ndrOrders.filter(o => o.attempts === 2 && o.delivered_date).length,
        thirdNDRAttempt: ndrOrders.filter(o => o.attempts === 3).length,
        thirdNDRDelivered: ndrOrders.filter(o => o.attempts === 3 && o.delivered_date).length,
        totalDelivered: ndrOrders.filter(o => o.delivered_date).length,
        totalRTO: ndrOrders.filter(o => o.cancellation_reason === 'RTO').length,
        lostDamaged: 0, // Not enough info in schema
      },
    ];
    // ndrVsDeliveryAttempt
    const ndrVsDeliveryAttempt = [
      {
        name: 'NDR vs Delivery',
        ndrRaised: ndrOrders.length,
        deliveryAttempt: ndrOrders.reduce((sum, o) => sum + (o.attempts || 0), 0),
      },
    ];
    // sellerResponse, buyerResponse
    const sellerResponse = [
      {
        name: 'Seller',
        NDR: ndrOrders.length,
        sellerResponse: ndrOrders.filter(o => o.action_taken).length,
      },
    ];
    const buyerResponse = [
      {
        name: 'Buyer',
        NDR: ndrOrders.length,
        buyerResponse: 0, // Not enough info in schema
      },
    ];
    // successByCourier
    const courierMap = ndrOrders.reduce((acc, o) => {
      const name = o.courier?.name || 'Unknown';
      if (!acc[name]) acc[name] = { name, total: 0, zoneA: 0, zoneB: 0, zoneC: 0, zoneD: 0, zoneE: 0 };
      acc[name].total++;
      // No zone info in NDROrder, so leave zones as 0
      return acc;
    }, {} as Record<string, any>);
    const successByCourier = Object.values(courierMap);
    // ndrReason table
    const ndrReason = ndrReasonSplit.map(r => ({
      reason: r.name,
      total: r.value,
      pending: ndrOrders.filter(o => o.cancellation_reason === r.name && !o.action_taken).length,
      delivered: ndrOrders.filter(o => o.cancellation_reason === r.name && o.delivered_date).length,
      rto: ndrOrders.filter(o => o.cancellation_reason === r.name && o.cancellation_reason === 'RTO').length,
      lostDamaged: 0, // Not enough info in schema
    }));

    // RTO analytics (real queries)
    const rtoShipments = await prisma.shipment.findMany({
      where: {
        user_id: params.userId,
        status: { in: ['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'] },
        created_at: { gte: params.startDate, lte: params.endDate },
      },
      select: {
        id: true,
        status: true,
        order: { select: { customer: { select: { name: true, address: { select: { city: true, pincode: true } } } } } },
        courier: { select: { name: true } },
        created_at: true,
      },
    });
    // rtoMetrics
    const rtoMetrics = {
      total: rtoShipments.length,
      initiated: rtoShipments.filter(s => s.status === 'RTO_INITIATED').length,
      delivered: rtoShipments.filter(s => s.status === 'RTO_DELIVERED').length,
      undelivered: rtoShipments.filter(s => s.status === 'RTO_IN_TRANSIT').length,
      percentage: rtoShipments.length > 0 ? ((rtoShipments.filter(s => s.status === 'RTO_DELIVERED').length / rtoShipments.length) * 100).toFixed(2) + '%' : '0%',
    };
    // rtoCountOverTime
    const rtoCountByDate = rtoShipments.reduce((acc, s) => {
      const date = s.created_at.toISOString().slice(0, 10);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const rtoCountOverTime = Object.entries(rtoCountByDate).map(([name, rtoCount]) => ({ name, rtoCount }));
    // rtoStatus
    const rtoStatus = [
      {
        name: 'RTO',
        rtoInitiated: rtoMetrics.initiated,
        rtoDelivered: rtoMetrics.delivered,
        rtoUndelivered: rtoMetrics.undelivered,
      },
    ];
    // rtoReasons
    const rtoReasons = Object.entries(
      rtoShipments.reduce((acc, s) => {
        const reason = s.status || 'Unknown';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, percentage: rtoShipments.length > 0 ? ((value / rtoShipments.length) * 100).toFixed(2) + '%' : '0%' }));
    // rtoTopByPincode
    const pincodeMap = rtoShipments.reduce((acc, s) => {
      const pincode = s.order?.customer?.address?.pincode || 'Unknown';
      if (!acc[pincode]) acc[pincode] = { pincode, rtoCount: 0 };
      acc[pincode].rtoCount++;
      return acc;
    }, {} as Record<string, any>);
    const rtoTopByPincode = Object.values(pincodeMap).map((item: any) => ({ ...item, percentage: rtoMetrics.total > 0 ? ((item.rtoCount / rtoMetrics.total) * 100).toFixed(2) + '%' : '0%' }));
    // rtoTopByCity
    const cityMap = rtoShipments.reduce((acc, s) => {
      const city = s.order?.customer?.address?.city || 'Unknown';
      if (!acc[city]) acc[city] = { city, rtoCount: 0 };
      acc[city].rtoCount++;
      return acc;
    }, {} as Record<string, any>);
    const rtoTopByCity = Object.values(cityMap).map((item: any) => ({ ...item, percentage: rtoMetrics.total > 0 ? ((item.rtoCount / rtoMetrics.total) * 100).toFixed(2) + '%' : '0%' }));
    // rtoTopByCourier
    const courierRtoMap = rtoShipments.reduce((acc, s) => {
      const name = s.courier?.name || 'Unknown';
      if (!acc[name]) acc[name] = { name, rtoCount: 0 };
      acc[name].rtoCount++;
      return acc;
    }, {} as Record<string, any>);
    const rtoTopByCourier = Object.values(courierRtoMap).map((item: any) => ({ ...item, percentage: rtoMetrics.total > 0 ? ((item.rtoCount / rtoMetrics.total) * 100).toFixed(2) + '%' : '0%' }));
    // rtoTopByCustomer
    const customerRtoMap = rtoShipments.reduce((acc, s) => {
      const name = s.order?.customer?.name || 'Unknown';
      if (!acc[name]) acc[name] = { name, rtoCount: 0 };
      acc[name].rtoCount++;
      return acc;
    }, {} as Record<string, any>);
    const rtoTopByCustomer = Object.values(customerRtoMap).map((item: any) => ({ ...item, percentage: rtoMetrics.total > 0 ? ((item.rtoCount / rtoMetrics.total) * 100).toFixed(2) + '%' : '0%' }));

    const result: ShipmentPerformanceAnalytics = {
      overview,
      courierPerformance,
      zonePerformance,
      statusDistribution,
      deliveryTimeline,
      weightAnalysis,
      channelAnalysis,
      topIssues,
      ndrMetrics,
      ndrResponseSummary,
      ndrFunnel,
      ndrReasonSplit,
      ndrStatusSplit,
      ndrResponsesByAttempt,
      ndrVsDeliveryAttempt,
      sellerResponse,
      buyerResponse,
      successByCourier,
      ndrReason,
      rtoMetrics,
      rtoCountOverTime,
      rtoStatus,
      rtoReasons,
      rtoTopByPincode,
      rtoTopByCity,
      rtoTopByCourier,
      rtoTopByCustomer,
    };

    // Cache the result
    await redis.setex(cacheKey, this.cacheExpiry.performance, JSON.stringify(result));

    return result;
  }

  async getRealTimeAnalytics(userId: string): Promise<RealTimeAnalytics> {
    const cacheKey = CACHE_KEYS.REAL_TIME(userId);
    const redis = this.fastify.redis as Redis;

    // Try to get from cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch fresh data
    const [
      activeShipments,
      pendingPickups,
      inTransit,
      deliveredToday,
      rtoToday,
      ndrRaised,
      ndrResolved,
      systemAlerts,
    ] = await Promise.all([
      this.getActiveShipmentsCount(userId),
      this.getPendingPickupsCount(userId),
      this.getInTransitCount(userId),
      this.getDeliveredTodayCount(userId),
      this.getRtoTodayCount(userId),
      this.getNdrRaisedCount(userId),
      this.getNdrResolvedCount(userId),
      this.getSystemAlerts(userId),
    ]);

    const result: RealTimeAnalytics = {
      activeShipments,
      pendingPickups,
      inTransit,
      deliveredToday,
      rtoToday,
      ndrRaised,
      ndrResolved,
      systemAlerts,
    };

    // Cache the result
    await redis.setex(cacheKey, this.cacheExpiry.realTime, JSON.stringify(result));

    return result;
  }

  async getPredictiveAnalytics(userId: string): Promise<PredictiveAnalytics> {
    const cacheKey = CACHE_KEYS.PREDICTIVE(userId);
    const redis = this.fastify.redis as Redis;

    // Try to get from cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch fresh data
    const [
      deliveryPredictions,
      rtoPredictions,
      demandForecast,
      courierRecommendations,
    ] = await Promise.all([
      this.getBasicDeliveryPredictions(userId),
      this.getBasicRtoPredictions(userId),
      this.getBasicDemandForecast(userId),
      this.getBasicCourierRecommendations(userId),
    ]);

    const result: PredictiveAnalytics = {
      deliveryPredictions,
      rtoPredictions,
      demandForecast,
      courierRecommendations,
    };

    // Cache the result
    await redis.setex(cacheKey, this.cacheExpiry.predictive, JSON.stringify(result));

    return result;
  }

  // Private methods for data fetching

  private async getHomeSummary(userId: string): Promise<HomeSummaryItem[]> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [todayOrders, yesterdayOrders, todayRevenue, yesterdayRevenue] = await Promise.all([
      this.getOrdersCount(userId, today),
      this.getOrdersCount(userId, yesterday),
      this.getRevenue(userId, today),
      this.getRevenue(userId, yesterday),
    ]);

    return [
      {
        title: 'Orders Today',
        value: todayOrders.toString(),
        description: 'Total orders placed today',
        icon: 'truck',
        trend: {
          percentage: `${Math.abs(todayOrders - yesterdayOrders)}%`,
          direction: todayOrders >= yesterdayOrders ? 'up' : 'down',
        },
      },
      {
        title: 'Revenue Today',
        value: `₹${todayRevenue.toFixed(2)}`,
        description: 'Total revenue generated today',
        icon: 'currency-rupee',
        trend: {
          percentage: `${Math.abs(todayRevenue - yesterdayRevenue)}%`,
          direction: todayRevenue >= yesterdayRevenue ? 'up' : 'down',
        },
      },
      {
        title: 'Active Shipments',
        value: (await this.getActiveShipmentsCount(userId)).toString(),
        description: 'Shipments currently in transit',
        icon: 'truck-delivery',
        trend: {
          percentage: '0%',
          direction: 'neutral',
        },
      },
      {
        title: 'Pending Pickups',
        value: (await this.getPendingPickupsCount(userId)).toString(),
        description: 'Pickups scheduled for today',
        icon: 'clock-pause',
        trend: {
          percentage: '0%',
          direction: 'neutral',
        },
      },
    ];
  }

  private async getActionItems(userId: string): Promise<ActionItem[]> {
    const [
      delayedPickups,
      totalPickups,
      newOrders,
      totalOrders,
      ndrActionRequired,
      totalNdr,
      delayedDelivery,
      totalShipments,
      weightDiscrepancy,
      totalWeightDisputes,
    ] = await Promise.all([
      this.getDelayedPickupsCount(userId),
      prisma.shipment.count({ where: { user_id: userId, status: 'PICKUP_SCHEDULED' } }),
      this.getNewOrdersCount(userId),
      prisma.order.count({ where: { user_id: userId } }),
      this.getNdrActionRequiredCount(userId),
      prisma.nDROrder.count({ where: { customer: { orders: { some: { user_id: userId } } } } }),
      this.getDelayedDeliveryCount(userId),
      prisma.shipment.count({ where: { user_id: userId } }),
      this.getWeightDiscrepancyCount(userId),
      prisma.weightDispute.count({ where: { user_id: userId } }),
    ]);

    function percent(count: number, total: number) {
      if (!total || total === 0) return '0%';
      return `${((count / total) * 100).toFixed(1)}%`;
    }

    return [
      {
        title: 'Delayed Pickups',
        value: delayedPickups.toString(),
        percentage: percent(delayedPickups, totalPickups),
        description: 'Pickups scheduled but not completed',
        icon: 'clock-pause',
        priority: 'high',
        actionUrl: '/shipments?status=pickup_delayed',
      },
      {
        title: 'New Orders',
        value: newOrders.toString(),
        percentage: percent(newOrders, totalOrders),
        description: 'Orders without shipments',
        icon: 'truck',
        priority: 'medium',
        actionUrl: '/orders?status=new',
      },
      {
        title: 'NDR Action Required',
        value: ndrActionRequired.toString(),
        percentage: percent(ndrActionRequired, totalNdr),
        description: 'NDR orders needing attention',
        icon: 'device-tablet-exclamation',
        priority: 'high',
        actionUrl: '/ndr?action_required=true',
      },
      {
        title: 'Delayed Delivery',
        value: delayedDelivery.toString(),
        percentage: percent(delayedDelivery, totalShipments),
        description: 'Shipments past EDD',
        icon: 'truck-return',
        priority: 'medium',
        actionUrl: '/shipments?status=delayed',
      },
      {
        title: 'Weight Discrepancy',
        value: weightDiscrepancy.toString(),
        percentage: percent(weightDiscrepancy, totalWeightDisputes),
        description: 'Weight disputes to resolve',
        icon: 'alert-triangle',
        priority: 'low',
        actionUrl: '/weight-disputes',
      },
    ];
  }

  private async getUpcomingPickups(userId: string): Promise<UpcomingPickupItem[]> {
    const pickups = await prisma.shipment.findMany({
      where: {
        user_id: userId,
        status: 'PICKUP_SCHEDULED',
        pickup_date: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      },
      select: {
        id: true,
        order: {
          select: {
            id: true,
            customer: { select: { name: true } },
            seller_details: {
              select: {
                address: { select: { address: true } },
              },
            },
          },
        },
        pickup_date: true,
        courier: { select: { name: true } },
      },
      orderBy: { pickup_date: 'asc' },
      take: 10,
    });

    return pickups.map((pickup) => ({
      id: pickup.id,
      orderId: pickup.order.id,
      customerName: pickup.order.customer.name,
      pickupAddress: pickup.order.seller_details?.address?.address || 'Address not available',
      scheduledDate: pickup.pickup_date?.toISOString() || '',
      status: 'scheduled' as const,
      courierName: pickup.courier?.name || 'Unknown',
      priority: this.calculatePickupPriority(pickup.pickup_date),
    }));
  }

  private async getKycStatus(userId: string): Promise<KycStatusItem> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profile: {
          select: {
            kyc_submitted: true,
            kyc_verified: true,
            pan: true,
            adhaar: true,
            gst_no: true,
          },
        },
      },
    });

    const isCompleted = user?.profile?.kyc_verified || false;
    const pendingDocuments = [];
    if (!user?.profile?.pan) pendingDocuments.push('PAN Card');
    if (!user?.profile?.adhaar) pendingDocuments.push('Aadhaar Card');
    if (!user?.profile?.gst_no) pendingDocuments.push('GST Number');
    const completionPercentage = isCompleted ? 100 : (user?.profile?.kyc_submitted ? 75 : 0);
    const nextAction = isCompleted ? 'KYC completed' : 'Upload pending documents';

    return {
      isCompleted,
      completionPercentage,
      pendingDocuments,
      nextAction,
    };
  }

  // Optimized database query methods using Prisma

  private async getShipmentOverview(params: OptimizedQueryParams): Promise<ShipmentOverviewMetrics> {
    const shipments = await prisma.shipment.findMany({
      where: {
        user_id: params.userId,
        created_at: { gte: params.startDate, lte: params.endDate },
      },
      select: {
        id: true,
        status: true,
        updated_at: true,
        created_at: true,
        edd: true,
      },
    });

    const totalShipments = shipments.length;
    const delivered = shipments.filter(s => s.status === 'DELIVERED').length;
    const inTransit = shipments.filter(s => ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status)).length;
    const pending = shipments.filter(s => ['PICKUP_SCHEDULED', 'OUT_FOR_PICKUP'].includes(s.status)).length;
    const rto = shipments.filter(s => ['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(s.status)).length;
    const lostDamaged = shipments.filter(s => s.status === 'EXCEPTION').length;
    const onTimeDelivery = shipments.filter(s => s.status === 'DELIVERED' && s.updated_at && s.edd && s.updated_at <= s.edd).length;
    const delayedDelivery = shipments.filter(s => s.status === 'DELIVERED' && s.updated_at && s.edd && s.updated_at > s.edd).length;
    const deliveryTimes = shipments
      .filter(s => s.status === 'DELIVERED' && s.updated_at && s.created_at)
      .map(s => (s.updated_at!.getTime() - s.created_at!.getTime()) / (1000 * 60 * 60 * 24));
    const averageDeliveryTime = deliveryTimes.length > 0 ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length : 0;
    const successRate = totalShipments > 0 ? (delivered / totalShipments) * 100 : 0;

    return {
      totalShipments,
      delivered,
      inTransit,
      pending,
      rto,
      lostDamaged,
      onTimeDelivery,
      delayedDelivery,
      averageDeliveryTime,
      successRate,
    };
  }

  private async getCourierPerformance(params: OptimizedQueryParams): Promise<CourierPerformanceItem[]> {
    const shipments = await prisma.shipment.findMany({
      where: {
        user_id: params.userId,
        created_at: { gte: params.startDate, lte: params.endDate },
      },
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        edd: true,
        courier: { select: { id: true, name: true } },
        ndr: { select: { id: true, action_taken: true } },
      },
    });

    const groupedByCourier = shipments.reduce((acc, s) => {
      const courierId = s.courier?.id || 'unknown';
      const courierName = s.courier?.name || 'Unknown';
      if (!acc[courierId]) {
        acc[courierId] = {
          courierId,
          courierName,
          totalShipments: 0,
          delivered: 0,
          rto: 0,
          lostDamaged: 0,
          onTimeDelivery: 0,
          delayedDelivery: 0,
          successRate: 0,
          averageDeliveryTime: 0,
          ndrCount: 0,
          ndrResolved: 0,
          deliveryTimes: [] as number[],
        };
      }
      acc[courierId].totalShipments += 1;
      if (s.status === 'DELIVERED') acc[courierId].delivered += 1;
      if (['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(s.status)) acc[courierId].rto += 1;
      if (s.status === 'EXCEPTION') acc[courierId].lostDamaged += 1;
      if (s.status === 'DELIVERED' && s.updated_at && s.edd && s.updated_at <= s.edd) acc[courierId].onTimeDelivery += 1;
      if (s.status === 'DELIVERED' && s.updated_at && s.edd && s.updated_at > s.edd) acc[courierId].delayedDelivery += 1;
      if (s.updated_at && s.created_at && s.status === 'DELIVERED') {
        acc[courierId].deliveryTimes.push((s.updated_at.getTime() - s.created_at.getTime()) / (1000 * 60 * 60 * 24));
      }
      acc[courierId].ndrCount += s.ndr ? 1 : 0;
      acc[courierId].ndrResolved += s.ndr && s.ndr.action_taken ? 1 : 0;
      return acc;
    }, {} as Record<string, CourierPerformanceItem & { deliveryTimes: number[] }>);

    return Object.values(groupedByCourier).map(item => {
      const { deliveryTimes, ...rest } = item;
      return {
        ...rest,
        successRate: item.totalShipments > 0 ? (item.delivered / item.totalShipments) * 100 : 0,
        averageDeliveryTime: deliveryTimes.length > 0 ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length : 0,
      };
    }).sort((a, b) => b.totalShipments - a.totalShipments).slice(0, 10);
  }

  private async getZonePerformance(params: OptimizedQueryParams): Promise<ZonePerformanceItem[]> {
    const shipments = await prisma.shipment.findMany({
      where: {
        user_id: params.userId,
        created_at: { gte: params.startDate, lte: params.endDate },
      },
      select: {
        id: true,
        status: true,
        order_zone: true,
        created_at: true,
        updated_at: true,
      },
    });

    const groupedByZone = shipments.reduce((acc, s) => {
      const zone = s.order_zone || 'Unknown';
      if (!acc[zone]) {
        acc[zone] = {
          zone,
          totalShipments: 0,
          delivered: 0,
          rto: 0,
          lostDamaged: 0,
          successRate: 0,
          averageDeliveryTime: 0,
          topCouriers: [],
          deliveryTimes: [] as number[],
        };
      }
      acc[zone].totalShipments += 1;
      if (s.status === 'DELIVERED') acc[zone].delivered += 1;
      if (['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(s.status)) acc[zone].rto += 1;
      if (s.status === 'EXCEPTION') acc[zone].lostDamaged += 1;
      if (s.updated_at && s.created_at && s.status === 'DELIVERED') {
        acc[zone].deliveryTimes.push((s.updated_at.getTime() - s.created_at.getTime()) / (1000 * 60 * 60 * 24));
      }
      return acc;
    }, {} as Record<string, ZonePerformanceItem & { deliveryTimes: number[] }>);

    return Object.values(groupedByZone).map(item => {
      const { deliveryTimes, ...rest } = item;
      return {
        ...rest,
        successRate: item.totalShipments > 0 ? (item.delivered / item.totalShipments) * 100 : 0,
        averageDeliveryTime: deliveryTimes.length > 0 ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length : 0,
      };
    }).sort((a, b) => b.totalShipments - a.totalShipments);
  }

  private async getStatusDistribution(params: OptimizedQueryParams): Promise<StatusDistributionItem[]> {
    const shipments = await prisma.shipment.groupBy({
      by: ['status'],
      where: {
        user_id: params.userId,
        created_at: { gte: params.startDate, lte: params.endDate },
      },
      _count: { id: true },
    });

    const total = shipments.reduce((sum, s) => sum + s._count.id, 0) || 1;
    return shipments.map(s => ({
      status: s.status,
      count: s._count.id,
      percentage: (s._count.id / total) * 100,
      trend: 'stable' as const, // Implement trend logic if needed
    })).sort((a, b) => b.count - a.count);
  }

  private async getDeliveryTimeline(params: OptimizedQueryParams): Promise<DeliveryTimelineItem[]> {
    const shipments = await prisma.shipment.findMany({
      where: {
        user_id: params.userId,
        created_at: { gte: params.startDate, lte: params.endDate },
      },
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        edd: true,
      },
    });

    const groupedByDate = shipments.reduce((acc, s) => {
      const date = s.created_at.toISOString().slice(0, 10);
      if (!acc[date]) {
        acc[date] = { date, delivered: 0, delayed: 0, rto: 0, total: 0 };
      }
      acc[date].total += 1;
      if (s.status === 'DELIVERED') acc[date].delivered += 1;
      if (s.status === 'DELIVERED' && s.updated_at && s.edd && s.updated_at > s.edd) acc[date].delayed += 1;
      if (['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'].includes(s.status)) acc[date].rto += 1;
      return acc;
    }, {} as Record<string, DeliveryTimelineItem>);

    return Object.values(groupedByDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  }

  private async getWeightAnalysis(params: OptimizedQueryParams): Promise<WeightAnalysisItem[]> {
    const shipments = await prisma.shipment.findMany({
      where: {
        user_id: params.userId,
        created_at: { gte: params.startDate, lte: params.endDate },
      },
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: {
          select: {
            package: {
              select: { weight: true },
            },
          },
        },
      },
    });

    const totalShipments = shipments.length;
    const groupedByWeight = shipments.reduce((acc, s) => {
      const weight = s.order?.package?.weight || 0;
      const weightRange = weight <= 1 ? '0-1 Kgs' :
                         weight <= 1.5 ? '1-1.5 Kgs' :
                         weight <= 2 ? '1.5-2 Kgs' :
                         weight <= 5 ? '2-5 Kgs' : '5+ Kgs';
      if (!acc[weightRange]) {
        acc[weightRange] = {
          weightRange,
          count: 0,
          percentage: 0,
          averageDeliveryTime: 0,
          successRate: 0,
          deliveryTimes: [] as number[],
        };
      }
      acc[weightRange].count += 1;
      if (s.status === 'DELIVERED') acc[weightRange].successRate += 1;
      if (s.updated_at && s.created_at && s.status === 'DELIVERED') {
        acc[weightRange].deliveryTimes.push((s.updated_at.getTime() - s.created_at.getTime()) / (1000 * 60 * 60 * 24));
      }
      return acc;
    }, {} as Record<string, WeightAnalysisItem & { deliveryTimes: number[] }>);

    return Object.values(groupedByWeight).map(item => {
      const { deliveryTimes, ...rest } = item;
      return {
        ...rest,
        percentage: totalShipments > 0 ? (item.count / totalShipments) * 100 : 0,
        averageDeliveryTime: deliveryTimes.length > 0 ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length : 0,
        successRate: item.count > 0 ? (item.successRate / item.count) * 100 : 0,
      };
    }).sort((a, b) => b.count - a.count);
  }

  private async getChannelAnalysis(params: OptimizedQueryParams): Promise<ChannelAnalysisItem[]> {
    const orders = await prisma.order.findMany({
      where: {
        user_id: params.userId,
        created_at: { gte: params.startDate, lte: params.endDate },
      },
      select: {
        id: true,
        total_amount: true,
        shipment: { select: { id: true, status: true } },
        order_channel_config: { select: { channel: true } },
      },
    });

    const groupedByChannel = orders.reduce((acc, o) => {
      const channel = o.order_channel_config?.channel || 'Unknown';
      if (!acc[channel]) {
        acc[channel] = {
          channel,
          totalOrders: 0,
          totalShipments: 0,
          successRate: 0,
          averageOrderValue: 0,
          topProducts: [],
          orderValues: [] as number[],
        };
      }
      acc[channel].totalOrders += 1;
      if (o.shipment) acc[channel].totalShipments += 1;
      if (o.shipment?.status === 'DELIVERED') acc[channel].successRate += 1;
      if (o.total_amount) acc[channel].orderValues.push(o.total_amount);
      return acc;
    }, {} as Record<string, ChannelAnalysisItem & { orderValues: number[] }>);

    return Object.values(groupedByChannel).map(item => {
      const { orderValues, ...rest } = item;
      return {
        ...rest,
        successRate: item.totalShipments > 0 ? (item.successRate / item.totalShipments) * 100 : 0,
        averageOrderValue: orderValues.length > 0 ? orderValues.reduce((sum, val) => sum + val, 0) / orderValues.length : 0,
      };
    }).sort((a, b) => b.totalOrders - a.totalOrders);
  }

  private async getTopIssues(params: OptimizedQueryParams): Promise<TopIssueItem[]> {
    const shipments = await prisma.shipment.groupBy({
      by: ['cancel_reason'],
      where: {
        user_id: params.userId,
        status: 'EXCEPTION',
        created_at: { gte: params.startDate, lte: params.endDate },
      },
      _count: { id: true },
    });

    const total = shipments.reduce((sum, s) => sum + s._count.id, 0) || 1;
    return shipments
      .map(s => ({
        issue: s.cancel_reason || 'Unknown',
        count: s._count.id,
        percentage: (s._count.id / total) * 100,
        impact: 'high' as const,
        resolution: 'Investigate and resolve',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  // Real-time analytics methods

  private async getActiveShipmentsCount(userId: string): Promise<number> {
    return await prisma.shipment.count({
      where: {
        user_id: userId,
        status: { in: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PICKED_UP'] },
      },
    });
  }

  private async getPendingPickupsCount(userId: string): Promise<number> {
    return await prisma.shipment.count({
      where: {
        user_id: userId,
        status: 'PICKUP_SCHEDULED',
      },
    });
  }

  private async getInTransitCount(userId: string): Promise<number> {
    return await prisma.shipment.count({
      where: {
        user_id: userId,
        status: { in: ['IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
      },
    });
  }

  private async getDeliveredTodayCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await prisma.shipment.count({
      where: {
        user_id: userId,
        status: 'DELIVERED',
        updated_at: {
          gte: today,
          lt: tomorrow,
        },
      },
    });
  }

  private async getRtoTodayCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await prisma.shipment.count({
      where: {
        user_id: userId,
        status: { in: ['RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'] },
        updated_at: {
          gte: today,
          lt: tomorrow,
        },
      },
    });
  }

  private async getNdrRaisedCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await prisma.nDROrder.count({
      where: {
        customer: { orders: { some: { user_id: userId } } },
        ndr_raised_at: {
          gte: today,
          lt: tomorrow,
        },
      },
    });
  }

  private async getNdrResolvedCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await prisma.nDROrder.count({
      where: {
        customer: { orders: { some: { user_id: userId } } },
        action_taken: true,
        updated_at: {
          gte: today,
          lt: tomorrow,
        },
      },
    });
  }

  private async getSystemAlerts(userId: string): Promise<SystemAlertItem[]> {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const [totalShipments, ndrCount] = await Promise.all([
      prisma.shipment.count({
        where: { user_id: userId, created_at: { gte: weekAgo, lte: now } },
      }),
      prisma.nDROrder.count({
        where: { customer: { orders: { some: { user_id: userId } } }, ndr_raised_at: { gte: weekAgo, lte: now } },
      }),
    ]);
    const ndrRate = totalShipments ? (ndrCount / totalShipments) * 100 : 0;
    const alerts: SystemAlertItem[] = [];
    if (ndrRate > 10) {
      alerts.push({
        id: 'ndr-high',
        type: 'warning',
        message: `High NDR rate: ${ndrRate.toFixed(1)}% in last 7 days`,
        timestamp: now.toISOString(),
        priority: 'medium',
        actionRequired: true,
      });
    }
    return alerts;
  }

  // Predictive analytics methods

  private async getBasicDeliveryPredictions(userId: string): Promise<DeliveryPredictionItem[]> {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const shipments = await prisma.shipment.findMany({
      where: {
        user_id: userId,
        status: { in: ['IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
        created_at: { lte: fiveDaysAgo },
      },
      select: {
        id: true,
        code: true,
        created_at: true,
        edd: true,
        tracking_events: {
          select: { status: true, timestamp: true },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });
    return shipments.map((s) => ({
      shipmentId: s.id,
      predictedDeliveryDate: s.edd ? s.edd.toISOString() : '',
      confidence: 0.6,
      factors: ['In transit > 5 days', `Last status: ${s.tracking_events[0]?.status || 'Unknown'}`],
      riskLevel: 'high',
    }));
  }

  private async getBasicRtoPredictions(userId: string): Promise<RtoPredictionItem[]> {
    const ndrs = await prisma.nDROrder.findMany({
      where: {
        customer: { orders: { some: { user_id: userId } } },
        action_taken: false,
      },
      select: {
        shipment_id: true,
        id: true,
        attempts: true,
        ndr_history: { 
          where: { 
            ndr_raised_at: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7)),
            }
          },
          select: {
            ndr_reason: true,
          }
        }
      },
    });
    return ndrs.map((n) => ({
      shipmentId: n.shipment_id || '',
      rtoProbability: n.attempts > 2 ? 0.9 : 0.7,
      riskFactors: [`NDR not resolved`, `Attempts: ${n.attempts}`, `Reason: ${n.ndr_history[0]?.ndr_reason || 'Unknown'}`],
      recommendedActions: ['Contact customer', 'Review NDR reason'],
      priority: n.attempts > 2 ? 'high' : 'medium',
    }));
  }

  private async getBasicDemandForecast(userId: string): Promise<DemandForecastItem[]> {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const orders = await prisma.order.findMany({
      where: { user_id: userId, created_at: { gte: weekAgo, lte: now } },
      select: { created_at: true, shipment: { select: { id: true } } },
    });
    const byDay: Record<string, { orders: number; shipments: number }> = {};
    for (const o of orders) {
      const day = o.created_at.toISOString().slice(0, 10);
      byDay[day] = byDay[day] || { orders: 0, shipments: 0 };
      byDay[day].orders += 1;
      if (o.shipment) byDay[day].shipments += 1;
    }
    return Object.entries(byDay).map(([date, counts]) => ({
      date,
      predictedOrders: counts.orders,
      predictedShipments: counts.shipments,
      confidence: 0.7,
      factors: ['7-day average'],
    }));
  }

  private async getBasicCourierRecommendations(userId: string): Promise<CourierRecommendationItem[]> {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);
    const shipments = await prisma.shipment.findMany({
      where: {
        user_id: userId,
        status: 'DELIVERED',
        created_at: { gte: monthAgo, lte: now },
      },
      select: {
        order_id: true,
        courier: { select: { id: true, name: true } },
      },
    });

    const groupedByOrderAndCourier = shipments.reduce((acc, s) => {
      const key = `${s.order_id}-${s.courier?.id || 'unknown'}`;
      if (!acc[key]) {
        acc[key] = {
          orderId: s.order_id,
          courierId: s.courier?.id || 'unknown',
          courierName: s.courier?.name || 'Unknown',
          delivered: 0,
        };
      }
      acc[key].delivered += 1;
      return acc;
    }, {} as Record<string, { orderId: string; courierId: string; courierName: string; delivered: number }>);

    const recommendations = Object.values(groupedByOrderAndCourier).map(item => {
      const totalForOrder = shipments.filter(s => s.order_id === item.orderId).length;
      const successRate = totalForOrder > 0 ? (item.delivered / totalForOrder) * 100 : 0;
      return {
        orderId: item.orderId,
        recommendedCouriers: [{
          courierId: item.courierId,
          courierName: item.courierName,
          score: successRate / 100,
          estimatedCost: 0, // Implement cost estimation logic if needed
          estimatedDeliveryTime: 2,
          successRate,
        }],
        factors: ['Highest delivery rate'],
        estimatedDeliveryTime: 2,
      };
    });

    return recommendations.sort((a, b) => {
      const aSuccess = a.recommendedCouriers?.[0]?.successRate ?? 0;
      const bSuccess = b.recommendedCouriers?.[0]?.successRate ?? 0;
      return bSuccess - aSuccess;
    }).slice(0, 10);
  }

  // Helper methods

  private async getOrdersCount(userId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await prisma.order.count({
      where: {
        user_id: userId,
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }

  private async getRevenue(userId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await prisma.order.aggregate({
      where: {
        user_id: userId,
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        total_amount: true,
      },
    });

    return result._sum?.total_amount || 0;
  }

  private async getDelayedPickupsCount(userId: string): Promise<number> {
    return await prisma.shipment.count({
      where: {
        user_id: userId,
        status: 'PICKUP_SCHEDULED',
        pickup_date: {
          lt: new Date(),
        },
      },
    });
  }

  private async getNewOrdersCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await prisma.order.count({
      where: {
        user_id: userId,
        created_at: {
          gte: today,
        },
        shipment: null,
      },
    });
  }

  private async getNdrActionRequiredCount(userId: string): Promise<number> {
    return await prisma.nDROrder.count({
      where: {
        customer: { orders: { some: { user_id: userId } } },
        action_taken: false,
      },
    });
  }

  private async getDelayedDeliveryCount(userId: string): Promise<number> {
    return await prisma.shipment.count({
      where: {
        user_id: userId,
        status: { in: ['IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
        edd: {
          lt: new Date(),
        },
      },
    });
  }

  private async getWeightDiscrepancyCount(userId: string): Promise<number> {
    return await prisma.weightDispute.count({
      where: {
        user_id: userId,
        status: { in: ['PENDING', 'RAISED_BY_SELLER'] },
      },
    });
  }

  private calculatePickupPriority(scheduledDate: Date | null): 'high' | 'medium' | 'low' {
    if (!scheduledDate) return 'medium';
    
    const now = new Date();
    const diffHours = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) return 'high';
    if (diffHours < 72) return 'medium';
    return 'low';
  }

  private buildQueryParams(userId: string, filters: ShipmentAnalysisFilters): OptimizedQueryParams {
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date();
    startDate.setDate(startDate.getDate() - 30); // Default to last 30 days

    return {
      userId,
      startDate,
      endDate,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      includeRelations: ['courier', 'order', 'order.customer'],
      groupBy: ['status', 'courier_id', 'order_zone'],
      orderBy: ['created_at DESC'],
    };
  }

  private hashFilters(filters: ShipmentAnalysisFilters): string {
    return Buffer.from(JSON.stringify(filters)).toString('base64');
  }

  /**
   * Clear cache for a specific user
   */
  async clearUserCache(userId: string): Promise<void> {
    const keys = [
      CACHE_KEYS.HOME_ANALYTICS(userId),
      CACHE_KEYS.REAL_TIME(userId),
      CACHE_KEYS.PREDICTIVE(userId),
      CACHE_KEYS.ACTION_ITEMS(userId),
      CACHE_KEYS.UPCOMING_PICKUPS(userId),
    ];

    // Get all performance cache keys for this user
    const redis = this.fastify.redis as Redis;
    const performanceKeys = await redis.keys(`analytics:performance:${userId}:*`);
    keys.push(...performanceKeys);

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  async getPerformanceMetrics(userId: string): Promise<PerformanceMetrics> {
    const redis = this.fastify.redis as Redis;
    const cacheKey = CACHE_KEYS.PERFORMANCE_METRICS(userId);
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const start = Date.now();
    const shipmentCount = await prisma.shipment.count({ where: { user_id: userId } });
    const end = Date.now();
    const info = await redis.info();
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const connectedMatch = info.match(/connected_clients:(\d+)/);
    const metrics: PerformanceMetrics = {
      queryExecutionTime: end - start,
      cacheHitRate: 90, // Implement actual cache hit rate logic if available
      memoryUsage: memoryMatch ? parseFloat(memoryMatch[1] || '0') : 0,
      cpuUsage: 0, // Implement if available
      activeConnections: connectedMatch ? parseInt(connectedMatch[1] || '0') : 0,
      queueSize: 0, // Implement if available
      errorRate: 0.1, // Implement actual error rate logic if available
    };
    await redis.setex(cacheKey, this.cacheExpiry.performance, JSON.stringify(metrics));
    return metrics;
  }
}