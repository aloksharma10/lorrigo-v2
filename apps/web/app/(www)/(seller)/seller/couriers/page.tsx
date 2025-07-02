'use client';

import * as React from 'react';
import { Checkbox } from '@lorrigo/ui/components';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { toast } from '@lorrigo/ui/components';
import type { ColumnDef } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useCourierOperations } from '@/lib/apis/couriers';
import { useSearchParams } from 'next/navigation';
import { Truck } from 'lucide-react';

interface Courier {
  id: string;
  name: string;
  is_active: boolean;
  is_reversed_courier: boolean;
  weight_slab?: number;
  increment_weight?: number;
}

export default function CouriersPage() {
  const searchParams = useSearchParams();
  const initialParams = {
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 0,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 15,
    search: searchParams.get('search') || '',
    is_active: searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : undefined,
  };

  const [pagination, setPagination] = React.useState({
    pageIndex: initialParams.page || 0,
    pageSize: initialParams.limit || 15,
  });
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([]);
  const [filters, setFilters] = React.useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = React.useState(initialParams.search || '');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);

  // API hooks
  const { getCouriersQuery, createCourier, updateCourier, deleteCourier } = useCourierOperations();

  const { data, isLoading, isError } = getCouriersQuery;

  // Handle create courier
  const handleCreateCourier = () => {
    // TODO: Open create courier modal
    toast.info('Create courier functionality coming soon');
  };

  // Handle edit courier
  const handleEditCourier = (courier: Courier) => {
    // TODO: Open edit courier modal
    toast.info('Edit courier functionality coming soon');
  };

  // Handle delete courier
  const handleDeleteCourier = async (courierId: string) => {
    try {
      await deleteCourier.mutateAsync(courierId);
      toast.success('Courier deleted successfully');
    } catch (error) {
      toast.error('Failed to delete courier');
    }
  };

  // Define the columns for the data table
  const columns: ColumnDef<Courier>[] = [
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
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Courier Name" />,
      cell: ({ row }) => {
        const courier = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <Truck className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex flex-col space-y-1">
              <div className="font-medium">{courier.name}</div>
              {courier.is_reversed_courier && (
                <Badge variant="outline" className="w-fit text-xs">
                  Reverse Courier
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
      accessorKey: 'is_active',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const courier = row.original;
        return (
          <Badge
            variant={courier.is_active ? 'default' : 'secondary'}
            className={
              courier.is_active
                ? 'w-fit border-green-200 bg-green-50 text-green-600 dark:border-green-700 dark:bg-green-900 dark:text-green-50'
                : 'w-fit border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50'
            }
          >
            {courier.is_active ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'weight_slab',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Weight Slab" />,
      cell: ({ row }) => {
        const courier = row.original;
        return (
          <div className="text-sm">{courier.weight_slab ? `${courier.weight_slab} kg` : 'N/A'}</div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'increment_weight',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Increment Weight" />,
      cell: ({ row }) => {
        const courier = row.original;
        return (
          <div className="text-sm">
            {courier.increment_weight ? `${courier.increment_weight} kg` : 'N/A'}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Couriers</h1>
          <p className="text-muted-foreground">
            List of your available courier services and shipping options
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.couriers || []}
        count={data?.total || 0}
        pageCount={data?.totalPages || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to fetch couriers. Please try again."
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        manualPagination={false}
        manualSorting={false}
        manualFiltering={false}
        onFiltersChange={setFilters}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  );
}
