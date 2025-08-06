'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useShopifyAuth } from '@/lib/apis/channels/shopify/shopify-auth';
import { useAuthToken } from '@/components/providers/token-provider';
import { getRoleBasedRedirect } from '@/lib/routes/redirect';
import { Role } from '@lorrigo/db';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@lorrigo/ui/components';

export default function ShopifyCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuthToken, isTokenReady } = useAuthToken();
  const [isLoading, setIsLoading] = useState(true);
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  
  // Use React Query hooks for Shopify operations
  const { getAuthUrl, handleLoginCallback, connectShopifyStore } = useShopifyAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Only process the callback once
        if (processed) return;
        setProcessed(true);

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const shop = searchParams.get('shop');

        // If we have shop but no code, this means we need to redirect to OAuth
        if (shop && !code) {
          try {
            const authUrl = await getAuthUrl.mutateAsync(shop);
            window.location.href = authUrl;
            return;
          } catch (err: any) {
            console.error('Failed to get Shopify login URL:', err);
            setError(err.message || 'Failed to get Shopify login URL');
            setIsLoading(false);
            return;
          }
        }

        // If we have code, state, and shop, handle the OAuth callback
        if (code && state && shop) {
          if (isTokenReady || session?.user?.email) {

            try {
              // Call the connect API to attach Shopify store to existing account
              const response = await connectShopifyStore.mutateAsync({ code, state, shop });

              if (response.success) {
                // Successfully connected, redirect to channels page
                setTimeout(() => {
                  router.push('/seller/channels?shopify=connected');
                }, 2000);
                return;
              } else {
                setError(response.error || 'Failed to connect Shopify store');
                setIsLoading(false);
                return;
              }
            } catch (err: any) {
              console.error('Error connecting Shopify store:', err);
              setError(err.response?.data?.error || err.message || 'Failed to connect Shopify store');
              setIsLoading(false);
              return;
            }
          } else {
            // Handle Shopify OAuth callback for login
            try {
              const result = await handleLoginCallback.mutateAsync({ code, state, shop });

              // Use NextAuth signIn with the Shopify token
              const signInResult = await signIn('credentials', {
                email: result.user.email,
                password: result.token, // Use token as password for Shopify auth
                redirect: false,
              });

              if (signInResult?.error) {
                setError('Failed to authenticate with Shopify');
                setIsLoading(false);
                return;
              }

              setAuthToken(result.token);

              // For non-embedded apps, redirect to the app's dashboard
              const redirectUrl = getRoleBasedRedirect(result.user.role as Role);

              // Add a small delay to ensure session is created
              setTimeout(() => {
                router.push(redirectUrl);
              }, 500);
              return;
            } catch (err: any) {
              console.error('Error handling Shopify login callback:', err);
              setError(err.message || 'Failed to authenticate with Shopify');
              setIsLoading(false);
              return;
            }
          }
        }

        // If we don't have the required parameters, show error
        setIsLoading(false);
      } catch (err) {
        console.error('Unexpected error in Shopify callback:', err);
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router, setAuthToken, processed, getAuthUrl, handleLoginCallback, connectShopifyStore, isTokenReady, session]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          </div>
          <h1 className="mb-2 text-xl font-semibold">{isTokenReady ? 'Connecting Shopify Store...' : 'Connecting to Shopify...'}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isTokenReady ? 'Please wait while we connect your Shopify store to your account.' : 'Please wait while we complete your authentication.'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mx-auto max-w-md text-center">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <button
              onClick={() => router.push(isTokenReady ? '/seller/channels' : '/auth/signin')}
              className="mr-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              {isTokenReady ? 'Back to Channels' : 'Back to Sign In'}
            </button>
            <button onClick={() => window.location.reload()} className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
