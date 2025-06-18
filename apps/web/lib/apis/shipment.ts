import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';
import { toast } from '@lorrigo/ui/components';

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

export interface BulkOperation {
  id: string;
  code: string;
  type: 'CREATE_SHIPMENT' | 'SCHEDULE_PICKUP' | 'CANCEL_SHIPMENT';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  progress?: number;
  results?: Array<{
    id: string;
    success: boolean;
    message: string;
    data?: any;
  }>;
}

export interface BulkOperationFilters {
  status?: string;
  dateRange?: [string | undefined, string | undefined];
}

export interface BulkOperationResponse {
  success: boolean;
  operation: BulkOperation;
  message?: string;
  error?: string;
}

export interface BulkOperationsListResponse {
  data: BulkOperation[];
  meta: {
    total: number;
    pageCount: number;
    page: number;
    pageSize: number;
  };
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
    mutationFn: ({
      order_id,
      courier_id,
      is_schedule_pickup,
    }: {
      order_id: string;
      courier_id: string;
      is_schedule_pickup: boolean;
    }) => api.post(`/shipments`, { order_id, courier_id, is_schedule_pickup }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      toast.error(error.response.data.error);
    },
  });

  // Schedule pickup for a shipment
  const schedulePickup = useMutation({
    mutationFn: ({ shipmentId, pickupDate }: { shipmentId: string; pickupDate: string }) =>
      api.post(`/shipments/${shipmentId}/schedule-pickup`, { pickupDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Pickup scheduled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to schedule pickup');
    },
  });

  // Cancel a shipment
  const cancelShipment = useMutation({
    mutationFn: ({
      shipmentId,
      reason,
      cancelType,
    }: {
      shipmentId: string;
      reason: string;
      cancelType: 'shipment' | 'order';
    }) => api.post(`/shipments/${shipmentId}/cancel`, { reason, cancelType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel shipment');
    },
  });

  // Bulk create shipments
  const bulkCreateShipments = useMutation({
    mutationFn: ({
      order_ids,
      courier_ids,
      is_schedule_pickup,
      pickup_date,
      filters,
    }: {
      order_ids?: string[];
      courier_ids?: string[];
      is_schedule_pickup?: boolean;
      pickup_date?: string;
      filters?: BulkOperationFilters;
    }) =>
      api.post('/shipments/bulk/create', {
        order_ids,
        courier_ids,
        is_schedule_pickup,
        pickup_date,
        filters,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
      toast.success('Bulk shipment creation initiated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create bulk shipments');
    },
  });

  // Bulk schedule pickup
  const bulkSchedulePickup = useMutation({
    mutationFn: ({
      shipment_ids,
      pickup_date,
      filters,
    }: {
      shipment_ids?: string[];
      pickup_date: string;
      filters?: BulkOperationFilters;
    }) =>
      api.post('/shipments/bulk/schedule-pickup', {
        shipment_ids,
        pickup_date,
        filters,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
      toast.success('Bulk pickup scheduling initiated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to schedule bulk pickups');
    },
  });

  // Bulk cancel shipments
  const bulkCancelShipments = useMutation({
    mutationFn: ({
      shipment_ids,
      reason,
      filters,
    }: {
      shipment_ids?: string[];
      reason: string;
      filters?: BulkOperationFilters;
    }) =>
      api.post('/shipments/bulk/cancel', {
        shipment_ids,
        reason,
        filters,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
      toast.success('Bulk shipment cancellation initiated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel bulk shipments');
    },
  });

  // Get bulk operation status
  const getBulkOperationStatus = (operationId: string) => {
    return useQuery({
      queryKey: ['bulk-operation', operationId],
      queryFn: () =>
        api
          .get<BulkOperationResponse>(`/shipments/bulk-operations/${operationId}`)
          .then((res: any) => res.data),
      enabled: !!operationId && isTokenReady,
      refetchInterval: (query) => {
        const data = query.state.data as BulkOperationResponse | undefined;
        // Auto-refresh until operation is complete
        return data?.operation?.status === 'COMPLETED' || data?.operation?.status === 'FAILED'
          ? false
          : 5000; // refresh every 5 seconds
      },
    });
  };

  // Get all bulk operations
  const getAllBulkOperations = (params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    dateRange?: [Date, Date];
  }) => {
    return useQuery({
      queryKey: ['bulk-operations', params],
      queryFn: () =>
        api
          .get<BulkOperationsListResponse>('/shipments/bulk-operations', { params })
          .then((res: any) => res),
      enabled: isTokenReady,
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  };

  return {
    getShippingRates,
    shipOrder,
    schedulePickup,
    cancelShipment,
    bulkCreateShipments,
    bulkSchedulePickup,
    bulkCancelShipments,
    getBulkOperationStatus,
    getAllBulkOperations,
  };
};
