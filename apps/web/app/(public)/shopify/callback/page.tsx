'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { handleShopifyCallback, getShopifyAuthUrl } from '@/lib/apis/shopify-auth';
import { useAuthToken } from '@/components/providers/token-provider';
import { getRoleBasedRedirect } from '@/lib/routes/redirect';
import { Role } from '@lorrigo/db';
import { Loader2 } from 'lucide-react';

export default function ShopifyCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuthToken } = useAuthToken();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Only process the callback once
        if (processed) return;
        setProcessed(true);

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const shop = searchParams.get('shop');
        const hmac = searchParams.get('hmac');
        const timestamp = searchParams.get('timestamp');
        const host = searchParams.get('host');

        console.log('Shopify callback received:', { 
          shop, 
          code: code ? 'present' : 'missing', 
          state: state ? 'present' : 'missing',
          host 
        });

        // If we have shop but no code, this means we need to redirect to OAuth
        if (shop && !code) {
          try {
            const authUrl = await getShopifyAuthUrl(shop);
            console.log('Redirecting to Shopify OAuth:', authUrl);
            window.location.href = authUrl;
            return;
          } catch (err) {
            console.error('Failed to get Shopify auth URL:', err);
            setError('Failed to initiate Shopify authentication');
            setIsLoading(false);
            return;
          }
        }

        // If we have code, state, and shop, handle the OAuth callback
        if (code && state && shop) {
          console.log('Processing OAuth callback with:', { code: code.substring(0, 10) + '...', state, shop });
          
          // Handle Shopify OAuth callback
          const result = await handleShopifyCallback(code, state, shop);
          console.log('OAuth callback result:', { user: result.user.email, hasToken: !!result.token });

          // Use NextAuth signIn with the Shopify token
          const signInResult = await signIn('credentials', {
            email: result.user.email,
            password: result.token, // Use token as password for Shopify auth
            redirect: false,
          });

          if (signInResult?.error) {
            console.error('NextAuth signIn failed:', signInResult.error);
            setError('Failed to create session');
            setIsLoading(false);
            return;
          }

          console.log('NextAuth signIn successful');

          // Set auth token for API calls
          setAuthToken(result.token);
          console.log('Auth token set successfully');

          // For non-embedded apps, redirect to the app's dashboard
          const redirectUrl = getRoleBasedRedirect(result.user.role as Role);
          console.log('Redirecting to app dashboard:', redirectUrl);
          
          // Add a small delay to ensure session is created
          setTimeout(() => {
            router.push(redirectUrl);
          }, 500);
          return;
        }

        // If we don't have the required parameters, show error
        setError('Missing required OAuth parameters');
        setIsLoading(false);
      } catch (err) {
        console.error('Shopify callback error:', err);
        setError(err instanceof Error ? err.message : 'Failed to authenticate with Shopify');
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router, setAuthToken, processed]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Connecting to Shopify...</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please wait while we complete your authentication.
          </p>
        </div>
      </div>
    );
  }

  // if (error) {
  //   return (
  //     <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
  //       <div className="mx-auto max-w-md text-center">
  //         <Alert variant="destructive" className="mb-4">
  //           <AlertCircle className="h-4 w-4" />
  //           <AlertDescription>{error}</AlertDescription>
  //         </Alert>
  //         <div className="space-y-2">
  //           <button
  //             onClick={() => router.push('/auth/signin')}
  //             className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 mr-2"
  //           >
  //             Back to Sign In
  //           </button>
  //           <button
  //             onClick={() => window.location.reload()}
  //             className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500"
  //           >
  //             Try Again
  //           </button>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return null;
} 