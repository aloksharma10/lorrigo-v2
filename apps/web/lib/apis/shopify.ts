import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuthToken } from '@/components/providers/token-provider';
import { useSession } from 'next-auth/react';
import axios, { AxiosError } from 'axios';

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

// Generate Shopify auth URL
export const useInitiateShopifyAuth = () => {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async (shopDomain: string) => {
         const response = await apiClient.get<{ authUrl: string }>('/shopify/auth/url', {
            params: { shop: shopDomain }
         });
         return response.data.authUrl;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['shopifyConnection'] });
      },
   });
};

// Get Shopify connection status
export const useShopifyConnection = () => {
   const { status } = useSession();
   const { isTokenReady } = useAuthToken()

   return useQuery({
      queryKey: ['shopifyConnection'],
      queryFn: async () => {
         const response = await apiClient.get<ShopifyConnection>('/shopify/connection');
         return response.data;
      },
      enabled: isTokenReady,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
   });
};

// Disconnect Shopify store
export const useDisconnectShopify = () => {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async () => {
         const response = await apiClient.delete('/shopify/connection');
         return response.data;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['shopifyConnection'] });
      },
   });
};

// Get Shopify orders with pagination and filters
export const useShopifyOrders = (
   page = 1,
   limit = 10,
   status?: string,
   dateRange?: { start: string; end: string }
) => {
   const { status: sessionStatus } = useSession();
   const queryClient = useQueryClient();

   return useQuery({
      queryKey: ['shopifyOrders', page, limit, status, dateRange],
      queryFn: async () => {
         const params: Record<string, string | number> = {
            limit,
            page
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
         }>('/shopify/orders', { params });

         return {
            orders: response.data.data,
            total: response.data.count
         };
      },
      enabled: sessionStatus === 'authenticated',
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
export const useShopifyOrder = (orderId: string | number | null) => {
   const { status } = useSession();

   return useQuery({
      queryKey: ['shopifyOrder', orderId],
      queryFn: async () => {
         const response = await apiClient.get<{
            success: boolean;
            data: ShopifyOrder;
         }>(`/shopify/orders/${orderId}`);

         return response.data.data;
      },
      enabled: status === 'authenticated' && !!orderId,
      retry: (failureCount, error) => {
         const axiosError = error as AxiosError;
         if (axiosError.response?.status === 404) {
            return false;
         }
         return failureCount < 2;
      },
   });
};
