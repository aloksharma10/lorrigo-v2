'use client';

import { useState } from 'react';
import {
  useShippingOperations,
  BulkOperation,
  BulkOperationsListResponse,
} from '@/lib/apis/shipment';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { Progress } from '@lorrigo/ui/components';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lorrigo/ui/components';
import { MoreHorizontal, FileText, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from '@lorrigo/ui/components';
import type { ColumnDef } from '@lorrigo/ui/components';

export default function BulkOperationsLogPage() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const router = useRouter();

  const { getAllBulkOperations } = useShippingOperations();

  const { data, isLoading, isError, refetch } = getAllBulkOperations({
    page: pagination.pageIndex + 1, // API uses 1-based indexing
    pageSize: pagination.pageSize,
  });

  // Define columns for the data table
  const columns: ColumnDef<BulkOperation>[] = [
    {
      id: 'code',
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Operation Code" />,
      cell: ({ row }) => {
        const operation = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{operation.code}</span>
            <span className="text-muted-foreground text-xs">
              {format(new Date(operation.created_at), 'PPP p')}
            </span>
          </div>
        );
      },
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const operation = row.original;
        const typeLabels: Record<string, string> = {
          CREATE_SHIPMENT: 'Create Shipments',
          SCHEDULE_PICKUP: 'Schedule Pickup',
          CANCEL_SHIPMENT: 'Cancel Shipments',
        };

        return <Badge variant="outline">{typeLabels[operation.type] || operation.type}</Badge>;
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const operation = row.original;
        const statusColorMap: Record<string, string> = {
          PENDING: 'bg-yellow-100 text-yellow-800',
          PROCESSING: 'bg-blue-100 text-blue-800',
          COMPLETED: 'bg-green-100 text-green-800',
          FAILED: 'bg-red-100 text-red-800',
        };

        return (
          <Badge className={`${statusColorMap[operation.status]} w-fit`}>{operation.status}</Badge>
        );
      },
    },
    {
      id: 'progress',
      accessorKey: 'progress',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Progress" />,
      cell: ({ row }) => {
        const operation = row.original;
        const progress =
          operation.status === 'COMPLETED'
            ? 100
            : Math.floor((operation.processed_count / operation.total_count) * 100) || 0;

        return (
          <div className="w-full">
            <Progress value={progress} className="h-2" />
            <div className="mt-1 flex justify-between text-xs">
              <span>
                {operation.processed_count} / {operation.total_count} processed
              </span>
              <span>{progress}%</span>
            </div>
            {operation.status === 'COMPLETED' && (
              <div className="mt-1 text-xs">
                <span className="text-green-600">{operation.success_count} successful</span>
                {operation.failed_count > 0 && (
                  <span className="ml-2 text-red-600">{operation.failed_count} failed</span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const operation = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  router.push(`/seller/bulk-log/${operation.id}`);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  refetch();
                  toast.success('Refreshed operation status');
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Extract data from the response

  const operationsData = data?.data || [];
  const totalCount = data?.meta?.total || 0;
  const pageCount = data?.meta?.pageCount || 0;

  return (
    <div className="mx-auto w-full space-y-6 p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bulk Operations Log</h1>
        <p className="text-muted-foreground mt-2">Track and manage your bulk shipment operations</p>
      </div>

      <DataTable
        columns={columns}
        data={operationsData}
        count={totalCount}
        pageCount={pageCount}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load bulk operations"
      />
    </div>
  );
}
