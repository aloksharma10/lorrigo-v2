import { apiClient } from '@/components/providers/token-provider';

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

/**
 * Get Shopify OAuth URL for login (creates new session)
 */
export const getShopifyLoginUrl = async (shop?: string): Promise<string> => {
  const params = shop ? { shop } : {};
  const response = await apiClient.get<ShopifyLoginResponse>('/auth/shopify/auth-url', { params });

  if (!response.data.success || !response.data.authUrl) {
    throw new Error(response.data.message || 'Failed to get Shopify login URL');
  }

  return response.data.authUrl;
};

/**
 * Handle Shopify OAuth callback for login (creates new session)
 */
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
