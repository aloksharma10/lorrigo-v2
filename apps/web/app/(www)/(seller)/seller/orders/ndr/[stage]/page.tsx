'use client';

import { RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import NDRTable from '@/components/tables/order/ndr-table';
import ScrollableTabsProps from '@/components/client-tabs';

import { NDR_TAB_ROUTES } from '@/lib/routes/nested-shipments';
import { Badge, Button } from '@lorrigo/ui/components';

interface PageProps {
  params: {
    stage: string;
  };
}

export default function NDRPage({ params }: PageProps) {
  const { stage } = params;
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
    page: Number.parseInt(page),
    pageSize: Number.parseInt(pageSize),
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
    status: stage,
  };

  return (
    <div className="mx-auto w-full space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold capitalize lg:text-2xl">
          NDR {stage?.replace('-', ' ')} Orders
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Domestic
          </Badge>
          <Button variant="outline" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <ScrollableTabsProps menuItems={NDR_TAB_ROUTES} />

      {/* Table */}
      <NDRTable initialParams={parsedParams} />
    </div>
  );
}
