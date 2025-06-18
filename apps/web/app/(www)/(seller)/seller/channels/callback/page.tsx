'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/components/providers/token-provider';
import { Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@lorrigo/ui/components';
import { useSession } from 'next-auth/react';

export default function ShopifyCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status: sessionStatus } = useSession();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Only process the callback once
        if (processed) return;
        setProcessed(true);

        const shop = searchParams.get('shop');
        const code = searchParams.get('code');
        const hmac = searchParams.get('hmac');
        const timestamp = searchParams.get('timestamp');
        const host = searchParams.get('host');

        if (!shop) {
          setError('Missing shop parameter');
          setIsLoading(false);
          return;
        }

        // Check if session is ready
        if (!session?.user?.token) {
          return; // Don't set error, just wait for session
        }

        // Call the backend to handle the callback
        const response = await apiClient.get('/channels/shopify/callback', {
          params: {
            shop,
            code,
            hmac,
            timestamp,
            host,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.user?.token}`,
          },
        });

        if (response.data.success) {
          // Redirect to success page
          router.push('/seller/channels/success');
        } else if (response.data.needsReauthorization && response.data.authUrl) {
          // Redirect to the new auth URL
          window.location.href = response.data.authUrl;
        } else if (response.data.authUrl) {
          // Redirect to the auth URL
          window.location.href = response.data.authUrl;
        } else {
          setError(response.data.error || 'Failed to connect to Shopify');
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Error handling Shopify callback:', err);
        const errorMessage =
          err.response?.data?.error || 'An error occurred while connecting to Shopify';
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    // Only run the callback handler when session is available
    if (sessionStatus === 'authenticated' && session?.user?.token) {
      handleCallback();
    } else if (sessionStatus === 'unauthenticated') {
      setError('Authentication required. Please log in and try again.');
      setIsLoading(false);
    }
  }, [searchParams, router, session, sessionStatus, processed]);

  if (error) {
    return (
      <div className="container flex flex-col items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <button
          onClick={() => router.push('/seller/channels')}
          className="bg-primary hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-white"
        >
          Return to Channels
        </button>
      </div>
    );
  }

  return (
    <div className="container flex flex-col items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <h1 className="text-xl font-medium">Connecting to Shopify...</h1>
        <p className="text-muted-foreground">Please wait while we complete your connection</p>
        {sessionStatus === 'loading' && (
          <p className="text-muted-foreground text-sm">Waiting for authentication...</p>
        )}
      </div>
    </div>
  );
}
