'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export default function ShopifySuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push('/seller/channels');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="container py-12 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="h-16 w-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Shopify Connected Successfully!</h1>
        <p className="text-muted-foreground">
          Your Shopify store has been connected to Lorrigo. You can now manage your Shopify orders directly from the Lorrigo dashboard.
        </p>
        <button 
          onClick={() => router.push('/seller/channels')}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Return to Channels
        </button>
      </div>
    </div>
  );
} 