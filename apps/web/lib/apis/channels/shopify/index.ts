import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuthToken } from '@/components/providers/token-provider';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

// Types
export interface ShopifyConnection {
  id: string;
  shop: string;
  access_token: string;
  scope: string;
  connected_at: string;
  status: 'active' | 'inactive';
}

export interface ShopifyOrder {
  id: number;
  order_number: string;
  name: string;
  email: string;
  total_price: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  updated_at: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string | null;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone: string;
  };
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string;
  }>;
}

/**
 * Custom hook for all Shopify operations
 * Provides all Shopify-related queries and mutations in one place
 */
export const useShopify = () => {
  const queryClient = useQueryClient();
  const { status } = useSession();
  const { isTokenReady } = useAuthToken();

  // Get Shopify connection status
  const connection = useQuery({
    queryKey: ['channels', 'shopify', 'connection'],
    queryFn: async () => {
      const response = await apiClient.get<ShopifyConnection>('/channels/shopify/connection');
      return response.data;
    },
    enabled: isTokenReady,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate Shopify auth URL
  const initiateAuth = useMutation({
    mutationFn: async (shopDomain?: string) => {
      const params = shopDomain ? { shop: shopDomain } : {};
      const response = await apiClient.get<{ authUrl: string }>('/channels/shopify/auth/url', {
        params,
      });
      return response.data.authUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'shopify', 'connection'] });
    },
  });

  // Disconnect Shopify store
  const disconnect = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete('/channels/shopify/connection');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'shopify', 'connection'] });
    },
  });

  // Get Shopify orders with pagination and filters
  const getOrders = (page = 1, limit = 10, status?: string, dateRange?: { start: string; end: string }) => {
    return useQuery({
      queryKey: ['channels', 'shopify', 'orders', { page, limit, status, dateRange }],
      queryFn: async () => {
        const params: Record<string, string | number> = {
          limit,
          page,
        };

        if (status) params.status = status;
        if (dateRange) {
          params.created_at_min = dateRange.start;
          params.created_at_max = dateRange.end;
        }

        const response = await apiClient.get<{
          success: boolean;
          count: number;
          data: ShopifyOrder[];
        }>('/channels/shopify/orders', { params });

        return {
          orders: response.data.data,
          total: response.data.count,
        };
      },
      enabled: status === 'authenticated' && isTokenReady,
      placeholderData: (previousData) => previousData,
      retry: (failureCount, error) => {
        const axiosError = error as AxiosError;
        // Don't retry on 401/404 errors
        if (axiosError.response?.status === 401 || axiosError.response?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    });
  };

  // Get a specific Shopify order
  const getOrder = (orderId: string | number | null) => {
    return useQuery({
      queryKey: ['channels', 'shopify', 'order', orderId],
      queryFn: async () => {
        const response = await apiClient.get<{
          success: boolean;
          data: ShopifyOrder;
        }>(`/channels/shopify/orders/${orderId}`);

        return response.data.data;
      },
      enabled: status === 'authenticated' && isTokenReady && !!orderId,
      retry: (failureCount, error) => {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    });
  };

  return {
    // Connection operations
    connection,
    initiateAuth,
    disconnect,

    // Order operations
    getOrders,
    getOrder,
  };
};
