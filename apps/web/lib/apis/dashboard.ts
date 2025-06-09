import { useQuery } from '@tanstack/react-query';
import { api } from './axios';

export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<{ orders: any[]; revenue: number; customers: number }>('/dashboard'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
