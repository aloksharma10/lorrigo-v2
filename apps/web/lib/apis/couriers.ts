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

export const useCourierOperations = () => {
  const queryClient = useQueryClient();
  const { isTokenReady } = useAuthToken();

  // Fetch all couriers
  const getCouriersQuery = useQuery({
    queryKey: ['couriers'],
    queryFn: () => api.get<any>('/couriers'),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: isTokenReady, // Only run query when token is ready
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
      enabled: isTokenReady && !!courierId, // Only run query when token is ready and courierId is provided
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
