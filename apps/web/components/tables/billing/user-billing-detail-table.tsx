'use client';

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { DataTable, DataTableColumnHeader, type ColumnDef } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useBillingOperations, type BillingRecord } from '@/lib/apis/billing';
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

interface UserBillingDetailTableProps {
  month: string;
}

export function UserBillingDetailTable({ month }: UserBillingDetailTableProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const [filters, setFilters] = useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);

  // Use the billing operations hook
  const { getCurrentUserBillingQuery } = useBillingOperations();

  // Fetch user billing details
  const { data, isLoading, isError, isFetching } = getCurrentUserBillingQuery(month, {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    sort: sorting,
    filters,
    globalFilter: debouncedGlobalFilter,
  });

  // Define columns with modular components
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
      accessorKey: 'order.shipment.awb',
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
  const handlePaginationChange = React.useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination);
  }, []);

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
  ];

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-semibold">Error loading billing details</h3>
          <p className="text-muted-foreground mt-1 text-sm">There was an error loading your billing details. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
