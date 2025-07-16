import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getHomePageAnalytics,
  getShipmentPerformanceAnalytics,
  getRealTimeAnalytics,
  getPredictiveAnalytics,
  getAnalyticsBlock,
  getCourierPerformanceAnalytics,
  getZonePerformanceAnalytics,
  getDeliveryTimelineAnalytics,
  getWeightAnalysisAnalytics,
  getChannelAnalysisAnalytics,
  getTopIssuesAnalytics,
  getActionItemsAnalytics,
  getUpcomingPickupsAnalytics,
  getKycStatusAnalytics,
  getSystemAlertsAnalytics,
  getDeliveryPredictionsAnalytics,
  getRtoPredictionsAnalytics,
  getDemandForecastAnalytics,
  getCourierRecommendationsAnalytics,
  clearAnalyticsCache,
  getPerformanceMetrics,
  getAnalyticsHealthCheck,
  getBatchAnalytics,
} from '../apis/shipment-analysis';
import { ShipmentAnalysisFilters } from '../type/shipment-analysis';
import { useAuthToken } from '@/components/providers/token-provider';

// Query keys for caching
export const shipmentAnalysisKeys = {
  all: ['shipment-analysis'] as const,
  home: () => [...shipmentAnalysisKeys.all, 'home'] as const,
  performance: (filters?: ShipmentAnalysisFilters) => [...shipmentAnalysisKeys.all, 'performance', filters] as const,
  realtime: () => [...shipmentAnalysisKeys.all, 'realtime'] as const,
  predictive: () => [...shipmentAnalysisKeys.all, 'predictive'] as const,
  block: (block: string, filters?: ShipmentAnalysisFilters) => [...shipmentAnalysisKeys.all, 'block', block, filters] as const,
  courierPerformance: (filters?: ShipmentAnalysisFilters) => [...shipmentAnalysisKeys.all, 'courier-performance', filters] as const,
  zonePerformance: (filters?: ShipmentAnalysisFilters) => [...shipmentAnalysisKeys.all, 'zone-performance', filters] as const,
  deliveryTimeline: (filters?: ShipmentAnalysisFilters) => [...shipmentAnalysisKeys.all, 'delivery-timeline', filters] as const,
  weightAnalysis: (filters?: ShipmentAnalysisFilters) => [...shipmentAnalysisKeys.all, 'weight-analysis', filters] as const,
  channelAnalysis: (filters?: ShipmentAnalysisFilters) => [...shipmentAnalysisKeys.all, 'channel-analysis', filters] as const,
  topIssues: (filters?: ShipmentAnalysisFilters) => [...shipmentAnalysisKeys.all, 'top-issues', filters] as const,
  actionItems: () => [...shipmentAnalysisKeys.all, 'action-items'] as const,
  upcomingPickups: () => [...shipmentAnalysisKeys.all, 'upcoming-pickups'] as const,
  kycStatus: () => [...shipmentAnalysisKeys.all, 'kyc-status'] as const,
  systemAlerts: () => [...shipmentAnalysisKeys.all, 'system-alerts'] as const,
  deliveryPredictions: () => [...shipmentAnalysisKeys.all, 'delivery-predictions'] as const,
  rtoPredictions: () => [...shipmentAnalysisKeys.all, 'rto-predictions'] as const,
  demandForecast: () => [...shipmentAnalysisKeys.all, 'demand-forecast'] as const,
  courierRecommendations: () => [...shipmentAnalysisKeys.all, 'courier-recommendations'] as const,
  performanceMetrics: () => [...shipmentAnalysisKeys.all, 'performance-metrics'] as const,
  healthCheck: () => [...shipmentAnalysisKeys.all, 'health-check'] as const,
  batch: (requests: Array<{ type: string; filters?: ShipmentAnalysisFilters }>) => [...shipmentAnalysisKeys.all, 'batch', requests] as const,
};

