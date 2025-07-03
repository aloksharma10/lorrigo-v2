'use client';

import React, { useState } from 'react';
import { Eye, Info, TrendingUp, Users, Calculator, AlertCircle } from 'lucide-react';
import {
  Button,
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
} from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useBillingOperations, type BillingSummaryByUser } from '@/lib/apis/billing';
import { currencyFormatter } from '@lorrigo/utils';
import { CopyBtn } from '@/components/copy-btn';
import { BillingSummaryCard } from './billing-field-components';

interface AdminBillingSummaryTableProps {
  month: string;
  onUserSelect: (userId: string, userName: string) => void;
}

export function AdminBillingSummaryTable({ month, onUserSelect }: AdminBillingSummaryTableProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const [filters, setFilters] = useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);

  // Use the new billing operations hook
  const { getBillingSummaryByMonthQuery } = useBillingOperations();

  // Fetch billing summary data
  const { data, isLoading, isError, isFetching } = getBillingSummaryByMonthQuery(month, {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    sort: sorting,
    filters,
    globalFilter: debouncedGlobalFilter,
  });

  // Define columns for billing summary
  const columns: ColumnDef<BillingSummaryByUser>[] = [
    {
      accessorKey: 'user_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="User Details" />,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium">{user.user_name}</div>
            <div className="text-muted-foreground text-sm">
              <CopyBtn
                label={user.user_email}
                tooltipText="Copy Email"
                text={user.user_email}
              />
            </div>
            <div className="text-muted-foreground text-xs">
              ID: {user.user_id}
            </div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'total_orders',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Orders" />,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="text-center">
            <div className="font-medium text-lg">{user.total_orders}</div>
            <div className="text-muted-foreground text-sm">Total Orders</div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'total_billing_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Billing Amount" />,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="text-right">
            <div className="font-bold text-lg">
              {currencyFormatter(user.total_billing_amount)}
            </div>
            <div className="text-muted-foreground text-sm">Total Billing</div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'payment_breakdown',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Breakdown" />,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Paid:</span>
              <span className="font-medium">{currencyFormatter(user.paid_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-orange-600">Pending:</span>
              <span className="font-medium">{currencyFormatter(user.pending_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-600">Disputed:</span>
              <span className="font-medium">{currencyFormatter(user.disputed_amount)}</span>
            </div>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUserSelect(user.user_id, user.user_name)}
            className="h-8"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        );
      },
    },
  ];

  // Handle pagination change
  const handlePaginationChange = React.useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      setPagination(newPagination);
    },
    []
  );

  // Handle sorting change
  const handleSortingChange = React.useCallback((newSorting: { id: string; desc: boolean }[]) => {
    setSorting(newSorting);
  }, []);

  // Handle filters change
  const handleFiltersChange = React.useCallback((newFilters: { id: string; value: any }[]) => {
    setFilters(newFilters);
  }, []);

  // Handle global filter change
  const handleGlobalFilterChange = React.useCallback((newGlobalFilter: string) => {
    setGlobalFilter(newGlobalFilter);
  }, []);

  // Calculate summary statistics from data
  const summaryStats = React.useMemo(() => {
    if (!data?.users) return null;
    
    const totalUsers = data.users.length;
    const totalOrders = data.users.reduce((sum, user) => sum + user.total_orders, 0);
    const totalAmount = data.users.reduce((sum, user) => sum + user.total_billing_amount, 0);
    const totalPending = data.users.reduce((sum, user) => sum + user.pending_amount, 0);
    const totalPaid = data.users.reduce((sum, user) => sum + user.paid_amount, 0);
    const totalDisputed = data.users.reduce((sum, user) => sum + user.disputed_amount, 0);
    
    return {
      totalUsers,
      totalOrders,
      totalAmount,
      totalPending,
      totalPaid,
      totalDisputed,
      avgOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0,
      pendingPercentage: totalAmount > 0 ? (totalPending / totalAmount) * 100 : 0,
    };
  }, [data?.users]);

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-semibold">Error loading billing data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            There was an error loading the billing summary. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BillingSummaryCard
            title="Total Users"
            value={summaryStats.totalUsers}
            description={`Users with billing in ${month}`}
            icon={Users}
          />
          <BillingSummaryCard
            title="Total Orders"
            value={summaryStats.totalOrders}
            description="Total orders billed"
            icon={Calculator}
          />
          <BillingSummaryCard
            title="Total Amount"
            value={currencyFormatter(summaryStats.totalAmount)}
            description="Total billing amount"
            icon={TrendingUp}
            textColor="text-primary"
          />
          <BillingSummaryCard
            title="Pending Amount"
            value={currencyFormatter(summaryStats.totalPending)}
            description={`${summaryStats.pendingPercentage.toFixed(1)}% of total`}
            icon={AlertCircle}
            textColor="text-orange-600"
          />
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data?.users || []}
        count={data?.pagination?.total || 0}
        pageCount={data?.pagination?.pageCount || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        searchableColumns={[
          {
            id: 'user_name',
            title: 'User Name',
          },
          {
            id: 'user_email',
            title: 'Email',
          },
        ]}
        searchPlaceholder="Search users by name or email..."
        isLoading={isLoading || isFetching}
        isError={isError}
        errorMessage="Failed to fetch billing summary. Please try again."
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        onFiltersChange={handleFiltersChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
      />
    </div>
  );
} 