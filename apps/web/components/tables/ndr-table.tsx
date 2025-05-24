'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@lorrigo/ui/components';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { MoreHorizontal } from 'lucide-react';
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
} from '@/app/(seller)/seller/orders/action';

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

  // Bulk action mutations
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
      accessorKey: 'ndrDetails',
      header: ({ column }) => <DataTableColumnHeader column={column} title="NDR Details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col space-y-1">
            <div className="text-sm">
              {new Date(shipment.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}{' '}
              |{' '}
              {new Date(shipment.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-sm font-medium">{shipment.attemptNumber || '2nd'} Attempt</div>
            <div className="text-muted-foreground text-xs">NDR Reason:</div>
            <div className="text-xs font-medium text-orange-600">
              {shipment.ndrReason || 'Wrong Address'}
            </div>
            <Badge
              variant="outline"
              className="w-fit border-orange-200 bg-orange-50 text-xs text-orange-600 dark:border-orange-700 dark:bg-orange-900 dark:text-orange-50"
            >
              PENDING SINCE TODAY
            </Badge>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'orderDetails',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order Details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        const amount = new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 2,
        }).format(shipment.amount);

        return (
          <div className="flex flex-col space-y-1">
            <div className="font-medium text-blue-600">Id: {shipment.orderNumber}</div>
            <div className="font-medium">{amount}</div>
            <Button
              variant="link"
              size="sm"
              className="h-auto justify-start p-0 text-xs text-blue-600"
            >
              View Products
            </Button>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'customerDetails',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col space-y-1">
            <div className="font-medium">{shipment.customerName}</div>
            <div className="text-muted-foreground text-sm">{shipment.customerEmail}</div>
            <div className="text-muted-foreground text-sm">{shipment.customerPhone}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-muted-foreground text-xs">RTO Risk:</span>
              <Badge variant="status_success">{shipment.rtoRisk || 'LOW'}</Badge>
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'deliveryAddress',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Delivery address" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col space-y-1">
            <div className="max-w-xs text-sm">
              {shipment.deliveryAddress || shipment.pickupAddress}
            </div>
            <div className="text-muted-foreground text-xs">Address Quality:</div>
            <Badge variant="status_success">Valid</Badge>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'fieldExecutiveInfo',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Field Executive Info" />
      ),
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col space-y-1">
            <div className="text-sm font-medium">
              {shipment.brandInfo || 'Bluedart brands 500 g'}
            </div>
            <div className="text-sm font-medium">Surface</div>
            <div className="text-sm text-blue-600">{shipment.awbNumber}</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'shipmentDetails',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Shipment Details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex items-center gap-2">
            {/* <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-sm font-medium">Shiprocket</span> */}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'lastActionBy',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Action By" />,
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <span className="text-sm font-medium">Shiprocket</span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
      cell: ({ row }) => {
        return (
          <div className="flex flex-col items-center gap-2">
            <Button
              className="w-full bg-blue-600 text-xs hover:bg-blue-700"
              size="sm"
              onClick={() => {
                // Handle re-attempt action
                toast.success('Re-attempt scheduled');
              }}
            >
              Re-attempt
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View History</DropdownMenuItem>
                <DropdownMenuItem>Track shipment</DropdownMenuItem>
                <DropdownMenuItem>Download Label</DropdownMenuItem>
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

  return (
    <DataTable
      columns={columns}
      data={data?.data || []}
      count={data?.meta.total || 0}
      pageCount={data?.meta.pageCount || 0}
      page={pagination.pageIndex}
      pageSize={pagination.pageSize}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Failed to fetch shipments. Please try again."
      onPaginationChange={setPagination}
      onSortingChange={setSorting}
      manualPagination={true}
      manualSorting={true}
      manualFiltering={true}
      onFiltersChange={setFilters}
      onGlobalFilterChange={setGlobalFilter}
      onDateRangeChange={setDateRange}
    />
  );
}
