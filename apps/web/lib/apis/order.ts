import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { BackendOrder, OrderFormValues } from '@lorrigo/utils';
import {
  ApiResponse,
  OrderQueryParams,
  OrdersApiResponse,
  ShipmentParams,
} from '../type/response-types';
import { useAuthToken } from '@/components/providers/token-provider';

// Comprehensive hook for order operations
export const useOrderOperations = (queryParams: OrderQueryParams = {}, orderId?: string) => {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();

  // Get order statistics
  const getOrderStats = useMutation({
    mutationFn: (period: string = 'month') => api.get('/orders/stats', { params: { period } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Fetch all orders
  const ordersQuery = useQuery({
    queryKey: ['orders', queryParams],
    queryFn: async () => await api.get<OrdersApiResponse>('/orders', { params: queryParams }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: isTokenReady,
  });

  // Fetch single order
  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => await api.get<BackendOrder>(`/orders/${orderId}`),
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create order
  const createOrder = useMutation({
    mutationFn: (orderData: OrderFormValues) => api.post('/orders', orderData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      return data;
    },
  });

  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api.patch(`/orders/${id}/status`, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Cancel order
  const cancelOrder = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/orders/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
  const bulkCancelOrders = useMutation({
    mutationFn: (orderIds: string[], reason?: string) =>
      api.post(`/orders/bulk-cancel`, { orderIds, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  //   const downloadManifestMutation = useMutation({
  //    mutationFn: async (shipments: Shipment[]) => {
  //      const shipmentIds = shipments.map((s) => s.id);
  //      return downloadManifest(shipmentIds);
  //    },
  //    onSuccess: (result) => {
  //      toast.success(`Downloaded manifest for ${result.count} shipments`);
  //    },
  //    onError: () => {
  //      toast.error('Failed to download manifest');
  //    },
  //  });

  //  const generateLabelsMutation = useMutation({
  //    mutationFn: async (shipments: Shipment[]) => {
  //      const shipmentIds = shipments.map((s) => s.id);
  //      return generateLabels(shipmentIds);
  //    },
  //    onSuccess: (result) => {
  //      toast.success(`Generated labels for ${result.count} shipments`);
  //    },
  //    onError: () => {
  //      toast.error('Failed to generate labels');
  //    },
  //  });

  return {
    ordersQuery,
    orderQuery,
    createOrder,
    updateOrderStatus,
    cancelOrder,
    bulkCancelOrders,
    getOrderStats,
  };
};

// Client-side fetch function for React Query
export async function fetchOrders(params: any) {
  try {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', (params.page + 1).toString()); // Convert 0-based to 1-based
    if (params.pageSize) queryParams.append('limit', params.pageSize.toString());
    if (params.status && params.status !== 'all')
      queryParams.append('status', params.status.toUpperCase());
    if (params.globalFilter) queryParams.append('search', params.globalFilter);
    if (params.dateRange?.from) {
      const from = params.dateRange.from;
      queryParams.append(
        'from_date',
        `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`
      );
    }
    if (params.dateRange?.to) {
      const to = params.dateRange.to;
      queryParams.append(
        'to_date',
        `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`
      );
    }

    // Handle sorting
    if (params.sort && params.sort.length > 0) {
      const sortField = params.sort[0].id;
      const sortOrder = params.sort[0].desc ? 'desc' : 'asc';
      queryParams.append('sort', sortField);
      queryParams.append('order', sortOrder);
    }

    const response = await api.get<OrdersApiResponse>(`/orders?${queryParams.toString()}`);
    // Response structure: { data: OrdersApiResponse }
    const responseData = response;

    // Transform backend response to match frontend expectations
    return {
      data: responseData.orders.map((order: BackendOrder) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || 'N/A',
        customerEmail: order.customer?.email || '',
        customerPhone: order.customer?.phone || 'N/A',
        amount: order.totalAmount,
        hub: {
          lorrigoPickupId: order.hub?.lorrigoPickupId || 'N/A',
          name: order.hub?.name || 'N/A',
          address: order.hub?.address || 'N/A',
        },
        packageDetails: {
          length: order.packageDetails.length,
          breadth: order.packageDetails.breadth,
          height: order.packageDetails.height,
          deadWeight: order.packageDetails.deadWeight,
          volumetricWeight: order.packageDetails.volumetricWeight,
        },
        paymentType: order.paymentType,
        amountToCollect: order.amountToCollect,
        totalAmount: order.totalAmount,
        customerId: order.customerId,
        status: order.status,
        // addressVerified: true, // Default for now
        awb: order.awb || 'N/A',
        pickupDate: order.pickupDate || '',
        edd: order.edd || '',
        pickupId: order.pickupId || '',
        trackingEvents: order.trackingEvents || [],
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      meta: {
        total: responseData.total,
        pageCount: responseData.totalPages,
        page: responseData.page - 1, // Convert 1-based to 0-based
        pageSize: responseData.limit,
      },
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

// React Query compatible fetch function
export async function fetchShipments(params: ShipmentParams): Promise<ApiResponse> {
  return fetchOrders(params);
}

export async function downloadManifest(shipmentIds: string[]) {
  // Mock implementation - replace with actual API call
  console.log('Downloading manifest for shipments:', shipmentIds);
  return { count: shipmentIds.length };
}

export async function generateLabels(shipmentIds: string[]) {
  // Mock implementation - replace with actual API call
  console.log('Generating labels for shipments:', shipmentIds);
  return { count: shipmentIds.length };
}

export async function cancelOrders(shipmentIds: string[]) {
  // Mock implementation - replace with actual API call
  console.log('Cancelling orders:', shipmentIds);
  return { count: shipmentIds.length };
}
