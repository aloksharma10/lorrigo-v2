'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { Button, Input, Badge } from '@lorrigo/ui/components';
import { DataTable } from '@lorrigo/ui/components';
import { useBillingOperations } from '@/lib/apis/billing';
import { Search, Plus, Calendar, Download, Eye, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { currencyFormatter } from '@lorrigo/utils/functions';

export default function AdminBillingCyclesPage() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const router = useRouter();

  const { billingCyclesQuery } = useBillingOperations({
    billingCycles: {
      page: currentPage,
      pageSize: pageSize,
    },
  });

  const billingCycles = billingCyclesQuery?.data?.data || [];
  const pagination = billingCyclesQuery?.data?.pagination;

  const columns = [
    {
      accessorKey: 'code',
      header: 'Billing Code',
      cell: ({ row }: any) => <span className="font-mono text-sm">{row.getValue('code')}</span>,
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }: any) => {
        const user = row.getValue('user') as any;
        return (
          <div>
            <div className="font-medium">{user?.name || 'N/A'}</div>
            <div className="text-muted-foreground text-sm">{user?.email || 'N/A'}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'cycle_type',
      header: 'Cycle Type',
      cell: ({ row }: any) => {
        const cycleType = row.getValue('cycle_type') as string;
        return <Badge variant={cycleType === 'MANUAL' ? 'secondary' : 'default'}>{cycleType}</Badge>;
      },
    },
    {
      accessorKey: 'cycle_start_date',
      header: 'Period',
      cell: ({ row }: any) => {
        const startDate = row.getValue('cycle_start_date') as string;
        const endDate = row.original.cycle_end_date as string;
        return (
          <div className="text-sm">
            <div>{format(new Date(startDate), 'MMM dd, yyyy')}</div>
            <div className="text-muted-foreground">to {format(new Date(endDate), 'MMM dd, yyyy')}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'total_orders',
      header: 'Orders',
      cell: ({ row }: any) => {
        const total = row.getValue('total_orders') as number;
        const processed = row.original.processed_orders as number;
        const failed = row.original.failed_orders as number;

        return (
          <div className="text-sm">
            <div className="font-medium">{total} Total</div>
            <div className="text-green-600">{processed} Processed</div>
            {failed > 0 && <div className="text-red-600">{failed} Failed</div>}
          </div>
        );
      },
    },
    {
      accessorKey: 'total_amount',
      header: 'Amount',
      cell: ({ row }: any) => {
        const amount = row.getValue('total_amount') as number;
        return <div className="font-medium">{currencyFormatter(amount)}</div>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={status === 'COMPLETED' ? 'default' : status === 'PROCESSING' ? 'secondary' : status === 'FAILED' ? 'destructive' : 'outline'}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }: any) => {
        const date = row.getValue('created_at') as string;
        return <span className="text-muted-foreground text-sm">{format(new Date(date), 'MMM dd, yyyy HH:mm')}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const billingCycle = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                router.push(`/admin/billing/cycles/${billingCycle.id}`);
              }}
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
          </div>
        );
      },
    },
  ];

  const filteredData = billingCycles.filter((cycle) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cycle.code.toLowerCase().includes(searchLower) ||
      cycle.user?.name?.toLowerCase().includes(searchLower) ||
      cycle.user?.email?.toLowerCase().includes(searchLower) ||
      cycle.cycle_type.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing Cycles</h1>
          <p className="text-muted-foreground">View and manage all billing cycles across users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/billing/cycles/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Cycle
          </Button>
          <Button onClick={() => router.push('/admin/billing/manual')}>
            <Plus className="mr-2 h-4 w-4" />
            Manual Billing
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billing Cycles</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination?.total || 0}</div>
            <p className="text-muted-foreground text-xs">Across all users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders Billed</CardTitle>
            <Download className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingCycles.reduce((sum, cycle) => sum + cycle.total_orders, 0)}</div>
            <p className="text-muted-foreground text-xs">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Download className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter(billingCycles.reduce((sum, cycle) => sum + cycle.total_amount, 0))}</div>
            <p className="text-muted-foreground text-xs">Current cycles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cycles</CardTitle>
            <Filter className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingCycles.filter((cycle) => cycle.is_active).length}</div>
            <p className="text-muted-foreground text-xs">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Cycles</CardTitle>
          <CardDescription>View and manage all billing cycles across users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search by code, user name, email, or cycle type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredData}
            count={pagination?.total || 0}
            pageCount={pagination?.totalPages || 0}
            page={currentPage}
            pageSize={pageSize}
            onPaginationChange={(updater: any) => {
              if (typeof updater === 'function') {
                const newState = updater({
                  pageIndex: currentPage - 1,
                  pageSize,
                });
                setCurrentPage(newState.pageIndex + 1);
                setPageSize(newState.pageSize);
              }
            }}
            isLoading={billingCyclesQuery?.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
