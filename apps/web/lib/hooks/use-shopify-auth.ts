import { useState } from 'react';
import { getShopifyLoginUrl } from '@/lib/apis/channels/shopify/shopify-auth';

export const useShopifyAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithShopify = async (shop?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const authUrl = await getShopifyLoginUrl(shop);

      // Redirect to Shopify OAuth
      window.location.href = authUrl;
    } catch (err) {
      console.error('Shopify auth error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate Shopify login');
      setIsLoading(false);
    }
  };

  return {
    loginWithShopify,
    isLoading,
    error,
  };
};
