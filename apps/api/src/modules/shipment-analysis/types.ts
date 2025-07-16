// Shipment Analysis Types for High-Performance Analytics

export interface ShipmentAnalysisFilters {
  startDate?: string;
  endDate?: string;
  courierId?: string;
  zone?: string;
  status?: string;
  channel?: string;
  limit?: number;
  offset?: number;
}

// Home Page Analytics Types
export interface HomePageAnalytics {
  summary: HomeSummaryItem[];
  actionItems: ActionItem[];
  upcomingPickups: UpcomingPickupItem[];
  kycStatus: KycStatusItem;
}

export interface HomeSummaryItem {
  title: string;
  value: string;
  description: string;
  icon: string;
  trend?: {
    percentage: string;
    direction: 'up' | 'down' | 'neutral';
  };
}

export interface ActionItem {
  title: string;
  value: string;
  percentage: string;
  description: string;
  icon: string;
  className?: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
}

export interface UpcomingPickupItem {
  id: string;
  orderId: string;
  customerName: string;
  pickupAddress: string;
  scheduledDate: string;
  status: 'scheduled' | 'pending' | 'completed';
  courierName: string;
  priority: 'high' | 'medium' | 'low';
}

export interface KycStatusItem {
  isCompleted: boolean;
  completionPercentage: number;
  pendingDocuments: string[];
  nextAction: string;
}

// Shipment Performance Analytics
export interface ShipmentPerformanceAnalytics {
  overview: ShipmentOverviewMetrics;
  courierPerformance: CourierPerformanceItem[];
  zonePerformance: ZonePerformanceItem[];
  statusDistribution: StatusDistributionItem[];
  deliveryTimeline: DeliveryTimelineItem[];
  weightAnalysis: WeightAnalysisItem[];
  channelAnalysis: ChannelAnalysisItem[];
  topIssues: TopIssueItem[];
  // NDR analytics (required for NDR dashboard)
  ndrMetrics?: any; // Summary metrics for NDR
  ndrResponseSummary?: any; // Seller/Buyer response summary
  ndrFunnel?: any; // NDR funnel data
  ndrReasonSplit?: any[]; // Pie chart data for NDR reasons
  ndrStatusSplit?: any[]; // Bar chart data for NDR status
  ndrResponsesByAttempt?: any[]; // Table data for NDR responses by attempt
  ndrVsDeliveryAttempt?: any[]; // Combo chart data for NDR vs delivery attempt
  sellerResponse?: any[]; // Bar chart data for seller response
  buyerResponse?: any[]; // Bar chart data for buyer response
  successByCourier?: any[]; // Table data for success by courier
  ndrReason?: any[]; // Table data for NDR reason
  // RTO analytics (required for RTO dashboard)
  rtoMetrics?: any; // Summary metrics for RTO
  rtoCountOverTime?: any[]; // Line chart data for RTO count
  rtoStatus?: any[]; // Bar chart data for RTO status
  rtoReasons?: any[]; // Pie chart data for RTO reasons
  rtoTopByPincode?: any[]; // Table data for top RTO by pincode
  rtoTopByCity?: any[]; // Table data for top RTO by city
  rtoTopByCourier?: any[]; // Table data for top RTO by courier
  rtoTopByCustomer?: any[]; // Table data for top RTO by customer
}

export interface ShipmentOverviewMetrics {
  totalShipments: number;
  delivered: number;
  inTransit: number;
  pending: number;
  rto: number;
  lostDamaged: number;
  onTimeDelivery: number;
  delayedDelivery: number;
  averageDeliveryTime: string;
  successRate: string;
}

export interface CourierPerformanceItem {
  courierId: string;
  courierName: string;
  totalShipments: number;
  delivered: number;
  rto: number;
  lostDamaged: number;
  onTimeDelivery: number;
  delayedDelivery: number;
  successRate: number;
  averageDeliveryTime: number;
  ndrCount: number;
  ndrResolved: number;
}

