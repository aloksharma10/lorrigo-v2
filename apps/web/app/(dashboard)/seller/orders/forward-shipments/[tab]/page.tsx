import { Suspense } from 'react';
import ShipmentsTable from '@/components/tables/shipmen-table';
import { getInitialShipments } from '@/app/(dashboard)/seller/orders/action';
import { Badge, Button } from '@lorrigo/ui/components';
import ScrollableTabsProps from '@/components/client-tabs';
import { Plus, RefreshCw } from 'lucide-react';
import { SHIPMENT_TAB_ROUTES } from '@/lib/routes/nested-shipments';
import OpenModalBtn from '@/components/open-modal-btn';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    tab: string;
  }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sort?: string;
    filters?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

// Force dynamic rendering with no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ShipmentsPage({ params, searchParams }: PageProps) {
  const { tab } = await params;
  const queryParams = await searchParams;

  const { page = '0', pageSize = '15', sort, filters, search, dateFrom, dateTo } = queryParams;

  // Parse parameters
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
          from: new Date(new Date().setDate(new Date().getDate() - 30)),
          to: new Date(),
        },
    status: tab,
  };

  // Get initial data on server - only for first load
  const initialData = await getInitialShipments(parsedParams);

  return (
    <div className="mx-auto w-full space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold capitalize lg:text-2xl">{tab || 'All'} Orders</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Domestic
          </Badge>
          <Button variant="outline" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {/* <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button> */}
        </div>
      </div>

      <ScrollableTabsProps menuItems={SHIPMENT_TAB_ROUTES} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/seller/orders/new" scroll={false}>
            <OpenModalBtn modalType="seller:new-order" icon={<Plus />}>
              Add Order
            </OpenModalBtn>
          </Link>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Sync Orders</span>
          </Button>
        </div>
      </div>

      <ShipmentsTable initialData={initialData} initialParams={parsedParams} />
    </div>
  );
}
