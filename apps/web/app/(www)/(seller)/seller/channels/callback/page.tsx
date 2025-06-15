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
  const { data: session } = useSession();
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const shop = searchParams.get('shop');
        const code = searchParams.get('code');
        
        if (!shop || !code) {
          setError('Missing required parameters');
          setIsLoading(false);
          return;
        }

        // Call the backend to exchange the code for a token
        const response = await apiClient.get('/shopify/callback', {
          params: {
            shop,
            code
          },
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.user?.token}`
          }
        });

        if (response.data.success) {
          // Redirect back to the channels page
          router.push('/seller/channels?success=true');
        } else {
          setError('Failed to connect to Shopify');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error handling Shopify callback:', err);
        setError('An error occurred while connecting to Shopify');
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="container py-12 flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <button 
          onClick={() => router.push('/seller/channels')}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Return to Channels
        </button>
      </div>
    );
  }

  return (
    <div className="container py-12 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h1 className="text-xl font-medium">Connecting to Shopify...</h1>
        <p className="text-muted-foreground">Please wait while we complete your connection</p>
      </div>
    </div>
  );
} 