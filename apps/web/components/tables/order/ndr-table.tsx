'use client';

import * as React from 'react';
import { Checkbox } from '@lorrigo/ui/components';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { Clock } from 'lucide-react';
import { toast } from '@lorrigo/ui/components';
import type { ColumnDef } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';

import { useNDROperations, type NDROrder, type NDRQueryParams } from '@/lib/apis/ndr';
import HoverCardToolTip from '@/components/hover-card-tooltip';
import { useModalStore } from '@/modal/modal-store';

interface NDRTableProps {
  initialParams?: NDRQueryParams;
}

export default function NDRTable({ initialParams = {} }: NDRTableProps) {
  const [pagination, setPagination] = React.useState({
    pageIndex: initialParams.page || 0,
    pageSize: initialParams.limit || 15,
  });
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([]);
  const [filters, setFilters] = React.useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = React.useState(initialParams.awb || '');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const { openModal } = useModalStore();

  // Modal state
  // const [isNDRModalOpen, setIsNDRModalOpen] = React.useState(false);
  // const [selectedNDROrders, setSelectedNDROrders] = React.useState<NDROrder[]>([]);
  // const [isBulkAction, setIsBulkAction] = React.useState(false);

  // API hooks
  const { ndrOrdersQuery, ndrStatsQuery } = useNDROperations({
    page: pagination.pageIndex + 1, // Convert 0-based to 1-based
    limit: pagination.pageSize,
    awb: debouncedGlobalFilter,
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
    actionTaken: filters.find((f) => f.id === 'actionTaken')?.value,
    actionType: filters.find((f) => f.id === 'actionType')?.value,
  });

  const { data, isLoading, isError } = ndrOrdersQuery;

  // Handle single NDR action
  const handleNDRAction = (ndrOrder: NDROrder) => {
    openModal('ndr-action', {
      selectedOrders: [ndrOrder],
      isBulkAction: false,
    });
    // setSelectedNDROrders([ndrOrder]);
    // setIsBulkAction(false);
    // setIsNDRModalOpen(true);
  };

  // Handle bulk NDR action
  const handleBulkNDRAction = (selectedRows: NDROrder[]) => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one order');
      return;
    }
    openModal('ndr-action', {
      selectedOrders: selectedRows,
      isBulkAction: true,
    });
    // setSelectedNDROrders(selectedRows);
    // setIsBulkAction(true);
    // setIsNDRModalOpen(true);
  };

  // Define the columns for the data table
  const columns: ColumnDef<NDROrder>[] = [
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
          disabled={isLoading || row.original.action_taken}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'ndrDetails',
      header: ({ column }) => <DataTableColumnHeader column={column} title="NDR Details" />,
      cell: ({ row }) => {
        const ndr = row.original;
        const raisedDate = new Date(ndr.ndr_raised_at);

        return (
          <div className="flex flex-col space-y-1">
            <div className="text-sm">
              {raisedDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}{' '}
              |{' '}
              {raisedDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-sm font-medium">
              {ndr.attempts} Attempt{ndr.attempts !== 1 ? 's' : ''}
            </div>
            {ndr.cancellation_reason && (
              <>
                <div className="text-muted-foreground text-xs">NDR Reason:</div>
                <div className="text-xs font-medium text-orange-600">{ndr.cancellation_reason}</div>
              </>
            )}
            <div className="flex flex-wrap gap-1">
              <Badge
                variant={ndr.action_taken ? 'default' : 'outline'}
                className={
                  ndr.action_taken
                    ? 'w-fit border-green-200 bg-green-50 text-xs text-green-600 dark:border-green-700 dark:bg-green-900 dark:text-green-50'
                    : 'w-fit border-orange-200 bg-orange-50 text-xs text-orange-600 dark:border-orange-700 dark:bg-orange-900 dark:text-orange-50'
                }
              >
                {ndr.action_taken
                  ? `${ndr.action_type?.toUpperCase()} COMPLETED`
                  : 'PENDING ACTION'}
              </Badge>
              {ndr.otp_verified && (
                <Badge
                  variant="secondary"
                  className="w-fit border-blue-200 bg-blue-50 text-xs text-blue-600 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-50"
                >
                  OTP VERIFIED
                </Badge>
              )}
            </div>
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
        const ndr = row.original;
        const order = ndr.shipment?.order || ndr.order;

        return (
          <div className="flex flex-col space-y-1">
            <div className="font-medium text-blue-600">AWB: {ndr.awb}</div>
            {order && (
              <div className="text-sm">Order: {order.code || order.order_reference_id}</div>
            )}
            <Button
              variant="link"
              size="sm"
              className="h-auto justify-start p-0 text-xs text-blue-600"
              onClick={() => {
                // Handle view order details
                toast.info('Order details view not implemented yet');
              }}
            >
              View Details
            </Button>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'customerDetails',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer Details" />,
      cell: ({ row }) => {
        const ndr = row.original;
        const customer = ndr.shipment?.order?.customer || ndr.order?.customer || ndr.customer;

        return (
          <div className="flex flex-col space-y-1">
            <div className="font-medium">{customer?.name || 'N/A'}</div>
            <div className="text-muted-foreground text-sm">{customer?.email || 'No email'}</div>
            <div className="text-muted-foreground text-sm">{customer?.phone || 'No phone'}</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'deliveryAddress',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Delivery Address" />,
      cell: ({ row }) => {
        const ndr = row.original;
        const address =
          ndr.shipment?.order?.customer?.address ||
          ndr.order?.customer?.address ||
          ndr.customer?.address;

        return (
          <div className="flex flex-col space-y-1">
            <HoverCardToolTip label="Delivery Address">
              {address
                ? `${address.address}, ${address.city}, ${address.state} - ${address.pincode}`
                : 'No address'}
            </HoverCardToolTip>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'courierInfo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Courier Info" />,
      cell: ({ row }) => {
        const ndr = row.original;
        const courier = ndr.shipment?.courier || ndr.courier;

        return (
          <div className="flex flex-col space-y-1">
            <div className="text-sm font-medium">
              {courier?.name || 'Unknown Courier'} {courier?.channel_config?.nickname || ''}
            </div>
            <div className="text-sm text-blue-600">{ndr.awb}</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'actionStatus',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action Status" />,
      cell: ({ row }) => {
        const ndr = row.original;

        return (
          <div className="flex flex-col space-y-1">
            {ndr.action_taken ? (
              <>
                <Badge variant="secondary" className="w-fit">
                  {ndr.action_type?.toUpperCase()}
                </Badge>
                <div className="text-muted-foreground text-xs">
                  {ndr.action_date && new Date(ndr.action_date).toLocaleDateString()}
                </div>
                {ndr.action_comment && (
                  <div className="text-muted-foreground max-w-xs truncate text-xs">
                    {ndr.action_comment}
                  </div>
                )}
              </>
            ) : (
              <Badge variant="outline" className="w-fit">
                <Clock className="mr-1 h-3 w-3" />
                Pending Action
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actions" />,
      cell: ({ row }) => {
        const ndr = row.original;

        return (
          <div className="flex flex-col items-start gap-2">
            {!ndr.action_taken && (
              <Button
                className="w-full bg-blue-600 text-xs hover:bg-blue-700"
                size="sm"
                onClick={() => handleNDRAction(ndr)}
                disabled={ndr.otp_verified}
                title={
                  ndr.otp_verified ? 'Cannot take action on OTP verified orders' : 'Take NDR Action'
                }
              >
                {ndr.otp_verified ? 'OTP Verified' : 'Take Action'}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.data || []}
        count={data?.meta?.total || 0}
        pageCount={data?.meta?.totalPages || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to fetch NDR orders. Please try again."
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
        onFiltersChange={setFilters}
        onGlobalFilterChange={setGlobalFilter}
        onDateRangeChange={setDateRange}
      />
    </>
  );
}
