'use client';

import React, { useState } from 'react';
import { Upload, Download } from 'lucide-react';
import {
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
  Badge,
  Button,
  Alert,
  AlertDescription,
} from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { 
  useBillingOperations,
  type WeightDispute
} from '@/lib/apis/billing';
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
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([
    { id: 'created_at', desc: true }
  ]);
  const [filters, setFilters] = useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);
  
  // Selected dispute for modal
  const [selectedDispute, setSelectedDispute] = useState<WeightDispute | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchAwb, setSearchAwb] = useState('');
  const debouncedSearchAwb = useDebounce(searchAwb, 500);

  const openDrawer = useDrawerStore((state) => state.openDrawer);
  const openModal = useModalStore((state) => state.openModal);

  // Use the new disputes hook with all params
  const { disputesQuery, actOnDispute } = useBillingOperations({
    disputes: {
      page: pagination.pageIndex + 1, // API uses 1-based pagination
      pageSize: pagination.pageSize,
      status: status, // Use the status prop directly
      search: searchAwb || undefined,
      userId: userId
    },
  });

  // Resolution hook for admin actions
  const { data, isLoading, isError, isFetching, refetch } = disputesQuery;

  // Use the data directly from the new API
  const disputes = data?.data || [];
  const awbsCount = disputes.length;

  const handleAcceptDispute = async (dispute: WeightDispute) => {
    try {
      await actOnDispute.mutateAsync({
        disputeId: dispute.id,
        request: {
          action: 'ACCEPT',
          status: 'ACCEPTED',
          resolution: 'Accepted via UI',
        }
      });
      refetch();
    } catch (error) {
      console.error('Failed to accept dispute:', error);
    }
  };

  const handleRaiseDispute = (dispute: WeightDispute) => {
    openDrawer('raise-dispute', { dispute });
  };

  // Export disputes as CSV
  const handleExport = async () => {
    try {
      const response = await fetch(`/api/billing/disputes/export?status=${status || ''}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error('Failed to export disputes');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `weight-disputes-${status || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting disputes:', error);
    }
  };

  // Define columns for the new dispute structure
  const columns: ColumnDef<WeightDispute>[] = [
    {
      accessorKey: 'discrepancy_details',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Discrepancy Details" />,
      cell: ({ row }) => {
        const dispute = row.original;
        return (
          <div className="flex flex-col space-y-1">
            <div className="text-xs text-muted-foreground">
              Updated on:
            </div>
            <div className="text-sm">
              {new Date(dispute.created_at).toLocaleDateString()} | {new Date(dispute.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              AWB #
            </div>
            <CopyBtn
              label={dispute.order?.shipment?.awb || ''}
              text={dispute.order?.shipment?.awb || ''}
              className="text-blue-600 font-medium text-sm"
              labelClassName="text-blue-600 hover:underline"
              tooltipText="Copy AWB"
            />
            <div className="text-xs mt-1">
              {dispute.order?.shipment?.courier?.name || 'Unknown courier'}
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
            <div className="font-medium text-sm">
              {dispute.order?.product?.name || 'Product name'}
            </div>
            <div className="text-xs text-muted-foreground">
              PID: {dispute.order?.product?.id || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">
              SKU: {dispute.order?.product?.sku || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">
              QTY: 1
            </div>
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
            <div className="text-sm font-medium">
              {dispute.original_weight} kg
            </div>
            <div className="text-xs text-muted-foreground">
              Dead Weight
            </div>
            <div className="text-xs text-muted-foreground">
              {dispute.original_weight} kg
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Volumetric Weight
            </div>
            <div className="text-xs text-muted-foreground">
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
            <div className="text-sm font-medium">
              {dispute.disputed_weight} kg
            </div>
            <div className="text-xs text-muted-foreground">
              Dead Weight
            </div>
            <div className="text-xs text-muted-foreground">
              {dispute.disputed_weight} kg
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Volumetric Weight
            </div>
            <div className="text-xs text-muted-foreground">
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
            <div className="text-sm font-medium flex items-center">
              {dispute.disputed_weight} kg
              {isHigherDead && (
                <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  Higher Dead & Vol Weight
                </Badge>
              )}
              {!isHigherDead && isHigherVol && (
                <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  Higher Vol Weight
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Dead Weight
            </div>
            <div className="text-xs text-muted-foreground">
              {dispute.disputed_weight} kg
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Volumetric Weight
            </div>
            <div className="text-xs text-muted-foreground">
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
            <div className="text-xs text-muted-foreground">
              Excess Weight
            </div>
            <div className="text-sm font-medium text-red-600">
              {weightDifference.toFixed(2)} kg
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Excess Charge
            </div>
            <div className="text-sm font-medium text-red-600">
              ₹{totalCharge.toFixed(2)}
            </div>
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
        
        return (
          <div className="space-y-2">
            <Badge className="bg-red-100 text-red-800 border-red-200 uppercase">
              NEW DISCREPANCY
            </Badge>
            <div>
              {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                <div className="text-sm">Shipment image available</div>
              )}
              {dispute.seller_evidence_urls && dispute.seller_evidence_urls.length > 0 && (
                <div className="text-sm">Historical sample images</div>
              )}
              {dispute.deadline_date && (
                <div className="text-xs text-muted-foreground">
                  {Math.ceil((new Date(dispute.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Working Days left
                </div>
              )}
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
        
        return (
          <div className="space-y-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => handleAcceptDispute(dispute)}
            >
              Accept Discrepancy
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleRaiseDispute(dispute)}
            >
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

  // Close modal and refresh data if needed
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDispute(null);
  };

  const handleDisputeResolved = () => {
    refetch(); // Refresh the table data
  };

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
        <AlertDescription>
          Error loading weight disputes. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {data?.pagination?.total || 0} AWBs found
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by AWB..."
              className="px-3 py-1 border rounded-md w-full md:w-64"
              value={searchAwb}
              onChange={(e) => setSearchAwb(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {userRole === 'ADMIN' && (
            <Button variant="outline" size="sm" onClick={() => openModal('weight-dispute-csv')}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          )}
          {userRole === 'SELLER' && (
            <Button variant="outline" size="sm" onClick={() => openModal('dispute-actions-csv')}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Actions
            </Button>
          )}
        </div>
      </div>
      
      <div className="mt-2">
        <DataTable
          showToolbar={false}
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
            {
              id: 'order.product.sku',
              title: 'SKU',
            },
          ]}
          searchPlaceholder="Search by AWB, product name, or SKU..."
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
    </div>
  );
} 