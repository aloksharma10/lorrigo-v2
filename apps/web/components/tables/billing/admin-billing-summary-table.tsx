'use client';

import React, { useState } from 'react';
import { Eye, Info, TrendingUp, Users, Calculator, AlertCircle, RotateCcw, FileText } from 'lucide-react';
import {
  Button,
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useBillingOperations, type BillingSummaryByUser } from '@/lib/apis/billing';
import { currencyFormatter } from '@lorrigo/utils';
import { CopyBtn } from '@/components/copy-btn';
import { BillingSummaryCard } from './billing-field-components';

interface AdminBillingSummaryTableProps {
  month: string;
  onUserSelect: (userId: string, userName: string) => void;
  onManualBilling?: (userId: string, userName: string) => void;
  onBillingCycle?: (userId: string, userName: string) => void;
}

export function AdminBillingSummaryTable({
  month,
  onUserSelect,
  onManualBilling,
  onBillingCycle,
}: AdminBillingSummaryTableProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([
    { id: 'total_billing_amount', desc: true },
  ]);
  const [filters, setFilters] = useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);

  const { getBillingSummaryByMonthQuery } = useBillingOperations();

  const { data, isLoading, isError, isFetching } = getBillingSummaryByMonthQuery(month, {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    sort: sorting,
    filters,
    globalFilter: debouncedGlobalFilter,
  });

  const currentPage = data?.pagination?.page ? data.pagination.page - 1 : 0;

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
              < CopyBtn
                label={user.user_email}
                tooltipText="Copy Email"
                text={user.user_email}
                labelClassName="hover:underline"
              />
            </div>
            <div className="text-muted-foreground text-xs">
              <CopyBtn
                label={`ID: ${user.user_id}`}
                tooltipText="Copy User ID"
                text={user.user_id}
              />
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'total_orders',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Orders" />,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="text-center">
            <div className="font-bold text-lg text-blue-600">{user.total_orders}</div>
            <div className="text-muted-foreground text-xs">Total Orders</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'total_billing_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Billing" />,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="text-right">
            <div className="font-bold text-lg text-green-600">
              {currencyFormatter(user.total_billing_amount)}
            </div>
            <div className="text-muted-foreground text-xs">Total Amount</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'payment_status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Status" />,
      cell: ({ row }) => {
        const user = row.original;
        const paidPercentage =
          user.total_billing_amount > 0 ? (user.paid_amount / user.total_billing_amount) * 100 : 0;

        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600 font-medium">Paid:</span>
              <span className="font-bold text-green-600">{currencyFormatter(user.paid_amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-orange-600 font-medium">Pending:</span>
              <span className="font-bold text-orange-600">{currencyFormatter(user.pending_amount)}</span>
            </div>
            {user.disputed_amount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-600 font-medium">Disputed:</span>
                <span className="font-bold text-red-600">{currencyFormatter(user.disputed_amount)}</span>
              </div>
            )}
            <div className="mt-2">
              {paidPercentage === 100 ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">Fully Paid</Badge>
              ) : paidPercentage > 80 ? (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">Mostly Paid</Badge>
              ) : paidPercentage > 0 ? (
                <Badge className="bg-orange-100 text-orange-800 border-orange-200">Partially Paid</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 border-red-200">Unpaid</Badge>
              )}
            </div>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUserSelect(user.user_id, user.user_name)}
              className="h-8 gap-1"
            >
              <Eye className="h-3 w-3" />
              Details
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <FileText className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => onUserSelect(user.user_id, user.user_name)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Billing Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onManualBilling && (
                  <DropdownMenuItem
                    onClick={() => onManualBilling(user.user_id, user.user_name)}
                    className="gap-2"
                  >
                    <Calculator className="h-4 w-4" />
                    Manual Billing
                  </DropdownMenuItem>
                )}
                {onBillingCycle && (
                  <DropdownMenuItem
                    onClick={() => onBillingCycle(user.user_id, user.user_name)}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Billing Cycles
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableHiding: false,
    },
  ];

  const handlePaginationChange = React.useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      setPagination(newPagination);
    },
    []
  );

  const handleSortingChange = React.useCallback((newSorting: { id: string; desc: boolean }[]) => {
    setSorting(newSorting);
  }, []);

  const handleFiltersChange = React.useCallback((newFilters: { id: string; value: any }[]) => {
    setFilters(newFilters);
  }, []);

  const handleGlobalFilterChange = React.useCallback((newGlobalFilter: string) => {
    setGlobalFilter(newGlobalFilter);
  }, []);

  const summaryStats = React.useMemo(() => {
    if (!data?.users) return null;

    const totalUsers = data.users.length;
    const totalOrders = data.users.reduce((sum, user) => sum + user.total_orders, 0);
    const totalAmount = data.users.reduce((sum, user) => sum + user.total_billing_amount, 0);
    const totalPending = data.users.reduce(
      (sum, user) => sum + user.pending_amount,
      0
    );
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
      paidPercentage: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
      disputedPercentage: totalAmount > 0 ? (totalDisputed / totalAmount) * 100 : 0,
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

  const filterableColumns = [
    {
      id: 'payment_status',
      title: 'Payment Status',
      options: [
        { label: 'Fully Paid', value: 'fully_paid' },
        { label: 'Partially Paid', value: 'partially_paid' },
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Has Disputes', value: 'disputed' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {summaryStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summaryStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Users with billing records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summaryStats.paidPercentage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">{currencyFormatter(summaryStats.totalPaid)} paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {currencyFormatter(summaryStats.totalPending)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.pendingPercentage.toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <Calculator className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {currencyFormatter(summaryStats.avgOrderValue)}
              </div>
              <p className="text-xs text-muted-foreground">Across {summaryStats.totalOrders} orders</p>
            </CardContent>
          </Card>
        </div>
      )}
      <DataTable
        columns={columns}
        data={data?.users || []}
        count={data?.pagination?.total || 0}
        pageCount={data?.pagination?.totalPages || 0}
        page={currentPage} // Use 0-based page index
        pageSize={pagination.pageSize}
        filterableColumns={filterableColumns}
        searchableColumns={[
          { id: 'user_name', title: 'User Name' },
          { id: 'user_email', title: 'Email' },
          { id: 'user_id', title: 'User ID' },
        ]}
        searchPlaceholder="Search users by name, email, or ID..."
        isLoading={isLoading || isFetching}
        isError={isError}
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