export const useShipmentAnalysis = (filters?: ShipmentAnalysisFilters) => {
  const { isTokenReady } = useAuthToken();

  // Home
  const home = useQuery({
    queryKey: ['shipment-analysis', 'home'],
    queryFn: getHomePageAnalytics,
    enabled: isTokenReady,
    refetchInterval: 300000,
    staleTime: 240000,
  });

  // Performance
  const performance = useQuery({
    queryKey: ['shipment-analysis', 'performance', filters],
    queryFn: () => getShipmentPerformanceAnalytics(filters),
    enabled: isTokenReady,
    refetchInterval: 600000,
    staleTime: 540000,
  });

  // Real-time
  const realtime = useQuery({
    queryKey: ['shipment-analysis', 'realtime'],
    queryFn: getRealTimeAnalytics,
    enabled: isTokenReady,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Predictive
  const predictive = useQuery({
    queryKey: ['shipment-analysis', 'predictive'],
    queryFn: getPredictiveAnalytics,
    enabled: isTokenReady,
    refetchInterval: 1800000,
    staleTime: 1620000,
  });

  // Action Items
  const actionItems = useQuery({
    queryKey: ['shipment-analysis', 'action-items'],
    queryFn: getActionItemsAnalytics,
    enabled: isTokenReady,
    refetchInterval: 300000,
    staleTime: 240000,
  });

  // Upcoming Pickups
  const upcomingPickups = useQuery({
    queryKey: ['shipment-analysis', 'upcoming-pickups'],
    queryFn: getUpcomingPickupsAnalytics,
    enabled: isTokenReady,
    refetchInterval: 300000,
    staleTime: 240000,
  });

  // KYC Status
  const kycStatus = useQuery({
    queryKey: ['shipment-analysis', 'kyc-status'],
    queryFn: getKycStatusAnalytics,
    enabled: isTokenReady,
    refetchInterval: 300000,
    staleTime: 240000,
  });

  // System Alerts
  const systemAlerts = useQuery({
    queryKey: ['shipment-analysis', 'system-alerts'],
    queryFn: getSystemAlertsAnalytics,
    enabled: isTokenReady,
    refetchInterval: 300000,
    staleTime: 240000,
  });

  // Top Issues
  const topIssues = useQuery({
    queryKey: ['shipment-analysis', 'top-issues', filters],
    queryFn: () => getTopIssuesAnalytics(filters),
    enabled: isTokenReady,
    refetchInterval: 600000,
    staleTime: 540000,
  });

  // Delivery Predictions
  const deliveryPredictions = useQuery({
    queryKey: ['shipment-analysis', 'delivery-predictions'],
    queryFn: getDeliveryPredictionsAnalytics,
    enabled: isTokenReady,
    refetchInterval: 1800000,
    staleTime: 1620000,
  });

  // RTO Predictions
  const rtoPredictions = useQuery({
    queryKey: ['shipment-analysis', 'rto-predictions'],
    queryFn: getRtoPredictionsAnalytics,
    enabled: isTokenReady,
    refetchInterval: 1800000,
    staleTime: 1620000,
  });

  // Demand Forecast
  const demandForecast = useQuery({
    queryKey: ['shipment-analysis', 'demand-forecast'],
    queryFn: getDemandForecastAnalytics,
    enabled: isTokenReady,
    refetchInterval: 1800000,
    staleTime: 1620000,
  });

  // Courier Recommendations
  const courierRecommendations = useQuery({
    queryKey: ['shipment-analysis', 'courier-recommendations'],
    queryFn: getCourierRecommendationsAnalytics,
    enabled: isTokenReady,
    refetchInterval: 1800000,
    staleTime: 1620000,
  });

  // Performance Metrics
  const performanceMetrics = useQuery({
    queryKey: ['shipment-analysis', 'performance-metrics'],
    queryFn: getPerformanceMetrics,
    enabled: isTokenReady,
    refetchInterval: 600000,
    staleTime: 540000,
  });

  return {
    home,
    performance,
    realtime,
    predictive,
    actionItems,
    upcomingPickups,
    kycStatus,
    systemAlerts,
    topIssues,
    deliveryPredictions,
    rtoPredictions,
    demandForecast,
    courierRecommendations,
    performanceMetrics,
    // Expose fetch functions for flexibility
    fetch: {
      getHomePageAnalytics,
      getShipmentPerformanceAnalytics,
      getRealTimeAnalytics,
      getPredictiveAnalytics,
      getActionItemsAnalytics,
      getUpcomingPickupsAnalytics,
      getKycStatusAnalytics,
      getSystemAlertsAnalytics,
      getTopIssuesAnalytics,
      getDeliveryPredictionsAnalytics,
      getRtoPredictionsAnalytics,
      getDemandForecastAnalytics,
      getCourierRecommendationsAnalytics,
      getPerformanceMetrics,
      getAnalyticsBlock,
      getCourierPerformanceAnalytics,
      getZonePerformanceAnalytics,
      getDeliveryTimelineAnalytics,
      getWeightAnalysisAnalytics,
      getChannelAnalysisAnalytics,
      getBatchAnalytics,
      getAnalyticsHealthCheck,
    },
    isTokenReady,
  };
};

// Cache Management Mutation
export const useClearAnalyticsCache = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: clearAnalyticsCache,
    onSuccess: () => {
      // Invalidate all shipment analysis queries
      queryClient.invalidateQueries({ queryKey: shipmentAnalysisKeys.all });
    },
  });
};