export interface ZonePerformanceItem {
  zone: string;
  totalShipments: number;
  delivered: number;
  rto: number;
  lostDamaged: number;
  successRate: number;
  averageDeliveryTime: number;
  topCouriers: string[];
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DeliveryTimelineItem {
  date: string;
  delivered: number;
  delayed: number;
  rto: number;
  total: number;
}

export interface WeightAnalysisItem {
  weightRange: string;
  count: number;
  percentage: number;
  averageDeliveryTime: number;
  successRate: number;
}

export interface ChannelAnalysisItem {
  channel: string;
  totalOrders: number;
  totalShipments: number;
  successRate: number;
  averageOrderValue: number;
  topProducts: string[];
}

export interface TopIssueItem {
  issue: string;
  count: number;
  percentage: number;
  impact: 'high' | 'medium' | 'low';
  resolution: string;
}

// Real-time Analytics Types
export interface RealTimeAnalytics {
  activeShipments: number;
  pendingPickups: number;
  inTransit: number;
  deliveredToday: number;
  rtoToday: number;
  ndrRaised: number;
  ndrResolved: number;
  systemAlerts: SystemAlertItem[];
}

export interface SystemAlertItem {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
}

// Predictive Analytics Types
export interface PredictiveAnalytics {
  deliveryPredictions: DeliveryPredictionItem[];
  rtoPredictions: RtoPredictionItem[];
  demandForecast: DemandForecastItem[];
  courierRecommendations: CourierRecommendationItem[];
}

export interface DeliveryPredictionItem {
  shipmentId: string;
  predictedDeliveryDate: string;
  confidence: number;
  factors: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RtoPredictionItem {
  shipmentId: string;
  rtoProbability: number;
  riskFactors: string[];
  recommendedActions: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface DemandForecastItem {
  date: string;
  predictedOrders: number;
  predictedShipments: number;
  confidence: number;
  factors: string[];
}

export interface CourierRecommendationItem {
  orderId: string;
  recommendedCouriers: RecommendedCourierItem[];
  factors: string[];
  estimatedDeliveryTime: number;
}

export interface RecommendedCourierItem {
  courierId: string;
  courierName: string;
  score: number;
  estimatedCost: number;
  estimatedDeliveryTime: number;
  successRate: number;
}

// Cache Keys for Redis
export const CACHE_KEYS = {
  HOME_ANALYTICS: (userId: string) => `analytics:home:${userId}`,
  SHIPMENT_PERFORMANCE: (userId: string, filters: string) => `analytics:shipment-performance:${userId}:${filters}`,
  REAL_TIME: (userId: string) => `analytics:real-time:${userId}`,
  PREDICTIVE: (userId: string) => `analytics:predictive:${userId}`,
  ACTION_ITEMS: (userId: string) => `analytics:action-items:${userId}`,
  UPCOMING_PICKUPS: (userId: string) => `analytics:upcoming-pickups:${userId}`,
  PERFORMANCE_METRICS: (userId: string) => `analytics:performance-metrics:${userId}`,
} as const;

// Queue Job Types
export enum ShipmentAnalysisJobType {
  PROCESS_HOME_ANALYTICS = 'process-home-analytics',
  PROCESS_SHIPMENT_PERFORMANCE = 'process-shipment-performance',
  PROCESS_REAL_TIME_ANALYTICS = 'process-real-time-analytics',
  PROCESS_PREDICTIVE_ANALYTICS = 'process-predictive-analytics',
  UPDATE_CACHE = 'update-cache',
  GENERATE_REPORT = 'generate-report',
}

// Database Query Optimization Types
export interface OptimizedQueryParams {
  userId: string;
  startDate: Date;
  endDate: Date;
  limit?: number;
  offset?: number;
  includeRelations?: string[];
  groupBy?: string[];
  orderBy?: string[];
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  executionTime: number;
  cacheHit: boolean;
}

// Performance Metrics
export interface PerformanceMetrics {
  queryExecutionTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueSize: number;
  errorRate: number;
} 