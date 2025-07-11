'use client';

import React, { useState } from 'react';
import { Scale, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
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
  useWeightDisputesEnhanced,
  useResolveWeightDisputeEnhanced,
  type WeightDispute, 
  type BillingParams 
} from '@/lib/apis/billing';
import { CopyBtn } from '@/components/copy-btn';
import { WeightDisputeModal } from '@/components/modals/weight-dispute-modal';
import { currencyFormatter } from '@lorrigo/utils';

interface WeightDisputesTableProps {
  className?: string;
}

export function WeightDisputesTable({ className }: WeightDisputesTableProps) {
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

  // Use the enhanced disputes hook
  const { data, isLoading, isError, isFetching, refetch } = useWeightDisputesEnhanced({
    page: pagination.pageIndex + 1, // API uses 1-based pagination
    limit: pagination.pageSize,
    status: filters.find(f => f.id === 'status')?.value,
  });

  // Resolution hook for admin actions
  const resolveDispute = useResolveWeightDisputeEnhanced();

  // Transform the enhanced data to match the existing WeightDispute interface
  const transformedDisputes = data?.disputes?.map(dispute => ({
    id: dispute.id,
    dispute_id: dispute.disputeId,
    order_id: dispute.orderId,
    status: dispute.status as 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED',
    original_weight: dispute.originalWeight,
    disputed_weight: dispute.disputedWeight,
    final_weight: dispute.finalWeight,
    courier_name: dispute.courierName,
    original_charges: dispute.forwardExcessAmount + dispute.rtoExcessAmount,
    revised_charges: dispute.totalDisputedAmount,
    evidence_urls: dispute.sellerEvidenceUrls,
    courier_response: dispute.sellerResponse,
    resolution: dispute.resolution,
    resolution_date: dispute.resolutionDate,
    resolved_by: undefined,
    created_at: dispute.createdAt,
    updated_at: dispute.updatedAt,
    order: {
      order_number: `ORD-${dispute.orderId.slice(-8)}`, // Simplified order number
      customer: {
        name: 'Customer Name', // Enhanced API doesn't return customer details
        phone: '9999999999',
      },
      shipment: {
        awb: dispute.awb || 'N/A',
      },
    },
  })) || [];

  // Define columns
  const columns: ColumnDef<WeightDispute>[] = [
    {
      accessorKey: 'dispute_id',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dispute Details" />,
      cell: ({ row }) => {
        const dispute = row.original;
        return (
          <div className="flex flex-col">
            <CopyBtn
              label={dispute.dispute_id}
              text={dispute.dispute_id}
              className="text-blue-600 font-medium"
              labelClassName="text-blue-600 hover:underline"
              tooltipText="Copy Dispute ID"
            />
            <div className="text-xs text-muted-foreground">
              {new Date(dispute.created_at).toLocaleDateString()}
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'order.order_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order Details" />,
      cell: ({ row }) => {
        const dispute = row.original;
        return (
          <div className="flex flex-col">
            <CopyBtn
              label={dispute.order.order_number}
              text={dispute.order.order_number}
              className="font-medium"
              tooltipText="Copy Order Number"
            />
            <CopyBtn
              label={dispute.order.shipment.awb}
              text={dispute.order.shipment.awb}
              className="text-xs text-muted-foreground"
              tooltipText="Copy AWB"
            />
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'order.customer.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => {
        const dispute = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{dispute.order.customer.name}</span>
            <CopyBtn
              label={dispute.order.customer.phone}
              text={dispute.order.customer.phone}
              className="text-xs text-muted-foreground"
              tooltipText="Copy Phone"
            />
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'courier_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Courier" />,
      cell: ({ row }) => {
        const dispute = row.original;
        return (
          <div className="font-medium">{dispute.courier_name}</div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'weight_details',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Weight Details" />,
      cell: ({ row }) => {
        const dispute = row.original;
        const weightDifference = dispute.disputed_weight - dispute.original_weight;
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Original:</span>
              <span className="font-medium">{dispute.original_weight} kg</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Disputed:</span>
              <span className="font-medium text-red-600">{dispute.disputed_weight} kg</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Difference:</span>
              <span className={`font-bold ${weightDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {weightDifference > 0 ? '+' : ''}{weightDifference} kg
              </span>
            </div>
            {dispute.final_weight && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Final:</span>
                <span className="font-medium text-blue-600">{dispute.final_weight} kg</span>
              </div>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'charges_impact',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Charges Impact" />,
      cell: ({ row }) => {
        const dispute = row.original;
        const chargesDifference = (dispute.revised_charges || dispute.original_charges) - dispute.original_charges;
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Original:</span>
              <span className="font-medium">{currencyFormatter(dispute.original_charges)}</span>
            </div>
            {dispute.revised_charges && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Revised:</span>
                <span className="font-medium text-blue-600">{currencyFormatter(dispute.revised_charges)}</span>
              </div>
            )}
            {chargesDifference !== 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Difference:</span>
                <span className={`font-bold ${chargesDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {chargesDifference > 0 ? '+' : ''}{currencyFormatter(chargesDifference)}
                </span>
              </div>
            )}
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
        
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'PENDING':
              return {
                icon: AlertTriangle,
                className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                label: 'Pending'
              };
            case 'ACCEPTED':
              return {
                icon: CheckCircle,
                className: 'bg-green-100 text-green-800 border-green-200',
                label: 'Accepted'
              };
            case 'REJECTED':
              return {
                icon: XCircle,
                className: 'bg-red-100 text-red-800 border-red-200',
                label: 'Rejected'
              };
            case 'RESOLVED':
              return {
                icon: Scale,
                className: 'bg-blue-100 text-blue-800 border-blue-200',
                label: 'Resolved'
              };
            default:
              return {
                icon: AlertTriangle,
                className: 'bg-gray-100 text-gray-800 border-gray-200',
                label: status
              };
          }
        };

        const config = getStatusConfig(dispute.status);
        const Icon = config.icon;
        
        return (
          <div className="space-y-2">
            <Badge className={`${config.className} flex items-center gap-1 w-fit`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
            {dispute.resolution_date && (
              <div className="text-xs text-muted-foreground">
                Resolved: {new Date(dispute.resolution_date).toLocaleDateString()}
              </div>
            )}
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
      header: 'Actions',
      cell: ({ row }) => {
        const dispute = row.original;
        
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedDispute(dispute);
              setIsModalOpen(true);
            }}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            View Details
          </Button>
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
      id: 'status',
      title: 'Status',
      options: [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Accepted', value: 'ACCEPTED' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'Resolved', value: 'RESOLVED' },
      ],
    },
    {
      id: 'courier_name',
      title: 'Courier',
      options: [], // Will be populated dynamically from data
    },
  ];

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-semibold">Error loading weight disputes</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            There was an error loading the weight disputes. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <DataTable
        columns={columns}
        data={transformedDisputes}
        count={data?.pagination?.total || 0}
        pageCount={data?.pagination?.totalPages || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        filterableColumns={filterableColumns}
        searchableColumns={[
          {
            id: 'dispute_id',
            title: 'Dispute ID',
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
        ]}
        searchPlaceholder="Search disputes by ID, order number, AWB, or customer..."
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

      {/* Weight Dispute Modal */}
      <WeightDisputeModal
        dispute={selectedDispute}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onResolved={handleDisputeResolved}
      />
    </div>
  );
} 