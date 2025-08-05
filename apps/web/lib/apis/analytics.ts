'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

export const useOrdersAnalytics = (params?: any) => {
  const { isTokenReady } = useAuthToken();
  return useQuery({
    queryKey: ['analytics-orders', params],
    queryFn: () => api.get<any>('/analytics/orders', { params }).then((res) => res),
    staleTime: 2 * 60 * 1000,
    enabled: isTokenReady,
  });
};

export const useShipmentsAnalytics = (params?: any) => {
  const { isTokenReady } = useAuthToken();
  return useQuery({
    queryKey: ['analytics-shipments', params],
    queryFn: () => api.get<any>('/analytics/shipments', { params }).then((res) => res),
    staleTime: 2 * 60 * 1000,
    enabled: isTokenReady,
  });
};

export const useNdrAnalytics = (params?: any) => {
  const { isTokenReady } = useAuthToken();
  return useQuery({
    queryKey: ['analytics-ndr', params],
    queryFn: () => api.get<any>('/analytics/ndr', { params }).then((res) => res),
    staleTime: 2 * 60 * 1000,
    enabled: isTokenReady,
  });
};

export const useRtoAnalytics = (params?: any) => {
  const { isTokenReady } = useAuthToken();
  return useQuery({
    queryKey: ['analytics-rto', params],
    queryFn: () => api.get('/analytics/rto', { params }).then((res) => res),
    staleTime: 2 * 60 * 1000,
    enabled: isTokenReady,
  });
};
