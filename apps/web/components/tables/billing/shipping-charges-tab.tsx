'use client';
import { Info } from 'lucide-react';

import {
  Button,
  DataTable,
  Badge,
  DataTableColumnHeader,
  type ColumnDef,
  useSidebar,
} from '@lorrigo/ui/components';
import { CardItems } from '@/components/card-items';
import React from 'react';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import {
  fetchShippingChargesReport,
  ShippingCharge,
} from '@/app/(www)/(seller)/seller/billing/billing-action';
import { ShipmentParams } from '@/lib/type/response-types';

export default function ShippingChargesTab({ initialParams }: { initialParams: ShipmentParams }) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const [pagination, setPagination] = React.useState({
    pageIndex: initialParams.page || 0,
    pageSize: initialParams.pageSize || 15,
  });
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>(
    initialParams.sort || []
  );
  const [filters, setFilters] = React.useState<{ id: string; value: any }[]>(
    initialParams.filters || []
  );
  const [globalFilter, setGlobalFilter] = React.useState(initialParams.globalFilter || '');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>(
    initialParams.dateRange || {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    }
  );

  const queryClient = useQueryClient();

  // Fetch shipments with React Query
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: [
      'shipments',
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      filters,
      debouncedGlobalFilter,
      dateRange,
      // "shipping-charges",
    ],
    queryFn: () =>
      fetchShippingChargesReport({
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sort: sorting,
        filters,
        globalFilter: debouncedGlobalFilter,
        dateRange,
        // status: "",
      }),
    // initialData: initialData,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    retryOnMount: false,
    retry: false,
  });

  // Mock data for the shipping charges
  const summaryCards = [
    {
      title: 'Total Freight Charges',
      amount: '₹ 2,759,061.47',
      bgColor: 'bg-blue-600',
      icon: Info,
    },
    {
      title: 'Billed Freight Charges',
      amount: '₹ 1,471,905.64',
      bgColor: 'bg-blue-600',
      icon: Info,
    },
    {
      title: 'Unbilled Freight Charges',
      amount: '₹ 1,287,155.83',
      bgColor: 'bg-blue-600',
      icon: Info,
    },
    {
      title: 'Total On-Hold Amount',
      amount: '₹ 16,181.78',
      bgColor: 'bg-blue-600',
      icon: Info,
    },
    {
      title: 'Invoice Due Amount',
      amount: '₹ 0.00',
      bgColor: 'bg-blue-600',
      icon: Info,
    },
    {
      title: 'Engage Charges',
      amount: '₹ 0.00',
      bgColor: 'bg-blue-600',
      icon: Info,
    },
  ];

  // Define the columns for the data table
  const columns: ColumnDef<ShippingCharge>[] = [
    {
      accessorKey: 'orderId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order ID" />,
      cell: ({ row }) => {
        const orderId = row.getValue('orderId') as string;
        return <div className="font-medium text-blue-600">{orderId}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'awbNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="AWB Number" />,
      cell: ({ row }) => {
        const awbNumber = row.getValue('awbNumber') as string;
        return <div className="text-blue-600">{awbNumber}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'courier',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Courier" />,
      cell: ({ row }) => {
        const courier = row.getValue('courier') as string;
        return <div>{courier}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'shipmentStatus',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Shipment Status" />,
      cell: ({ row }) => {
        const status = row.getValue('shipmentStatus') as string;
        return (
          <Badge variant="outline" className="border-green-600 text-green-600">
            {status}
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'awbAssignedDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="AWB Assigned Date" />,
      cell: ({ row }) => {
        const date = row.getValue('awbAssignedDate') as string;
        return <div>{date}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'appliedWeight',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Applied Weight Charges (₹)" />
      ),
      cell: ({ row }) => {
        const weight = row.getValue('appliedWeight') as number;
        return (
          <div className="flex items-center gap-2">
            {weight.toFixed(2)}
            <Info className="h-4 w-4 text-gray-400" />
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'excessWeight',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Excess Weight Charges (₹)" />
      ),
      cell: ({ row }) => {
        const excessWeight = row.getValue('excessWeight') as number;
        return (
          <div className="flex items-center gap-2">
            {excessWeight > 0 ? excessWeight.toFixed(2) : ''}
            <Info className="h-4 w-4 text-gray-400" />
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'onHoldAmount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="On Hold Amount (₹)" />,
      cell: ({ row }) => {
        const amount = row.getValue('onHoldAmount') as number;
        return <div>{amount.toFixed(2)}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'totalFreightCharges',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Freight Charges (₹)" />
      ),
      cell: ({ row }) => {
        const charges = row.getValue('totalFreightCharges') as number;
        return (
          <div className="flex items-center gap-2">
            {charges.toFixed(2)}
            <Info className="h-4 w-4 text-gray-400" />
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'enteredWeight',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Entered Weight & Dimensions" />
      ),
      cell: ({ row }) => {
        const weight = row.getValue('enteredWeight') as string;
        const dimensions = row.original.enteredDimensions;
        return (
          <div className="text-sm">
            <div>{weight}</div>
            <div className="text-gray-500">{dimensions}</div>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'chargedWeight',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Charged Weight & Dimensions" />
      ),
      cell: ({ row }) => {
        const weight = row.getValue('chargedWeight') as string;
        const dimensions = row.original.chargedDimensions;
        return (
          <div className="text-sm">
            <div>{weight}</div>
            <div className="text-gray-500">{dimensions}</div>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="View Transactions Details" />
      ),
      cell: ({ row }) => {
        return (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            View
          </Button>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // Define filterable columns
  const filterableColumns = [
    {
      id: 'shipmentStatus',
      title: 'Shipment Status',
      options: [
        { label: 'Pickup Generated', value: 'Pickup Generated' },
        { label: 'In Transit', value: 'In Transit' },
        { label: 'Delivered', value: 'Delivered' },
        { label: 'RTO', value: 'RTO' },
      ],
    },
  ];

  // Define bulk actions
  const bulkActions = [
    {
      label: 'Download Manifest',
      action: (selectedRows: ShippingCharge[]) => {
        console.log('Download manifest for:', selectedRows);
      },
      isLoading: false,
    },
    {
      label: 'Generate Labels',
      action: (selectedRows: ShippingCharge[]) => {
        console.log('Generate labels for:', selectedRows);
      },
      isLoading: false,
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

  // Handle date range change
  const handleDateRangeChange = React.useCallback((newDateRange: { from: Date; to: Date }) => {
    setDateRange(newDateRange);
  }, []);

  return (
    <div
      className={`${isCollapsed ? 'lg:w-full lg:pr-10' : 'lg:container lg:mx-auto'} flex h-full flex-col space-y-4 transition-all duration-300`}
    >
      <h1 className="text-lg font-bold capitalize lg:text-2xl">Shipping Charges</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {summaryCards.map((card, index) => (
          <CardItems
            key={index}
            title={card.title}
            value={card.amount}
            description={card.title}
            icon={card.icon}
          />
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        count={data?.meta.total || 0}
        pageCount={data?.meta.pageCount || 1}
        page={0}
        pageSize={15}
        filterableColumns={filterableColumns}
        bulkActions={bulkActions}
        dateRangeFilter={true}
        searchableColumns={[
          {
            id: 'orderNumber',
            title: 'Order Number',
          },
          {
            id: 'customerName',
            title: 'Customer Name',
          },
          {
            id: 'awbNumber',
            title: 'AWB Number',
          },
        ]}
        searchPlaceholder="Search for AWB, Order ID, Buyer Mobile Number, Email, SKU, Pickup ID"
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to fetch shipping charges. Please try again."
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        onFiltersChange={handleFiltersChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        onDateRangeChange={handleDateRangeChange}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
      />
    </div>
  );
}
