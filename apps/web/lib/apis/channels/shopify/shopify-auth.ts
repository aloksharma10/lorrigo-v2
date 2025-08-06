import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuthToken } from '@/components/providers/token-provider';
import { api } from '@/lib/apis/axios';

export interface ShopifyLoginResponse {
  success: boolean;
  authUrl?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    hasPasskeys: boolean;
  };
  token?: string;
  message?: string;
}

export interface ShopifyConnectResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Direct API functions for immediate use (without React Query hooks)
export const getShopifyLoginUrl = async (shop?: string): Promise<string> => {
  const params = shop ? { shop } : {};
  const response = await apiClient.get<ShopifyLoginResponse>('/auth/shopify/auth-url', { params });

  if (!response.data.success || !response.data.authUrl) {
    throw new Error(response.data.message || 'Failed to get Shopify login URL');
  }

  return response.data.authUrl;
};

export const handleShopifyLoginCallback = async (code: string, state: string, shop: string): Promise<{ user: any; token: string }> => {
  const response = await apiClient.get<ShopifyLoginResponse>('/auth/shopify/callback', {
    params: { code, state, shop },
  });

  if (!response.data.success || !response.data.user || !response.data.token) {
    throw new Error(response.data.message || 'Please try again');
  }

  return {
    user: response.data.user,
    token: response.data.token,
  };
};

// React Query hooks for Shopify authentication operations
export const useShopifyAuth = () => {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();

  // Get Shopify OAuth URL for login
  const getAuthUrl = useMutation({
    mutationFn: async (shop?: string) => {
      const params = shop ? { shop } : {};
      const response = await apiClient.get<ShopifyLoginResponse>('/auth/shopify/auth-url', { params });

      if (!response.data.success || !response.data.authUrl) {
        throw new Error(response.data.message || 'Failed to get Shopify login URL');
      }

      return response.data.authUrl;
    },
  });

  // Handle Shopify OAuth callback for login
  const handleLoginCallback = useMutation({
    mutationFn: async ({ code, state, shop }: { code: string; state: string; shop: string }) => {
      const response = await apiClient.get<ShopifyLoginResponse>('/auth/shopify/callback', {
        params: { code, state, shop },
      });

      if (!response.data.success || !response.data.user || !response.data.token) {
        throw new Error(response.data.message || 'Please try again');
      }

      return {
        user: response.data.user,
        token: response.data.token,
      };
    },
  });

  // Connect Shopify store to existing account
  const connectShopifyStore = useMutation({
    mutationFn: async ({ code, state, shop }: { code: string; state: string; shop: string }) => {
      const response = await api.post<any>('/channels/shopify/connect', { code, state, shop });
      return response;
    },
    onSuccess: () => {
      // Invalidate relevant queries after successful connection
      queryClient.invalidateQueries({ queryKey: ['channels', 'shopify', 'connection'] });
    },
  });

  return {
    getAuthUrl,
    handleLoginCallback,
    connectShopifyStore,
  };
};
