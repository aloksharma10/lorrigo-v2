import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

// Types for courier pricing
export interface ZonePricing {
  id: string;
  zone: string;
  base_price: number;
  increment_price: number;
  is_rto_same_as_fw: boolean;
  rto_base_price: number;
  rto_increment_price: number;
  flat_rto_charge: number;
  created_at: string;
  updated_at: string;
  plan_courier_pricing_id: string;
}

export interface CourierPricing {
  id: string;
  cod_charge_hard: number;
  cod_charge_percent: number;
  is_fw_applicable: boolean;
  is_rto_applicable: boolean;
  is_cod_applicable: boolean;
  is_cod_reversal_applicable: boolean;
  weight_slab: number;
  increment_weight: number;
  increment_price: number;
  plan_id: string;
  courier_id: string;
  created_at: string;
  updated_at: string;
  zone_pricing: ZonePricing[];
}

// Types for courier data
export interface Courier {
  id: string;
  name: string;
  code: string;
  courier_code?: string;
  type: 'EXPRESS' | 'SURFACE' | 'AIR';
  is_active: boolean;
  is_reversed_courier: boolean;
  weight_slab?: number;
  increment_weight?: number;
  weight_unit?: string;
  pickup_time?: string;
  cod_charge_hard?: number;
  cod_charge_percent?: number;
  channel_config?: {
    nickname: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CouriersResponse {
  couriers: Courier[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CouriersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: string;
  courier_type?: string;
  weight_slab?: string;
  is_reversed_courier?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  globalFilter?: string;
  sorting?: { id: string; desc: boolean }[];
}

export const useCourierOperations = () => {
  const queryClient = useQueryClient();
  const { isTokenReady } = useAuthToken();

  // Fetch all couriers with advanced filtering
  const getCouriersQuery = (params: CouriersQueryParams = {}) =>
    useQuery({
      queryKey: ['couriers', params],
      queryFn: () => {
        // Build query parameters
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.globalFilter) queryParams.append('globalFilter', params.globalFilter);
        if (params.is_active) queryParams.append('is_active', params.is_active);
        if (params.courier_type) queryParams.append('courier_type', params.courier_type);
        if (params.weight_slab) queryParams.append('weight_slab', params.weight_slab);
        if (params.is_reversed_courier) queryParams.append('is_reversed_courier', params.is_reversed_courier);
        if (params.sorting && params.sorting.length > 0) {
          queryParams.append('sorting', JSON.stringify(params.sorting));
        }

        return api.get<CouriersResponse>(`/couriers?${queryParams.toString()}`);
      },
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      enabled: isTokenReady,
    });

  // Fetch courier pricing
  const getCourierPricing = (courierId: string) =>
    useQuery({
      queryKey: ['courier-pricing', courierId],
      queryFn: () => api.get<{ result: CourierPricing }>(`/couriers/pricing/${courierId}`),
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      enabled: isTokenReady && !!courierId,
    });

  // Create Courier
  const createCourier = useMutation({
    mutationFn: (courierData: any) => api.post('/couriers', courierData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
  });

  // Update Courier
  const updateCourier = useMutation({
    mutationFn: (courierData: any) => api.put(`/couriers/${courierData.id}`, courierData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
  });

  // Delete Courier
  const deleteCourier = useMutation({
    mutationFn: (courierId: string) => api.delete(`/couriers/${courierId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
  });

  return {
    getCouriersQuery,
    getCourierPricing,
    createCourier,
    updateCourier,
    deleteCourier,
  };
};
