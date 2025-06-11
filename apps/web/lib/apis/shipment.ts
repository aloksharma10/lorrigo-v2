import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

export interface CourierRate {
  id: string;
  estimated_delivery_days: string;
  etd: string;
  rating: number;
  pickup_performance: number;
  rto_performance: number;
  delivery_performance: number;
  zone: string;
  name: string;
  courier_code: string;
  type: string;
  is_active: boolean;
  is_reversed_courier: boolean;
  weight_slab: number;
  base_price: number;
  weight_charges: number;
  cod_charges: number;
  rto_charges: number;
  total_price: number;
  final_weight: number;
  volumetric_weight: number;
  expected_pickup: string;
  nickname: string;
  breakdown: {
    actual_weight: number;
    volumetric_weight: number;
    chargeable_weight: number;
    min_weight: number;
    weight_increment_ratio: number;
  };
}

export interface ShippingRatesResponse {
  rates: CourierRate[];
  order: any;
}

export const useShippingOperations = () => {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();

  // Fetch shipping rates for an order
  const getShippingRates = (orderId: string) => {
    return useQuery({
      queryKey: ['shipping-rates', orderId],
      queryFn: () =>
        api.get(`/shipments/${orderId}/rates`).then((res: any) => res as ShippingRatesResponse),
      enabled: !!orderId && isTokenReady,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    });
  };

  // Ship order with selected courier
  const shipOrder = useMutation({
    mutationFn: ({ order_id, courier_id, schedule_pickup }: { order_id: string; courier_id: string; schedule_pickup: boolean }) =>
      api.post(`/shipments`, { order_id, courier_id, schedule_pickup }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    getShippingRates,
    shipOrder,
  };
};
