import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

// Types for NDR operations
export interface NDROrder {
  id: string;
  order_id?: string;
  shipment_id?: string;
  customer_id: string;
  courier_id?: string;
  awb: string;
  attempts: number;
  cancellation_reason?: string;
  ndr_raised_at: string;
  action_taken: boolean;
  action_type?: 'reattempt' | 'return' | 'cancel' | 'fake-attempt';
  action_comment?: string;
  action_date?: string;
  created_at: string;
  updated_at: string;

  // Relationships
  order?: {
    id: string;
    code: string;
    order_reference_id?: string;
    customer?: {
      name: string;
      phone: string;
      email?: string;
      address?: {
        address: string;
        city: string;
        state: string;
        pincode: string;
      };
    };
  };
  shipment?: {
    id: string;
    order?: {
      id: string;
      code: string;
      order_reference_id?: string;
      customer?: {
        name: string;
        phone: string;
        email?: string;
        address?: {
          address: string;
          city: string;
          state: string;
          pincode: string;
        };
      };
    };
    courier?: {
      id: string;
      channel_config?: {
        name: string;
      };
    };
  };
  customer?: {
    name: string;
    phone: string;
    email?: string;
    address?: {
      address: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  courier?: {
    id: string;
    channel_config?: {
      name: string;
    };
  };
  ndr_history?: Array<{
    id: string;
    ndr_reason: string;
    comment?: string;
    ndr_raised_at: string;
    created_at: string;
  }>;
}

export interface NDRApiResponse {
  success: boolean;
  data: NDROrder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface NDRStats {
  total: number;
  pending: number;
  completed: number;
  actionBreakdown: Record<string, number>;
}

export interface NDRQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  awb?: string;
  startDate?: string;
  endDate?: string;
  actionTaken?: boolean;
  actionType?: 'reattempt' | 'return' | 'cancel' | 'fake-attempt';
}

export interface NDRActionRequest {
  ndrId: string;
  actionType: 'reattempt' | 'return' | 'cancel' | 'fake-attempt';
  comment: string;
  nextAttemptDate?: string;
}

export interface BulkNDRActionRequest {
  ndrIds: string[];
  actionType: 'reattempt' | 'return' | 'cancel' | 'fake-attempt';
  comment: string;
  nextAttemptDate?: string;
}

export interface CreateNDRRequest {
  awb: string;
  customerId: string;
  shipmentId?: string;
  orderId?: string;
  courierId?: string;
  cancellationReason?: string;
  ndrRaisedAt?: string;
}

export interface BulkOperationStatus {
  id: string;
  code: string;
  type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processed_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Custom hook for NDR operations
 */
export const useNDROperations = (queryParams: NDRQueryParams = {}) => {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();

  // Fetch NDR orders
  const ndrOrdersQuery = useQuery({
    queryKey: ['ndr-orders', queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const response = await api.get<NDRApiResponse>(`/ndr/orders?${params.toString()}`);
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: isTokenReady,
    refetchOnWindowFocus: false,
  });

  // Fetch NDR statistics
  const ndrStatsQuery = useQuery({
    queryKey: ['ndr-stats'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: NDRStats }>('/ndr/stats');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: isTokenReady,
  });

  // Take single NDR action
  const takeNDRAction = useMutation({
    mutationFn: async (actionData: NDRActionRequest) => {
      const response = await api.post('/ndr/action', actionData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndr-orders'] });
      queryClient.invalidateQueries({ queryKey: ['ndr-stats'] });
    },
  });

  // Take bulk NDR action
  const takeBulkNDRAction = useMutation({
    mutationFn: async (actionData: BulkNDRActionRequest) => {
      const response = await api.post<{
        success: boolean;
        message: string;
        operationId: string;
      }>('/ndr/bulk-action', actionData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndr-orders'] });
      queryClient.invalidateQueries({ queryKey: ['ndr-stats'] });
    },
  });

  // Create NDR record
  const createNDRRecord = useMutation({
    mutationFn: async (ndrData: CreateNDRRequest) => {
      const response = await api.post('/ndr/create', ndrData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndr-orders'] });
      queryClient.invalidateQueries({ queryKey: ['ndr-stats'] });
    },
  });

  return {
    ndrOrdersQuery,
    ndrStatsQuery,
    takeNDRAction,
    takeBulkNDRAction,
    createNDRRecord,
  };
};

/**
 * Hook for tracking bulk operation status
 */
export const useBulkOperationStatus = (operationId?: string) => {
  const { isTokenReady } = useAuthToken();

  return useQuery({
    queryKey: ['bulk-operation-status', operationId],
    queryFn: async () => {
      if (!operationId) throw new Error('Operation ID is required');
      
      const response = await api.get<{
        success: boolean;
        data: BulkOperationStatus;
      }>(`/ndr/bulk-status/${operationId}`);
      return response.data;
    },
    enabled: !!operationId && isTokenReady,
    refetchInterval: 3000, // Poll every 3 seconds for status updates
    staleTime: 0, // Always fetch fresh data for status
  });
};

/**
 * Client-side fetch function for React Query (compatible with existing patterns)
 */
export async function fetchNDROrders(params: NDRQueryParams): Promise<NDRApiResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.awb) queryParams.append('awb', params.awb);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.actionTaken !== undefined) queryParams.append('actionTaken', params.actionTaken.toString());
    if (params.actionType) queryParams.append('actionType', params.actionType);

    const response = await api.get<NDRApiResponse>(`/ndr/orders?${queryParams.toString()}`);
    return response;
  } catch (error) {
    console.error('Error fetching NDR orders:', error);
    throw error;
  }
}

/**
 * Take NDR action for single order
 */
export async function takeNDRActionAPI(actionData: NDRActionRequest) {
  try {
    const response = await api.post('/ndr/action', actionData);
    return response;
  } catch (error) {
    console.error('Error taking NDR action:', error);
    throw error;
  }
}

/**
 * Take bulk NDR action
 */
export async function takeBulkNDRActionAPI(actionData: BulkNDRActionRequest) {
  try {
    const response = await api.post('/ndr/bulk-action', actionData);
    return response;
  } catch (error) {
    console.error('Error taking bulk NDR action:', error);
    throw error;
  }
}

/**
 * Get bulk operation status
 */
export async function getBulkOperationStatusAPI(operationId: string) {
  try {
    const response = await api.get(`/ndr/bulk-status/${operationId}`);
    return response;
  } catch (error) {
    console.error('Error getting bulk operation status:', error);
    throw error;
  }
} 