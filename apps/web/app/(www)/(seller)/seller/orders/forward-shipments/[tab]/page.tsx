'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { SHIPMENT_TAB_ROUTES } from '@/lib/routes/nested-shipments';
import { useParams, useSearchParams } from 'next/navigation';

import ScrollableTabsProps from '@/components/client-tabs';
import ShipmentsTable from '@/components/tables/order/shipmen-table';

import { Button, SplitButton, toast } from '@lorrigo/ui/components';
import { useShopify } from '@/lib/apis/channels/shopify';

interface PageProps {
  params: {
    tab: string;
  };
}

const mergeOptions = [
  {
    label: 'Sync Shopify',
    description: 'Sync orders from Shopify from last 7 days',
    value: 'recent',
  },
  {
    label: 'Sync last 7 days',
    description: 'Sync orders from Shopify from last 7 days',
    value: 'last-7-days',
  },
  {
    label: 'Sync last 30 days',
    description: 'Sync orders from Shopify from last 30 days',
    value: 'last-30-days',
  },
  {
    label: 'Sync last 60 days',
    description: 'Sync orders from Shopify from last 60 days',
    value: 'last-60-days',
  },
];

export default function ShipmentsPage() {
  const { tab } = useParams<{ tab: string }>();
  const searchParams = useSearchParams();

  const { syncOrders, connection } = useShopify();

  const page = searchParams.get('page') || '0';
  const pageSize = searchParams.get('pageSize') || '15';
  const sort = searchParams.get('sort');
  const filters = searchParams.get('filters');
  const search = searchParams.get('search');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  // Parse parameters for React Query
  const parsedParams = {
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    sort: sort ? JSON.parse(sort) : [],
    filters: filters ? JSON.parse(filters) : [],
    globalFilter: search || '',
    dateRange:
      dateFrom && dateTo
        ? {
            from: new Date(dateFrom),
            to: new Date(dateTo),
          }
        : {
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            to: new Date(),
          },
    status: tab,
  };

  // Check if user has Shopify connection
  const hasShopifyConnection = connection.data && connection.data.status === 'active';

  // Handle sync orders with date range
  const handleSyncOrders = (value: string) => {
    if (!hasShopifyConnection) {
      toast.error('No Shopify connection', {
        description: 'Please connect your Shopify store first to sync orders.',
        duration: 5000,
      });
      return;
    }

    let startDate: Date;
    let endDate: Date = new Date();

    // Calculate date range based on selection
    switch (value) {
      case 'recent':
        startDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
        break;
      case 'last-7-days':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last-30-days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last-60-days':
        startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Format dates for API
    const dateRange = {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };

    executeSync(dateRange, value);
  };

  // Execute sync with proper user feedback
  const executeSync = (dateRange: { start: string; end: string }, syncType: string) => {
    // Show loading toast
    const loadingToastId = `sync-orders-${Date.now()}`;
    const syncTypeText = syncType === 'manual' ? 'Syncing recent orders' : `Syncing ${syncType.replace('-', ' ')}`;

    toast.loading(`${syncTypeText} from Shopify...`, {
      id: loadingToastId,
    });

    // Execute sync
    syncOrders.mutate(dateRange, {
      onSuccess: (result) => {
        toast.dismiss(loadingToastId);
        if (result.success) {
          toast.success(result.message || 'Orders sync requested successfully!', { duration: 5000 });
        }
      },
      onError: (error: any) => {
        toast.dismiss(loadingToastId);
        toast.error('Sync failed', { description: error.response.data.message || 'An unexpected error occurred', duration: 5000 });
      },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold capitalize lg:text-2xl">{tab || 'All'} Orders</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-2">
            <Link href="/seller/orders/new" scroll={false}>
              Add Order
            </Link>
          </Button>
          <SplitButton
            options={mergeOptions}
            onValueChange={handleSyncOrders}
            loading={syncOrders.isPending}
            disabled={syncOrders.isPending || !hasShopifyConnection}
            aria-label="Sync Shopify orders options"
          />
        </div>
      </div>

      <ScrollableTabsProps menuItems={SHIPMENT_TAB_ROUTES} />

      <ShipmentsTable initialParams={parsedParams} />
    </div>
  );
}
