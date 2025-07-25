'use client';

import React, { useEffect, useState } from 'react';
import { DataTable, DataTableColumnHeader, type ColumnDef, Badge, Button, Alert, AlertDescription } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useBillingOperations, type WeightDispute } from '@/lib/apis/billing';
import { CopyBtn } from '@/components/copy-btn';
import { useDrawerStore } from '@/drawer/drawer-store';
import { useModalStore } from '@/modal/modal-store';

interface WeightDisputesTableProps {
  className?: string;
  userRole?: 'ADMIN' | 'SELLER';
  userId?: string;
  status?: string;
}

export function WeightDisputesTable({ className, userRole = 'ADMIN', userId, status }: WeightDisputesTableProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const openDrawer = useDrawerStore((state) => state.openDrawer);
  const openModal = useModalStore((state) => state.openModal);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);

  // Use the new disputes hook with all params
  const { disputesQuery, actOnDispute, exportDisputes } = useBillingOperations({
    disputes: {
      page: pagination.pageIndex + 1, // API uses 1-based pagination
      pageSize: pagination.pageSize,
      status: status, // Use the status prop directly
      search: debouncedGlobalFilter || undefined,
      userId: userId,
    },
  });

  const { isPending: isDownloading } = exportDisputes;
  const { isPending: isAcceptingDispute } = actOnDispute;
  const { data, isLoading, isError, isFetching, refetch } = disputesQuery;

  useEffect(() => {
    refetch();
  }, [status]);

  // Use the data directly from the new API
  const disputes = data?.data || [];

  const handleAcceptDispute = async (dispute: WeightDispute) => {
    try {
      await actOnDispute.mutateAsync({
        disputeId: dispute.id,
        request: {
          action: 'ACCEPT',
          status: 'ACCEPTED',
          resolution: 'Accepted via UI',
        },
      });
      refetch();
    } catch (error) {
      console.error('Failed to accept dispute:', error);
    }
  };

  const handleRaiseDispute = (dispute: WeightDispute) => {
    openDrawer('raise-dispute', { dispute });
  };

  const columns: ColumnDef<WeightDispute>[] = [
    {
      accessorKey: 'discrepancy_details',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Discrepancy Details" />,
      cell: ({ row }) => {
        const dispute = row.original;
        return (
          <div className="flex flex-col space-y-1">
            <div className="text-muted-foreground text-xs">Updated on:</div>
            <div className="text-sm">
              {new Date(dispute.created_at).toLocaleDateString()} |{' '}
              {new Date(dispute.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">AWB #</div>
            <CopyBtn
              label={dispute.order?.shipment?.awb || ''}
              text={dispute.order?.shipment?.awb || ''}
              className="text-sm font-medium text-blue-600"
              labelClassName="text-blue-600 hover:underline"
              tooltipText="Copy AWB"
            />
            <div className="mt-1 text-xs">
              {dispute.order?.shipment?.courier?.name || 'Unknown courier'} ({dispute.order?.shipment?.courier?.channel_config?.nickname || 'Unknown courier'})
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'product_details',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product Details" />,
      cell: ({ row }) => {
        const dispute = row.original;
        return (
          <div className="flex flex-col space-y-1">
            <div className="text-sm font-medium">{dispute.order?.product?.name || 'Product name'}</div>
            <div className="text-muted-foreground text-xs">PID: {dispute.order?.product?.id || 'N/A'}</div>
            <div className="text-muted-foreground text-xs">SKU: {dispute.order?.product?.sku || 'N/A'}</div>
            <div className="text-muted-foreground text-xs">QTY: 1</div>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'applied_weight',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Applied Weight" />,
      cell: ({ row }) => {
        const dispute = row.original;
        return (
          <div className="space-y-1">
            <div className="text-sm font-medium">{dispute.original_weight} kg</div>
            <div className="text-muted-foreground text-xs">Dead Weight</div>
            <div className="text-muted-foreground text-xs">{dispute.original_weight} kg</div>
            <div className="text-muted-foreground mt-1 text-xs">Volumetric Weight</div>
            <div className="text-muted-foreground text-xs">
              {dispute.order?.volumetric_weight || dispute.original_weight} kg ({dispute.order?.dimensions || '10x10x10'})
            </div>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'courier_weight',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Courier Weight" />,
      cell: ({ row }) => {
        const dispute = row.original;
        return (
          <div className="space-y-1">
            <div className="text-sm font-medium">{dispute.disputed_weight} kg</div>
            <div className="text-muted-foreground text-xs">Dead Weight</div>
            <div className="text-muted-foreground text-xs">{dispute.disputed_weight} kg</div>
            <div className="text-muted-foreground mt-1 text-xs">Volumetric Weight</div>
            <div className="text-muted-foreground text-xs">
              {dispute.disputed_weight} kg ({dispute.order?.dimensions || '10x10x10'})
            </div>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'charged_weight',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Charged Weight" />,
      cell: ({ row }) => {
        const dispute = row.original;
        const isHigherDead = dispute.disputed_weight > dispute.original_weight;
        const isHigherVol = dispute.disputed_weight > (dispute.order?.volumetric_weight || dispute.original_weight);

        return (
          <div className="space-y-1">
            <div className="flex items-center text-sm font-medium">
              {dispute.disputed_weight} kg
              {isHigherDead && <Badge className="ml-2 border-blue-200 bg-blue-100 text-xs text-blue-800">Higher Dead & Vol Weight</Badge>}
              {!isHigherDead && isHigherVol && <Badge className="ml-2 border-blue-200 bg-blue-100 text-xs text-blue-800">Higher Vol Weight</Badge>}
            </div>
            <div className="text-muted-foreground text-xs">Dead Weight</div>
            <div className="text-muted-foreground text-xs">{dispute.disputed_weight} kg</div>
            <div className="text-muted-foreground mt-1 text-xs">Volumetric Weight</div>
            <div className="text-muted-foreground text-xs">
              {dispute.disputed_weight} kg ({dispute.order?.dimensions || '10x10x10'})
            </div>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'excess_weight',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Excess Weight & Charge" />,
      cell: ({ row }) => {
        const dispute = row.original;
        const weightDifference = dispute.disputed_weight - dispute.original_weight;
        const totalCharge = dispute.forward_excess_amount + dispute.rto_excess_amount;

        return (
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Excess Weight</div>
            <div className="text-sm font-medium text-red-600">{weightDifference.toFixed(2)} kg</div>
            <div className="text-muted-foreground mt-1 text-xs">Excess Charge</div>
            <div className="text-sm font-medium text-red-600">₹{totalCharge.toFixed(2)}</div>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const dispute = row.original;
        const isRaisedBySeller = dispute.status === 'RAISED_BY_SELLER';
        const isResolved = dispute.status === 'RESOLVED';
        const isRejected = dispute.status === 'REJECTED';

        return (
          <div className="space-y-2">
            <Badge className="border-red-200 bg-red-100 uppercase text-red-800">{dispute.status}</Badge>
            <div>
              {dispute.evidence_urls && dispute.evidence_urls.length > 0 && <div className="text-sm">Shipment image available</div>}
              {dispute.seller_evidence_urls && dispute.seller_evidence_urls.length > 0 && <div className="text-sm">Historical sample images</div>}
              {dispute.deadline_date && !isRejected && !isResolved && (
                <div className="text-muted-foreground text-xs">
                  {Math.ceil((new Date(dispute.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Working Days left
                </div>
              )}
              {
                dispute.status === 'RESOLVED' && dispute.resolution_date && (
                  <div className="text-muted-foreground text-xs">
                    Resolved on: {new Date(dispute.resolution_date).toLocaleDateString()} | {new Date(dispute.resolution_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )
              }
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => {
        const dispute = row.original;
        const isRaisedBySeller = dispute.status === 'RAISED_BY_SELLER';
        const isResolved = dispute.status === 'RESOLVED';
        const isRejected = dispute.status === 'REJECTED';

        // if (isRaisedBySeller) {

        return (
          <div className="flex flex-col gap-2 space-y-2">
            <Button disabled={isRaisedBySeller || isResolved || isRejected} isLoading={isAcceptingDispute} onClick={() => handleAcceptDispute(dispute)}>
              {isRaisedBySeller ? 'Accept Discrepancy' : 'Accept'}
            </Button>
            <Button disabled={isResolved || isRejected || isRaisedBySeller} variant="outline" onClick={() => handleRaiseDispute(dispute)}>
              {isRaisedBySeller ? 'Raise Dispute' : 'Raise'}
              Raise Dispute
            </Button>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // Handle pagination change
  const handlePaginationChange = React.useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination);
  }, []);

  // Handle sorting change
  // const handleSortingChange = React.useCallback((newSorting: { id: string; desc: boolean }[]) => {
  //   setSorting(newSorting);
  // }, []);

  // // Handle filters change
  // const handleFiltersChange = React.useCallback((newFilters: { id: string; value: any }[]) => {
  //   setFilters(newFilters);
  // }, []);

  // Handle global filter change
  const handleGlobalFilterChange = React.useCallback((newGlobalFilter: string) => {
    setGlobalFilter(newGlobalFilter);
  }, []);

  // Filterable columns
  const filterableColumns = [
    {
      id: 'courier_name',
      title: 'Courier',
      options: [], // Will be populated dynamically from data
    },
  ];

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error loading weight disputes. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <DataTable
      advancedFilter={false}
      dateRangeFilter={false}
      handleDownload={() => exportDisputes.mutate({ status: status })}
      handleUpload={() => openModal('weight-dispute-csv')}
      columns={columns}
      data={disputes}
      count={data?.pagination?.total || 0}
      pageCount={data?.pagination?.totalPages || 0}
      page={pagination.pageIndex}
      pageSize={pagination.pageSize}
      filterableColumns={filterableColumns}
      searchableColumns={[
        {
          id: 'order.shipment.awb',
          title: 'AWB Number',
        },
        {
          id: 'order.product.name',
          title: 'Product Name',
        },
      ]}
      searchPlaceholder="Search by AWB, product name..."
      isDownloading={isDownloading}
      isLoading={isLoading || isFetching}
      isError={isError}
      onPaginationChange={handlePaginationChange}
      // onSortingChange={handleSortingChange}
      // onFiltersChange={handleFiltersChange}
      onGlobalFilterChange={handleGlobalFilterChange}
      manualPagination={true}
      manualSorting={true}
      manualFiltering={true}
    />
  );
}
