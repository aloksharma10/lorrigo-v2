'use client';

import * as React from 'react';
import { Button, Checkbox, Badge } from '@lorrigo/ui/components';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { toast } from '@lorrigo/ui/components';
import type { ColumnDef } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useCourierOperations, type Courier } from '@/lib/apis/couriers';
import { useSearchParams } from 'next/navigation';
import { Truck, Package, Clock, Weight } from 'lucide-react';
import { useDrawer } from '@/components/providers/drawer-provider';
import { useAuthToken } from '@/components/providers/token-provider';
import { useModal } from '@/modal/modal-provider';

export function CouriersTable() {
  const searchParams = useSearchParams();
  const { isAdmin } = useAuthToken();

  const defaultParams = {
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 0,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 15,
    search: searchParams.get('search') || '',
    is_active: searchParams.get('is_active') || undefined,
    courier_type: searchParams.get('courier_type') || undefined,
    weight_slab: searchParams.get('weight_slab') || undefined,
    is_reversed_courier: searchParams.get('is_reversed_courier') || undefined,
    sortBy: searchParams.get('sortBy') || 'name',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
  };

  const [pagination, setPagination] = React.useState({
    pageIndex: defaultParams.page || 0,
    pageSize: defaultParams.limit || 15,
  });
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>(
    defaultParams.sortBy ? [{ id: defaultParams.sortBy, desc: defaultParams.sortOrder === 'desc' }] : []
  );
  const [filters, setFilters] = React.useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = React.useState(defaultParams.search || '');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);
  const { openDrawer } = useDrawer();

  // API hooks
  const { getCouriersQuery, createCourier, updateCourier, deleteCourier } = useCourierOperations();

  // Convert filters to comma-separated strings
  const convertFiltersToParams = (filters: { id: string; value: any }[]) => {
    const params: any = {
      page: pagination.pageIndex + 1, // API uses 1-based pagination
      limit: pagination.pageSize,
      globalFilter: debouncedGlobalFilter,
      sorting,
    };

    // Convert filters to comma-separated values
    filters.forEach((filter) => {
      if (Array.isArray(filter.value)) {
        params[filter.id] = filter.value.join(',');
      } else {
        params[filter.id] = filter.value.toString();
      }
    });

    return params;
  };

  // Fetch couriers with React Query
  const { data, isLoading, isError, isFetching, error } = getCouriersQuery(convertFiltersToParams(filters));
  const { openModal } = useModal();

  // Handle create courier
  const handleCreateCourier = () => {
    // TODO: Open create courier modal
    openModal('create-courier', { 
      courier: null,
      onSuccess: () => {
      toast.success('Courier created successfully');
    } });
  };

  // Handle edit courier
  const handleEditCourier = (courier: Courier) => {
    openModal('create-courier', { 
      courier: courier,
      onSuccess: () => {
        toast.success('Courier updated successfully');
      }
    });
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
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Courier Details" />,
      cell: ({ row }) => {
        const courier = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <Truck className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex flex-col space-y-1">
              <div className="font-medium">{courier.name} {courier.channel_config?.nickname && `(${courier.channel_config?.nickname})`}</div>
            {isAdmin && <div className="text-muted-foreground text-sm">{courier.courier_code && `Code: ${courier.courier_code}`}</div>}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-fit text-xs">
                  {courier.type}
                </Badge>
                {courier.is_reversed_courier && (
                  <Badge variant="secondary" className="w-fit text-xs">
                    Reverse
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'is_active',
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
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: 'courier_type',
      accessorKey: 'type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const courier = row.original;
        return (
          <Badge variant="outline" className="w-fit">
            {courier.type}
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
      id: 'weight_slab',
      accessorKey: 'weight_slab',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Weight Configuration" />,
      cell: ({ row }) => {
        const courier = row.original;
        return (
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-1 text-sm">
              <Weight className="text-muted-foreground h-3 w-3" />
              <span>Slab: {courier.weight_slab ? `${courier.weight_slab} kg` : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Package className="text-muted-foreground h-3 w-3" />
              <span>Increment: {courier.increment_weight ? `${courier.increment_weight} kg` : 'N/A'}</span>
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        const weightSlab = row.getValue(id) as number;
        return value.some((v: string) => weightSlab === parseFloat(v));
      },
    },
    {
      id: 'is_reversed_courier',
      accessorKey: 'is_reversed_courier',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Direction" />,
      cell: ({ row }) => {
        const courier = row.original;
        return (
          <Badge variant={courier.is_reversed_courier ? 'secondary' : 'default'} className="w-fit">
            {courier.is_reversed_courier ? 'Reverse' : 'Forward'}
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
      id: 'rate_card',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rate Card" />,
      cell: ({ row }) => {
        const courier = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openDrawer('courier-rates', {
                courierId: courier.id,
                size: 'xl',
                courierName: courier.name,
              })
            }
          >
            View Rate Card
          </Button>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
  ];

  if (isAdmin) {
    columns.push({
      id: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Actions" />
      ),
      cell: ({ row }) => {
        const courier = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleEditCourier(courier)}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDeleteCourier(courier.id)}>
              Delete
            </Button>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    });
  }

  // Define filterable columns
  const filterableColumns = [
    ...(isAdmin ? [{
      id: 'is_active',
      title: 'Status',
      options: [
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' },
      ],
    }] : []),
    {
      id: 'courier_type',
      title: 'Courier Type',
      options: [
        { label: 'Express', value: 'EXPRESS' },
        { label: 'Surface', value: 'SURFACE' },
        { label: 'Air', value: 'AIR' },
      ],
    },
    {
      id: 'weight_slab',
      title: 'Weight Slab',
      options: [
        { label: '0.5 kg', value: '0.5' },
        { label: '1 kg', value: '1' },
        { label: '2 kg', value: '2' },
        { label: '5 kg', value: '5' },
        { label: '10 kg', value: '10' },
        { label: '20 kg', value: '20' },
        { label: '50 kg', value: '50' },
      ],
    },
    {
      id: 'is_reversed_courier',
      title: 'Direction',
      options: [
        { label: 'Forward', value: 'false' },
        { label: 'Reverse', value: 'true' },
      ],
    },
  ];

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

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Couriers</h1>
          <p className="text-muted-foreground">List of your available courier services and shipping options</p>
        </div>
        {isAdmin && <Button onClick={handleCreateCourier}>Add Courier</Button>}
      </div>

      <DataTable
        columns={columns}
        dateRangeFilter={false}
        data={data?.couriers || []}
        count={data?.total || 0}
        pageCount={data?.totalPages || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        filterableColumns={filterableColumns}
        searchableColumns={[
          {
            id: 'name',
            title: 'Courier Name',
          },
          {
            id: 'courier_code',
            title: 'Courier Code',
          },
          {
            id: 'channel_config.nickname',
            title: 'Channel Nickname',
          },
        ]}
        searchPlaceholder="Search by courier name, code, or channel nickname..."
        isLoading={isLoading || isFetching}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : 'Failed to fetch couriers. Please try again.'}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        onFiltersChange={handleFiltersChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
      />
    </div>
  );
}
