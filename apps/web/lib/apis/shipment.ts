import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiDownload } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';
import { toast } from '@lorrigo/ui/components';
import { AxiosResponse } from 'axios';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      router.push(`/seller/orders/forward-shipments/all`);
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
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      toast.success('Shipment cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel shipment');
    },
  });

  // Get all bulk operations with pagination and filters
  const getAllBulkOperations = (params: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    dateRange?: [Date, Date];
  }) => {
    return useQuery({
      enabled: isTokenReady,
      queryKey: ['bulk-operations', params],
      queryFn: async () => {
        const { page = 1, pageSize = 10, type, status, dateRange } = params;

        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('page', page.toString());
        queryParams.append('pageSize', pageSize.toString());

        if (type) queryParams.append('type', type);
        if (status) queryParams.append('status', status);

        if (dateRange) {
          queryParams.append('startDate', dateRange[0].toISOString());
          queryParams.append('endDate', dateRange[1].toISOString());
        }

        const response = await api.get(`/bulk-operations?${queryParams.toString()}`);
        return response as BulkOperationsListResponse;
      },
    });
  };

  // Download bulk operation file (report or PDF)
  const downloadBulkOperationFile = async (
    operationId: string,
    type: 'report' | 'file'
  ): Promise<AxiosResponse<any>> => {
    const response = await apiDownload.get(`/bulk-operations/${operationId}/download?type=${type}`);
    return response;
  };

  // Get bulk operation status
  const getBulkOperationStatus = (operationId: string) => {
    return useQuery({
      queryKey: ['bulk-operation-status', operationId],
      queryFn: async () => {
        const data = await api.get<{
          data: BulkOperation;
          progress: number;
          createdAt: string;
          errorMessage?: string;
          reportPath?: string;
        }>(`/bulk-operations/${operationId}`);
        return data;
      },
      enabled: !!operationId && !!operationId.trim() && isTokenReady, // Added operationId.trim() check
      refetchInterval: (query) => {
        const result = query.state.data;

        if (!result) return 2000;

        const isDone =
          result.progress >= 100 ||
          result.data.status === 'COMPLETED' ||
          result.data.status === 'FAILED';

        console.log('Refetch interval check:', {
          progress: result.progress,
          status: result.data.status,
          isDone,
        });

        return isDone ? false : 2000;
      },
      staleTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    });
  };

  // Create bulk shipments - maintaining original functionality
  const createBulkShipments = useMutation({
    mutationFn: async (data: {
      order_ids?: string[];
      courier_ids?: string[];
      is_schedule_pickup?: boolean;
      pickup_date?: string;
      filters?: {
        status?: string | undefined;
        dateRange?: [string | undefined, string | undefined];
      };
    }) => {
      const response = await api.post<any>('/bulk-operations/shipments', data);
      return response as BulkOperationResponse;
    },
    onSuccess: () => {
      toast.success('Bulk shipment creation started');
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to start bulk shipment creation: ${error.message || 'Unknown error'}`);
    },
  });

  // Schedule bulk pickups
  const scheduleBulkPickups = useMutation({
    mutationFn: async (data: {
      shipment_ids?: string[];
      pickup_date: string;
      filters?: {
        status?: string | undefined;
        dateRange?: [string | undefined, string | undefined];
      };
    }) => {
      const response = await api.post<any>('/bulk-operations/pickups', data);
      return response.data as BulkOperationResponse;
    },
    onSuccess: () => {
      toast.success('Bulk pickup scheduling started');
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to start bulk pickup scheduling: ${error.message || 'Unknown error'}`);
    },
  });

  // Cancel bulk shipments
  const cancelBulkShipments = useMutation({
    mutationFn: async (data: {
      shipment_ids?: string[];
      reason: string;
      filters?: {
        status?: string | undefined;
        dateRange?: [string | undefined, string | undefined];
      };
    }) => {
      const response = await api.post<any>('/bulk-operations/cancel', data);
      return response.data as BulkOperationResponse;
    },
    onSuccess: () => {
      toast.success('Bulk shipment cancellation started');
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
    },
    onError: (error: any) => {
      toast.error(
        `Failed to start bulk shipment cancellation: ${error.message || 'Unknown error'}`
      );
    },
  });

  // Download bulk labels
  const downloadBulkLabels = useMutation({
    mutationFn: async (data: { shipment_ids: string[] }) => {
      const response = await api.post<any>('/bulk-operations/labels', data);
      return response.data as BulkOperationResponse;
    },
    onSuccess: () => {
      toast.success('Bulk label generation started');
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to start bulk label generation: ${error.message || 'Unknown error'}`);
    },
  });

  // Edit bulk pickup addresses
  const editBulkPickupAddresses = useMutation({
    mutationFn: async (data: {
      shipments: Array<{
        shipment_id: string;
        hub_id: string;
      }>;
    }) => {
      const response = await api.post<any>('/bulk-operations/pickup-addresses', data);
      return response.data as BulkOperationResponse;
    },
    onSuccess: () => {
      toast.success('Bulk pickup address update started');
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
    },
    onError: (error: any) => {
      toast.error(
        `Failed to start bulk pickup address update: ${error.message || 'Unknown error'}`
      );
    },
  });

  return {
    getShippingRates,
    shipOrder,
    schedulePickup,
    cancelShipment,
    getAllBulkOperations,
    downloadBulkOperationFile,
    getBulkOperationStatus,
    createBulkShipments,
    scheduleBulkPickups,
    cancelBulkShipments,
    downloadBulkLabels,
    editBulkPickupAddresses,
  };
};
