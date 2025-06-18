'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { SHIPMENT_TAB_ROUTES } from '@/lib/routes/nested-shipments';
import { useParams, useSearchParams } from 'next/navigation';

import ScrollableTabsProps from '@/components/client-tabs';
import ShipmentsTable from '@/components/tables/order/shipmen-table';

import { Badge, Button } from '@lorrigo/ui/components';

interface PageProps {
  params: {
    tab: string;
  };
}

export default function ShipmentsPage() {
  const { tab } = useParams<{ tab: string }>();
  const searchParams = useSearchParams();

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

  return (
    <div className="mx-auto w-full space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold capitalize lg:text-2xl">{tab || 'All'} Orders</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Domestic
          </Badge>
        </div>
      </div>

      <ScrollableTabsProps menuItems={SHIPMENT_TAB_ROUTES} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/seller/orders/new" scroll={false}>
            Add Order
          </Link>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Sync Orders</span>
          </Button>
        </div>
      </div>

      <ShipmentsTable initialParams={parsedParams} />
    </div>
  );
}
