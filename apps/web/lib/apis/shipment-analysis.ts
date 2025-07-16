import { api } from './axios';
import {
  HomePageAnalytics,
  ShipmentPerformanceAnalytics,
  RealTimeAnalytics,
  PredictiveAnalytics,
  ShipmentAnalysisFilters,
  ShipmentAnalysisResponse,
  PerformanceMetrics,
  HealthCheckResponse,
} from '../type/shipment-analysis';

/**
 * Shipment Analysis API functions
 */

// Home Page Analytics
export const getHomePageAnalytics = async (): Promise<HomePageAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<HomePageAnalytics>>('/shipment-analysis/home');
  return response.data;
};

// Shipment Performance Analytics
export const getShipmentPerformanceAnalytics = async (
  filters?: ShipmentAnalysisFilters
): Promise<ShipmentPerformanceAnalytics> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await api.get<ShipmentAnalysisResponse<ShipmentPerformanceAnalytics>>(
    `/shipment-analysis/performance${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data;
};

// Real-time Analytics
export const getRealTimeAnalytics = async (): Promise<RealTimeAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<RealTimeAnalytics>>('/shipment-analysis/realtime');
  return response.data;
};

// Predictive Analytics
export const getPredictiveAnalytics = async (): Promise<PredictiveAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<PredictiveAnalytics>>('/shipment-analysis/predictive');
  return response.data;
};

// Generic Analytics Block
export const getAnalyticsBlock = async (
  block: string,
  filters?: ShipmentAnalysisFilters
): Promise<any> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await api.get<ShipmentAnalysisResponse<any>>(
    `/shipment-analysis/block/${block}${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data;
};

// Specialized Analytics Endpoints

// Courier Performance Analytics
export const getCourierPerformanceAnalytics = async (
  filters?: ShipmentAnalysisFilters
): Promise<ShipmentPerformanceAnalytics> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await api.get<ShipmentAnalysisResponse<ShipmentPerformanceAnalytics>>(
    `/shipment-analysis/courier-performance${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data;
};

// Zone Performance Analytics
export const getZonePerformanceAnalytics = async (
  filters?: ShipmentAnalysisFilters
): Promise<ShipmentPerformanceAnalytics> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await api.get<ShipmentAnalysisResponse<ShipmentPerformanceAnalytics>>(
    `/shipment-analysis/zone-performance${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data;
};

// Delivery Timeline Analytics
export const getDeliveryTimelineAnalytics = async (
  filters?: ShipmentAnalysisFilters
): Promise<ShipmentPerformanceAnalytics> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await api.get<ShipmentAnalysisResponse<ShipmentPerformanceAnalytics>>(
    `/shipment-analysis/delivery-timeline${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data;
};

// Weight Analysis Analytics
export const getWeightAnalysisAnalytics = async (
  filters?: ShipmentAnalysisFilters
): Promise<ShipmentPerformanceAnalytics> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await api.get<ShipmentAnalysisResponse<ShipmentPerformanceAnalytics>>(
    `/shipment-analysis/weight-analysis${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data;
};

// Channel Analysis Analytics
export const getChannelAnalysisAnalytics = async (
  filters?: ShipmentAnalysisFilters
): Promise<ShipmentPerformanceAnalytics> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await api.get<ShipmentAnalysisResponse<ShipmentPerformanceAnalytics>>(
    `/shipment-analysis/channel-analysis${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data;
};

// Top Issues Analytics
export const getTopIssuesAnalytics = async (
  filters?: ShipmentAnalysisFilters
): Promise<ShipmentPerformanceAnalytics> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await api.get<ShipmentAnalysisResponse<ShipmentPerformanceAnalytics>>(
    `/shipment-analysis/top-issues${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data;
};

// Action Items Analytics
export const getActionItemsAnalytics = async (): Promise<HomePageAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<HomePageAnalytics>>('/shipment-analysis/action-items');
  return response.data;
};

// Upcoming Pickups Analytics
export const getUpcomingPickupsAnalytics = async (): Promise<HomePageAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<HomePageAnalytics>>('/shipment-analysis/upcoming-pickups');
  return response.data;
};

// KYC Status Analytics
export const getKycStatusAnalytics = async (): Promise<HomePageAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<HomePageAnalytics>>('/shipment-analysis/kyc-status');
  return response.data;
};

// System Alerts Analytics
export const getSystemAlertsAnalytics = async (): Promise<RealTimeAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<RealTimeAnalytics>>('/shipment-analysis/system-alerts');
  return response.data;
};

// Delivery Predictions Analytics
export const getDeliveryPredictionsAnalytics = async (): Promise<PredictiveAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<PredictiveAnalytics>>('/shipment-analysis/delivery-predictions');
  return response.data;
};

// RTO Predictions Analytics
export const getRtoPredictionsAnalytics = async (): Promise<PredictiveAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<PredictiveAnalytics>>('/shipment-analysis/rto-predictions');
  return response.data;
};

// Demand Forecast Analytics
export const getDemandForecastAnalytics = async (): Promise<PredictiveAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<PredictiveAnalytics>>('/shipment-analysis/demand-forecast');
  return response.data;
};

// Courier Recommendations Analytics
export const getCourierRecommendationsAnalytics = async (): Promise<PredictiveAnalytics> => {
  const response = await api.get<ShipmentAnalysisResponse<PredictiveAnalytics>>('/shipment-analysis/courier-recommendations');
  return response.data;
};

// Cache Management
export const clearAnalyticsCache = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string; timestamp: string }>('/shipment-analysis/cache');
  return response;
};

// Performance Metrics (Admin only)
export const getPerformanceMetrics = async (): Promise<PerformanceMetrics> => {
  const response = await api.get<{ success: boolean; data: PerformanceMetrics; timestamp: string }>('/shipment-analysis/metrics');
  return response.data;
};

// Health Check
export const getAnalyticsHealthCheck = async (): Promise<HealthCheckResponse> => {
  const response = await api.get<HealthCheckResponse>('/shipment-analysis/health');
  return response;
};

// Utility function to build query parameters
export const buildAnalyticsQueryParams = (filters: ShipmentAnalysisFilters): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });
  return params.toString();
};

// Batch analytics requests for better performance
export const getBatchAnalytics = async (requests: Array<{ type: string; filters?: ShipmentAnalysisFilters }>) => {
  const promises = requests.map(async (request) => {
    try {
      switch (request.type) {
        case 'home':
          return { type: 'home', data: await getHomePageAnalytics() };
        case 'performance':
          return { type: 'performance', data: await getShipmentPerformanceAnalytics(request.filters) };
        case 'realtime':
          return { type: 'realtime', data: await getRealTimeAnalytics() };
        case 'predictive':
          return { type: 'predictive', data: await getPredictiveAnalytics() };
        default:
          throw new Error(`Unknown analytics type: ${request.type}`);
      }
    } catch (error) {
      return { type: request.type, error: error as Error };
    }
  });

  const results = await Promise.allSettled(promises);
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return { type: requests[index]?.type || 'unknown', error: result.reason };
    }
  });
}; 