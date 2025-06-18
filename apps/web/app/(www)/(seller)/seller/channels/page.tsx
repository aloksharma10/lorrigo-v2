'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useShopify } from '@/lib/apis/channels/shopify';
import { toast } from '@lorrigo/ui/components';
import { AllEnabledChannels } from '@/components/channels/channel-registry';

export default function ChannelsPage() {
  const searchParams = useSearchParams();
  const shopify = useShopify();

  // Check for success parameter from callback
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast.success('Successfully connected to Shopify!');
      // Refetch connection data
      shopify.connection.refetch();
    }
  }, [searchParams, shopify.connection]);

  return (
    <div className="container space-y-8 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sales Channels</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AllEnabledChannels />
      </div>
    </div>
  );
}
