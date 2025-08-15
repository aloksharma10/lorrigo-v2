'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox, ScrollArea, Separator } from '@lorrigo/ui/components';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { IndianRupee, Package, Phone, Tag, TruckIcon, UserRound } from 'lucide-react';
import { toast } from '@lorrigo/ui/components';
import type { ColumnDef } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { fetchShipments } from '@/lib/apis/order';
import ActionTooltip from '@/components/action-tooltip';
import HoverCardToolTip from '@/components/hover-card-tooltip';
import { currencyFormatter, formatDateTimeSmart, ShipmentBucket } from '@lorrigo/utils';
import { Shipment, ShipmentParams } from '@/lib/type/response-types';
import { useAuthToken } from '@/components/providers/token-provider';
import { CopyBtn } from '@/components/copy-btn';
import { useBulkOperations } from '@/components/providers/bulk-operations-provider';
import ShipmentActionButton from './shipment-action-button';
import { useShippingOperations } from '@/lib/apis/shipment';
import { useCSVUpload } from '@/components/providers/csv-upload-provider';
import { useHubOperations } from '@/lib/apis/hub';
import { ShipmentStatus } from '@lorrigo/db';

interface ShipmentsTableProps {
  initialParams: ShipmentParams;
}

export default function ShipmentsTable({ initialParams }: ShipmentsTableProps) {
  const [activeTab, setActiveTab] = React.useState(initialParams.status || 'all');
  const [pagination, setPagination] = React.useState({
    pageIndex: initialParams.page || 0,
    pageSize: initialParams.pageSize || 15,
  });
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>(initialParams.sort || []);
  const [filters, setFilters] = React.useState<{ id: string; value: any }[]>(initialParams.filters || []);
  const [globalFilter, setGlobalFilter] = React.useState(initialParams.globalFilter || '');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>(
    initialParams.dateRange || {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
    }
  );
  const { isTokenReady } = useAuthToken();
  const { openBulkOperation } = useBulkOperations();
  const { downloadLabels, downloadManifests } = useShippingOperations();
  const csvUploadContext = useCSVUpload();
  const [isBulkDownloading, setIsBulkDownloading] = React.useState(false);
  const { getHubsQuery } = useHubOperations();
  const { data: hubsResponse } = getHubsQuery({ page: 1, limit: 200 });
  const hubOptions = React.useMemo(
    () => (hubsResponse?.hubs || []).map((h: any) => ({ label: h.name, value: h.id })),
    [hubsResponse]
  );

  if (!csvUploadContext) {
    throw new Error('ShipmentsTable must be used within a CSVUploadProvider');
  }

  // Fetch shipments with React Query
  const { data, isLoading, isError, isFetching, error } = useQuery({
    queryKey: ['orders', pagination.pageIndex, pagination.pageSize, sorting, filters, debouncedGlobalFilter, dateRange, activeTab],
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
    enabled: isTokenReady,
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

  // Define the columns for the data table
  const columns: ColumnDef<Shipment>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
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
      id: 'channel_name',
      accessorKey: 'orderNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order Details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col">
            <CopyBtn
              label={shipment.orderNumber}
              className="text-blue-600"
              labelClassName="text-blue-600 hover:underline underline-offset-2"
              tooltipText="Copy Order Number"
              text={shipment.orderNumber}
            />
            <div className="text-muted-foreground text-sm">
              {new Date(shipment.createdAt).toLocaleDateString()} |{' '}
              {new Date(shipment.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="mt-1 flex items-center">
              <Package className="text-muted-foreground mr-1 h-4 w-4" />
              <span className="text-xs font-medium uppercase">{shipment.channel}</span>
            </div>
            <HoverCardToolTip
              className="w-80"
              label={`${shipment.packageDetails.length} x ${shipment.packageDetails.breadth} x ${shipment.packageDetails.height} cm`}
              triggerComponent={
                <Button variant="link" size="sm" className="mt-1 h-auto justify-start p-0 text-blue-600">
                  Package Details
                </Button>
              }
            >
              <ScrollArea className="h-24">
                {shipment.productDetails.products.map((product) => (
                  <React.Fragment key={product.id}>
                    <div key={product.id} className="grid grid-cols-2 gap-2 text-xs text-gray-800">
                      <div className="col-span-2 flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        <span className="font-medium">Name:</span>
                        <span className="truncate">{product.name}</span>
                      </div>
                      <Badge variant="status_warning" className="flex items-center gap-2">
                        <Tag className="h-3 w-3" />
                        <span className="font-medium">Quantity:</span> {product.quantity}
                      </Badge>
                      <Badge variant="status_success" className="flex items-center gap-2">
                        <IndianRupee className="h-3 w-3" />
                        <span className="font-medium">Price:</span> ₹{product.price}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                  </React.Fragment>
                ))}
              </ScrollArea>
            </HoverCardToolTip>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'customer.name',
      accessorKey: 'customerName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer Details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <HoverCardToolTip
            className="w-80"
            label={shipment?.hub?.name}
            triggerComponent={
              <div className="flex flex-col">
                <div className="font-medium">{shipment.customer?.name}</div>
                <div className="text-muted-foreground text-sm">
                  <CopyBtn showVisibilityToggle={true} label={shipment.customer?.phone} tooltipText="Copy Phone" text={shipment.customer?.phone || ''} />
                  <CopyBtn showVisibilityToggle={true} label={shipment.customer?.email} tooltipText="Copy Email" text={shipment.customer?.email || ''} />
                </div>
              </div>
            }
          >
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-1">
                <UserRound className="h-3 w-3" />
                <span>{shipment?.customer?.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>{shipment?.customer?.phone}</span>
              </div>
            </div>
            <div className="text-muted-foreground text-sm">
              {shipment.customer?.address}, {shipment.customer?.city}, {shipment.customer?.state}, {shipment.customer?.pincode}
            </div>
          </HoverCardToolTip>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'package.weight',
      accessorKey: 'packageDetails',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Package Details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="mt-1 flex flex-col text-xs">
            <span>
              {shipment.packageDetails.length} x {shipment.packageDetails.breadth} x {shipment.packageDetails.height} cm
            </span>
            <span>Dead Weight: {shipment.packageDetails.deadWeight} kg</span>
            <span>Volumetric Weight: {shipment.packageDetails.volumetricWeight} kg</span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'shipment.paymentType',
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Payment" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium">{currencyFormatter(shipment.totalAmount)}</div>
            <Badge variant={shipment.paymentType === 'COD' ? 'default' : 'status_success'} className="mt-1 w-fit">
              {shipment.paymentType}
            </Badge>
            {shipment.paymentType === 'COD' && (
              <Badge variant={'success'} className="mt-1 w-fit">
                <span className="sr-only">To collect</span>
                <ActionTooltip label="To collect" side="left" className="m-0 w-fit p-0">
                  <span>{currencyFormatter(shipment.amountToCollect)}</span>
                </ActionTooltip>
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'hub_id',
      accessorKey: 'pickupAddress',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse Address" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col">
            <HoverCardToolTip className="w-80" label={shipment?.hub?.name}>
              <div className="flex items-center justify-between gap-2 text-xs font-medium">
                <div className="flex items-center gap-1">
                  <TruckIcon className="mr-1 h-3 w-3" />
                  <span>{shipment?.hub?.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground text-xs">
                    <Phone className="h-3 w-3" />
                  </span>
                  {shipment?.hub?.phone}
                </div>
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                {shipment?.hub?.address}, {shipment?.hub?.city}, {shipment?.hub?.state}, {shipment?.hub?.pincode}
              </div>
            </HoverCardToolTip>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'awb',
      accessorKey: 'shippingService',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Shipping Details" />,
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex flex-col">
            <div className="text-sm">
              AWB #
              <CopyBtn
                className="text-blue-600"
                labelClassName="text-blue-600 hover:underline underline-offset-2"
                label={shipment.awb}
                tooltipText="Copy AWB"
                text={shipment.awb}
                enableExternalLinks={true}
                url={`https://app.lorrigo.com/tracking/${shipment.awb}`}
              />
              <div className="text-muted-foreground text-xs">
                {shipment.courier} {shipment.courierNickname}
              </div>
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const shipment = row.original;

        // Status badge color mapping
        const statusColorMap: Record<ShipmentStatus, string> = {
          NEW: 'status_success',
          COURIER_ASSIGNED: 'status_success',
          PICKUP_SCHEDULED: 'status_success',
          OUT_FOR_PICKUP: 'status_warning',
          PICKED_UP: 'status_success',
          IN_TRANSIT: 'status_success',
          OUT_FOR_DELIVERY: 'status_success',
          DELIVERED: 'status_success',
          NDR: 'status_warning',
          RTO_INITIATED: 'status_warning',
          RTO_IN_TRANSIT: 'status_warning',
          RTO_DELIVERED: 'status_success',
          EXCEPTION: 'status_destructive',
          CANCELLED_SHIPMENT: 'status_destructive',
          CANCELLED_ORDER: 'status_destructive',
          AWAITING: 'status_destructive',
        };

        return (
          <div className="flex flex-col">
            <Badge variant={statusColorMap[shipment.status as ShipmentStatus] as any} className={`w-fit`}>
              {shipment?.trackingEvents[0]?.status?.toUpperCase() || 'AWAITING'}
            </Badge>
            <div className="mt-1 text-xs">{formatDateTimeSmart(shipment.trackingEvents[0]?.timestamp || shipment.updatedAt)}</div>
            {shipment.pickupDate && <div className="mt-1 text-xs">For: {shipment.pickupDate.split('T')[0]}</div>}
            {shipment.edd && <div className="mt-1 text-xs">EDD: {shipment.edd.split('T')[0]}</div>}
            {shipment.pickupId && <div className="mt-1 text-xs">Pickup ID: {shipment.pickupId}</div>}
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
        const shipment = row.original;
        return (
          <div className="flex items-center gap-2">
            <ShipmentActionButton shipment={shipment} />
          </div>
        );
      },
    },
  ];

  // Define bulk actions
  const bulkActions = [
    {
      label: 'Edit Order Details',
      action: (selectedRows: Shipment[]) => {
        openBulkOperation('edit-order', selectedRows);
      },
      isLoading: false,
    },
    {
      label: 'Create Shipments',
      action: (selectedRows: Shipment[]) => {
        openBulkOperation('create-shipment', selectedRows);
      },
      isLoading: false,
    },
    {
      label: 'Schedule Pickup',
      action: (selectedRows: Shipment[]) => {
        openBulkOperation('schedule-pickup', selectedRows);
      },
      isLoading: false,
    },
    {
      label: 'Cancel Shipments',
      action: (selectedRows: Shipment[]) => {
        openBulkOperation('cancel-shipment', selectedRows);
      },
      variant: 'destructive' as const,
      isLoading: false,
    },
    {
      label: 'Download Labels (A4)',
      action: async (selectedRows: Shipment[]) => {
        setIsBulkDownloading(true);
        try {
          const pdfBlob = await downloadLabels.mutateAsync({
            awbs: selectedRows.map((row) => row.awb),
            format: 'A4',
          });
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'labels.pdf');
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
        } catch (error) {
          toast.error('Failed to download labels');
        } finally {
          setIsBulkDownloading(false);
        }
      },
      isLoading: isBulkDownloading,
    },
    {
      label: 'Download Labels (Thermal)',
      action: async (selectedRows: Shipment[]) => {
        setIsBulkDownloading(true);
        try {
          const pdfBlob = await downloadLabels.mutateAsync({
            awbs: selectedRows.map((row) => row.awb),
            format: 'THERMAL',
          });
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'labels-thermal.pdf');
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
        } catch (error) {
          toast.error('Failed to download thermal labels');
        } finally {
          setIsBulkDownloading(false);
        }
      },
      isLoading: isBulkDownloading,
    },
    {
      label: 'Download Manifest (A4)',
      action: async (selectedRows: Shipment[]) => {
        setIsBulkDownloading(true);
        try {
          const pdfBlob = await downloadManifests.mutateAsync({
            awbs: selectedRows.map((row) => row.awb),
            format: 'A4',
          });
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'manifest.pdf');
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
        } catch (error) {
          toast.error('Failed to download manifest');
        } finally {
          setIsBulkDownloading(false);
        }
      },
      isLoading: isBulkDownloading,
    },
    {
      label: 'Download Manifest (Thermal)',
      action: async (selectedRows: Shipment[]) => {
        setIsBulkDownloading(true);
        try {
          const pdfBlob = await downloadManifests.mutateAsync({
            awbs: selectedRows.map((row) => row.awb),
            format: 'THERMAL',
          });
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'manifest-thermal.pdf');
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
        } catch (error) {
          console.log(error, 'error');
          toast.error('Failed to download thermal manifest');
        } finally {
          setIsBulkDownloading(false);
        }
      },
      isLoading: isBulkDownloading,
    },
  ];

  const filterableColumns = [
    {
      id: 'status',
      title: 'Status',
      options: [
        { label: 'New', value: ShipmentBucket.NEW.toString() },
        { label: 'Courier Assigned', value: ShipmentBucket.COURIER_ASSIGNED.toString() },
        { label: 'Pickup Scheduled', value: ShipmentBucket.PICKUP_SCHEDULED.toString() },
        { label: 'Picked Up', value: ShipmentBucket.PICKED_UP.toString() },
        { label: 'In Transit', value: ShipmentBucket.IN_TRANSIT.toString() },
        { label: 'Out For Delivery', value: ShipmentBucket.OUT_FOR_DELIVERY.toString() },
        { label: 'Delivered', value: ShipmentBucket.DELIVERED.toString() },
        { label: 'NDR', value: ShipmentBucket.NDR.toString() },
        { label: 'Cancelled Order', value: ShipmentBucket.CANCELLED_ORDER.toString() },
        { label: 'Cancelled Shipment', value: ShipmentBucket.CANCELLED_SHIPMENT.toString() },
        { label: 'RTO Initiated', value: ShipmentBucket.RTO_INITIATED.toString() },
        { label: 'RTO In Transit', value: ShipmentBucket.RTO_IN_TRANSIT.toString() },
        { label: 'RTO Delivered', value: ShipmentBucket.RTO_DELIVERED.toString() },
        { label: 'Lost Damaged', value: ShipmentBucket.LOST_DAMAGED.toString() },
        { label: 'Disposed', value: ShipmentBucket.DISPOSED.toString() },
        { label: 'Exception', value: ShipmentBucket.EXCEPTION.toString() },
        { label: 'Awaiting', value: ShipmentBucket.AWAITING.toString() },
      ],
    },
    {
      id: 'shipment.paymentType',
      title: 'Payment Type',
      options: [
        { label: 'Prepaid', value: 'Prepaid' },
        { label: 'COD', value: 'COD' },
      ],
    },
    {
      id: 'hub_id',
      title: 'Hub',
      options: hubOptions,
    },
    {
      id: 'channel_name',
      title: 'Channel',
      options: [
        { label: 'Shopify', value: 'shopify' },
        { label: 'Custom', value: 'custom' },
      ],
    },
  ];

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPagination({ ...pagination, pageIndex: 0 });
  };

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

  // Handle date range change
  const handleDateRangeChange = React.useCallback((newDateRange: { from: Date; to: Date }) => {
    setDateRange(newDateRange);
  }, []);

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
        isLoading={isLoading || isFetching}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : 'Failed to fetch orders. Please try again.'}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        onFiltersChange={handleFiltersChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        onDateRangeChange={handleDateRangeChange}
        defaultDateRange={dateRange}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
      />
    </>
  );
}
