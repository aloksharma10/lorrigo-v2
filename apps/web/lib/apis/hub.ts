import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

// Types for hub data
export interface Hub {
  id: string;
  name: string;
  code: string;
  contact_person_name: string;
  phone: string;
  is_active: boolean;
  is_primary: boolean;
  is_rto_address_same: boolean;
  address: {
    id: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  rto_address?: {
    id: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  created_at: string;
  updated_at: string;
}

export interface HubsResponse {
  hubs: Hub[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface HubsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: string;
  is_primary?: string;
  globalFilter?: string;
  sorting?: { id: string; desc: boolean }[];
}

export const useHubOperations = () => {
  const queryClient = useQueryClient();
  const { isTokenReady } = useAuthToken();

  // Fetch all hubs with advanced filtering
  const getHubsQuery = (params: HubsQueryParams = {}) =>
    useQuery({
      queryKey: ['hubs', params],
      queryFn: () => {
        // Build query parameters
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.globalFilter) queryParams.append('globalFilter', params.globalFilter);
        if (params.is_active) queryParams.append('is_active', params.is_active);
        if (params.is_primary) queryParams.append('is_primary', params.is_primary);
        if (params.sorting && params.sorting.length > 0) {
          queryParams.append('sorting', JSON.stringify(params.sorting));
        }

        return api.get<HubsResponse>(`/pickup-address?${queryParams.toString()}`);
      },
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      enabled: isTokenReady,
    });

  // Legacy method for backward compatibility
  const getHubsQueryLegacy = useQuery({
    queryKey: ['hubs-legacy'],
    queryFn: () => api.get('/pickup-address').then((res: any) => res.hubs || []),
    enabled: false, // manual trigger only
    staleTime: 1000 * 60 * 5, // 5 minutes: data is considered fresh
    gcTime: 1000 * 60 * 10,
  });

  // Create Hub
  const createHub = useMutation({
    mutationFn: (hubData: any) => api.post('/pickup-address', hubData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] });
    },
  });

  // Update Hub
  const updateHub = useMutation({
    mutationFn: (hubData: any) => api.put(`/pickup-address/${hubData.id}`, hubData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] });
    },
  });

  // Delete Hub
  const deleteHub = useMutation({
    mutationFn: (hubData: any) => api.delete(`/pickup-address/${hubData.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] });
    },
  });

  // Update hub status (active/inactive)
  const updateHubStatus = useMutation({
    mutationFn: ({ hubId, isActive }: { hubId: string; isActive: boolean }) => api.patch(`/pickup-address/${hubId}/status`, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] });
    },
  });

  // Set hub as primary
  const setPrimaryHub = useMutation({
    mutationFn: (hubId: string) => api.patch(`/pickup-address/${hubId}/primary`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] });
    },
  });

  return {
    getHubsQuery,
    getHubsQueryLegacy,
    createHub,
    updateHub,
    deleteHub,
    updateHubStatus,
    setPrimaryHub,
  };
};
