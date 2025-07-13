'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
} from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useBillingOperations, type BillingRecord } from '@/lib/apis/billing';
import { CopyBtn } from '@/components/copy-btn';
import {
  BillingCodeCell,
  OrderDetailsCell,
  ShipmentDetailsCell,
  WeightDetailsCell,
  BasePricingCell,
  AdditionalChargesCell,
  TotalAmountCell,
  PaymentStatusCell,
} from './billing-field-components';

interface AdminBillingDetailTableProps {
  userId: string;
  month: string;
}

export function AdminBillingDetailTable({ userId, month }: AdminBillingDetailTableProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const [filters, setFilters] = useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);

  // Reset pagination when userId or month changes to ensure fresh data
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [userId, month]);

  // Use the billing operations hook
  const { getUserBillingByMonthQuery } = useBillingOperations();

  // Fetch user billing details - this should refresh when userId changes
  const { data, isLoading, isError, isFetching, refetch } = getUserBillingByMonthQuery(userId, month, {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    sort: sorting,
    filters,
    globalFilter: debouncedGlobalFilter,
  });

  // Force refetch when userId changes to get fresh data
  useEffect(() => {
    if (userId) {
      refetch();
    }
  }, [userId, refetch]);

  // Define columns using modular components
  const columns: ColumnDef<BillingRecord>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Billing Details" />,
      cell: ({ row }) => <BillingCodeCell record={row.original} />,
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'order.order_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order Details" />,
      cell: ({ row }) => <OrderDetailsCell record={row.original} />,
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'order.awb',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Shipment" />,
      cell: ({ row }) => <ShipmentDetailsCell record={row.original} />,
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'charged_weight',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Weight & Zone" />,
      cell: ({ row }) => <WeightDetailsCell record={row.original} />,
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'base_price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Charges" />,
      cell: ({ row }) => <BasePricingCell record={row.original} />,
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'excess_charges',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Additional Charges" />,
      cell: ({ row }) => <AdditionalChargesCell record={row.original} />,
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'billing_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Amount" />,
      cell: ({ row }) => <TotalAmountCell record={row.original} />,
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'payment_status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Status" />,
      cell: ({ row }) => <PaymentStatusCell record={row.original} />,
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
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

  // Filterable columns
  const filterableColumns = [
    {
      id: 'payment_status',
      title: 'Payment Status',
      options: [
        { label: 'Pending', value: 'NOT_PAID' },
        { label: 'Paid', value: 'PAID' },
        { label: 'Disputed', value: 'DISPUTED' },
      ],
    },
    {
      id: 'courier_name',
      title: 'Courier',
      options: [], // Will be populated dynamically from data
    },
    {
      id: 'is_processed',
      title: 'Processing Status',
      options: [
        { label: 'Processed', value: 'true' },
        { label: 'Processing', value: 'false' },
      ],
    },
    {
      id: 'is_forward_applicable',
      title: 'Forward Applicable',
      options: [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
    },
    {
      id: 'is_rto_applicable',
      title: 'RTO Applicable',
      options: [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
    },
  ];

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-semibold">Error loading billing details</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            There was an error loading the billing details for this user. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-orange-500" />
          <h3 className="mt-2 text-sm font-semibold">No user selected</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Please select a user from the summary table above to view their billing details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with user info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">User Billing Details</h3>
          <p className="text-sm text-muted-foreground">
            Billing details for User ID: {userId} | Month: {month}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          disabled={isFetching}
        >
          {isFetching ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data?.data || []}
        count={data?.pagination?.total || 0}
        pageCount={data?.pagination?.pageCount || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        filterableColumns={filterableColumns}
        searchableColumns={[
          {
            id: 'code',
            title: 'Billing Code',
          },
          {
            id: 'order.order_number',
            title: 'Order Number',
          },
          {
            id: 'order.shipment.awb',
            title: 'AWB Number',
          },
          {
            id: 'order.customer.name',
            title: 'Customer Name',
          },
          {
            id: 'courier_name',
            title: 'Courier',
          },
        ]}
        searchPlaceholder="Search by billing code, order number, AWB, customer name, or courier..."
        isLoading={isLoading || isFetching}
        isError={isError}
        errorMessage="Failed to fetch billing details. Please try again."
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