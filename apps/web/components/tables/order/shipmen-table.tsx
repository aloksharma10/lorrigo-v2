'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@lorrigo/ui/components';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { MoreHorizontal, Package, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lorrigo/ui/components';
import { toast } from '@lorrigo/ui/components';
import type { ColumnDef } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';

import {
  fetchShipments,
  downloadManifest,
  generateLabels,
  cancelOrders,
  type Shipment,
  type ApiResponse,
  type ShipmentParams,
} from '@/app/(www)/(seller)/seller/orders/order-action';

interface ShipmentsTableProps {
  initialData: ApiResponse;
  initialParams: ShipmentParams;
}

export default function ShipmentsTable({ initialData, initialParams }: ShipmentsTableProps) {
  const [activeTab, setActiveTab] = React.useState(initialParams.status || 'all');
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
      activeTab,
    ],
    queryFn: () =>
      fetchShipments({
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sort: sorting,
        filters,
        globalFilter: debouncedGlobalFilter,
        dateRange,
        status: activeTab,
      }),
    initialData: initialData,
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

  // Bulk action mutations with Sonner toast
  const downloadManifestMutation = useMutation({
    mutationFn: async (shipments: Shipment[]) => {
      const shipmentIds = shipments.map((s) => s.id);
      return downloadManifest(shipmentIds);
    },
    onSuccess: (result) => {
      toast.success(`Downloaded manifest for ${result.count} shipments`);
    },
    onError: () => {
      toast.error('Failed to download manifest');
    },
  });

  const generateLabelsMutation = useMutation({
    mutationFn: async (shipments: Shipment[]) => {
      const shipmentIds = shipments.map((s) => s.id);
      return generateLabels(shipmentIds);
    },
    onSuccess: (result) => {
      toast.success(`Generated labels for ${result.count} shipments`);
    },
    onError: () => {
      toast.error('Failed to generate labels');
    },
  });

  const cancelOrdersMutation = useMutation({
    mutationFn: async (shipments: Shipment[]) => {
      const shipmentIds = shipments.map((s) => s.id);
      return cancelOrders(shipmentIds);
    },
    onSuccess: (result) => {
      toast.success(`Cancelled ${result.count} orders`);
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
    onError: () => {
      toast.error('Failed to cancel orders');
    },
  });

  // Define the columns for the data table
  const columns: ColumnDef<Shipment>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          disabled={isLoading}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
          disabled={isLoading}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order Details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium text-blue-600">{shipment.orderNumber}</div>
            <div className="text-muted-foreground text-sm">
              {new Date(shipment.createdAt).toLocaleDateString()} |{' '}
              {new Date(shipment.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="mt-1 flex items-center">
              <Package className="text-muted-foreground mr-1 h-4 w-4" />
              <span className="text-xs font-medium uppercase">CUSTOM</span>
            </div>
            <Button
              variant="link"
              size="sm"
              className="mt-1 h-auto justify-start p-0 text-blue-600"
            >
              Package Details
            </Button>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'customerName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer Details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium">{shipment.customerName}</div>
            <div className="text-muted-foreground text-sm">{shipment.customerEmail}</div>
            <div className="text-muted-foreground text-sm">{shipment.customerPhone}</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Payment" />,
      cell: ({ row }) => {
        const shipment = row.original;
        const amount = new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 2,
        }).format(shipment.amount);
        return (
          <div className="flex flex-col">
            <div className="font-medium">{amount}</div>
            <Badge variant="outline" className="mt-1 w-fit">
              {shipment.paymentType}
            </Badge>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'pickupAddress',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Pickup / RTO Addresses" />
      ),
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col">
            <div className="text-muted-foreground mb-1 border-b border-dashed pb-1 font-medium">
              {shipment.pickupAddress}
            </div>
            {!shipment.addressVerified && (
              <div className="flex items-center text-xs text-red-500">
                <AlertTriangle className="mr-1 h-3 w-3" />
                <span>Unverified</span>
              </div>
            )}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'shippingService',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Shipping Details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium">{shipment.shippingService}</div>
            <div className="text-sm">
              AWB # <span className="text-blue-600">{shipment.awbNumber}</span>
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const shipment = row.original;

        // Status badge color mapping
        const statusColorMap: Record<string, string> = {
          New: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
          'Pickup Scheduled': 'bg-green-100 text-green-800 hover:bg-green-100',
          'In Transit': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
          Delivered: 'bg-green-100 text-green-800 hover:bg-green-100',
          RTO: 'bg-red-100 text-red-800 hover:bg-red-100',
        };

        return (
          <div className="flex flex-col">
            <Badge className={`${statusColorMap[shipment.status]} w-fit`}>
              {shipment.status.toUpperCase()}
            </Badge>
            <div className="mt-1 text-xs">For May {shipment.pickupDate.split(' ')[1]}, 2025</div>
            <div className="mt-1 text-xs">EDD: {shipment.edd}</div>
            <div className="mt-1 text-xs">Pickup ID: {shipment.pickupId}</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
      cell: ({ row }) => {
        return (
          <div className="flex flex-col items-center gap-2">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={() => downloadManifestMutation.mutate([row.original])}
              disabled={downloadManifestMutation.isPending}
            >
              Download Manifest
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View details</DropdownMenuItem>
                <DropdownMenuItem>Track shipment</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => cancelOrdersMutation.mutate([row.original])}
                  disabled={cancelOrdersMutation.isPending}
                >
                  Cancel order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Define bulk actions
  const bulkActions = [
    {
      label: 'Download Manifest',
      action: (selectedRows: Shipment[]) => {
        downloadManifestMutation.mutate(selectedRows);
      },
      isLoading: downloadManifestMutation.isPending,
    },
    {
      label: 'Generate Labels',
      action: (selectedRows: Shipment[]) => {
        generateLabelsMutation.mutate(selectedRows);
      },
      isLoading: generateLabelsMutation.isPending,
    },
    {
      label: 'Cancel Orders',
      action: (selectedRows: Shipment[]) => {
        cancelOrdersMutation.mutate(selectedRows);
      },
      variant: 'destructive' as const,
      isLoading: cancelOrdersMutation.isPending,
    },
  ];

  // Define filterable columns
  const filterableColumns = [
    {
      id: 'status',
      title: 'Status',
      options: [
        { label: 'New', value: 'New' },
        { label: 'Pickup Scheduled', value: 'Pickup Scheduled' },
        { label: 'In Transit', value: 'In Transit' },
        { label: 'Delivered', value: 'Delivered' },
        { label: 'RTO', value: 'RTO' },
      ],
    },
    {
      id: 'paymentType',
      title: 'Payment Type',
      options: [
        { label: 'Prepaid', value: 'Prepaid' },
        { label: 'COD', value: 'COD' },
      ],
    },
  ];

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  // Handle pagination change
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination);
  };

  // Handle sorting change
  const handleSortingChange = (newSorting: { id: string; desc: boolean }[]) => {
    setSorting(newSorting);
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: { id: string; value: any }[]) => {
    setFilters(newFilters);
  };

  // Handle global filter change
  const handleGlobalFilterChange = (newGlobalFilter: string) => {
    setGlobalFilter(newGlobalFilter);
  };

  // Handle date range change
  const handleDateRangeChange = (newDateRange: { from: Date; to: Date }) => {
    setDateRange(newDateRange);
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.data || []}
        count={data?.meta.total || 0}
        pageCount={data?.meta.pageCount || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
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
        errorMessage="Failed to fetch shipments. Please try again."
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        onFiltersChange={handleFiltersChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        onDateRangeChange={handleDateRangeChange}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
      />
    </>
  );
}
