// Frontend types for Shipment Analysis API

export interface TopCustomerItem {
  customerId: string;
  customerName: string;
  totalShipments: number;
  delivered: number;
  rto: number;
  lostDamaged: number;
  successRate: number;
  averageDeliveryTime: number;
  totalRevenue: number;
  averageOrderValue: number;
}

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
  topCustomers: TopCustomerItem[];
  ndrReason: any;
  successByCourier: any;
  buyerResponse: any;
  sellerResponse: any;
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
  averageDeliveryTime: number;
  successRate: number;
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

// API Response Types
export interface ShipmentAnalysisResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    executionTime: string;
    cached: boolean;
    timestamp: string;
    filters?: ShipmentAnalysisFilters;
    block?: string;
  };
  message?: string;
  error?: string;
}

// Performance Metrics Types
export interface PerformanceMetrics {
  queryExecutionTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueSize: number;
  errorRate: number;
}

// Health Check Types
export interface HealthCheckResponse {
  success: boolean;
  status: 'healthy' | 'unhealthy';
  responseTime: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
    queue: string;
  };
  message?: string;
  error?: string;
}
