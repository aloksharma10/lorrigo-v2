'use client';

import * as React from 'react';
import { Button, Checkbox, Badge, Switch } from '@lorrigo/ui/components';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { toast } from '@lorrigo/ui/components';
import type { ColumnDef } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useHubOperations, type Hub } from '@/lib/apis/hub';
import { useSearchParams } from 'next/navigation';
import { MapPin, Phone, User, Building2, Star, AlertCircle, Plus } from 'lucide-react';
import { useAuthToken } from '@/components/providers/token-provider';
import ActionTooltip from '@/components/action-tooltip';
import HoverCardToolTip from '@/components/hover-card-tooltip';
import { useModal } from '@/modal/modal-provider';

export default function PickupAddressesPage() {
  const searchParams = useSearchParams();
  const { isTokenReady } = useAuthToken();
  const { openModal } = useModal();

  const defaultParams = {
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 0,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 15,
    search: searchParams.get('search') || '',
    is_active: searchParams.get('is_active') || undefined,
    is_primary: searchParams.get('is_primary') || undefined,
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

  // API hooks
  const { getHubsQuery, updateHubStatus, setPrimaryHub } = useHubOperations();

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

  // Fetch hubs with React Query
  const { data, isLoading, isError, isFetching, error } = getHubsQuery(convertFiltersToParams(filters));

  // Handle create pickup address
  const handleCreatePickupAddress = () => {
    openModal('seller:add-pickup-location', {
      title: 'Create Your First Pickup Address',
    });
  };

  // Handle edit pickup address
  const handleEditPickupAddress = (hub: Hub) => {
    // TODO: Open edit pickup address modal
    toast.info('Edit pickup address functionality coming soon');
  };

  // Handle delete pickup address
  const handleDeletePickupAddress = async (hubId: string) => {
    // TODO: Implement delete functionality
    toast.info('Delete pickup address functionality coming soon');
  };

  // Handle toggle active status
  const handleToggleActive = async (hub: Hub, isActive: boolean) => {
    try {
      await updateHubStatus.mutateAsync({ hubId: hub.id, isActive });
      toast.success(`Hub ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update hub status';
      toast.error(errorMessage);
    }
  };

  // Handle set primary hub
  const handleSetPrimary = async (hub: Hub) => {
    try {
      await setPrimaryHub.mutateAsync(hub.id);
      toast.success('Primary hub updated successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to set primary hub';
      toast.error(errorMessage);
    }
  };

  // Define the columns for the data table
  const columns: ColumnDef<Hub>[] = [
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
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pickup Address Details" />,
      cell: ({ row }) => {
        const hub = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex flex-col space-y-1">
              <div className="font-medium">{hub.name}</div>
              <div className="text-muted-foreground text-sm">Code: {hub.code}</div>
              <div className="flex items-center gap-2">
                {hub.is_primary && (
                  <Badge variant="default" className="w-fit text-xs">
                    <Star className="mr-1 h-3 w-3" />
                    Primary
                  </Badge>
                )}
                <Badge variant={hub.is_active ? 'default' : 'secondary'} className="w-fit text-xs">
                  {hub.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'contact_person_name',
      accessorKey: 'contact_person_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contact Person" />,
      cell: ({ row }) => {
        const hub = row.original;
        return (
          <div className="flex items-center space-x-2">
            <User className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{hub.contact_person_name}</span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'phone',
      accessorKey: 'phone',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
      cell: ({ row }) => {
        const hub = row.original;
        return (
          <div className="flex items-center space-x-2">
            <Phone className="text-muted-foreground h-4 w-4" />
            <span>{hub.phone}</span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'address',
      accessorKey: 'address',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Address" />,
      cell: ({ row }) => {
        const hub = row.original;
        return (
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <MapPin className="text-muted-foreground h-4 w-4" />
              <span className="text-sm">{hub.address.address}</span>
            </div>
            <div className="text-muted-foreground text-sm">
              {hub.address.city}, {hub.address.state} - {hub.address.pincode}
            </div>
            {!hub.is_rto_address_same && hub.rto_address && (
              <div className="text-muted-foreground text-xs">
                RTO: {hub.rto_address.city}, {hub.rto_address.state}
              </div>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: 'is_active',
      accessorKey: 'is_active',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const hub = row.original;
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={hub.is_active}
              onCheckedChange={(checked) => handleToggleActive(hub, checked)}
              disabled={hub.is_primary || updateHubStatus.isPending}
            />
            <span className="text-sm">{hub.is_active ? 'Active' : 'Inactive'}</span>
            {hub.is_primary && <AlertCircle className="h-4 w-4 text-yellow-500" />}
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
      id: 'is_primary',
      accessorKey: 'is_primary',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Primary" />,
      cell: ({ row }) => {
        const hub = row.original;
        return (
          <div className="flex items-center space-x-2">
            <HoverCardToolTip
              side="top"
              label="Set as primary"
              triggerComponent={
                <div className="flex items-center space-x-2">
                  {!hub.is_active && <AlertCircle className="h-4 w-4 text-red-500" />}
                  <Switch checked={hub.is_primary} onCheckedChange={() => handleSetPrimary(hub)} disabled={!hub.is_active || setPrimaryHub.isPending} />
                </div>
              }
            >
              <p className="flex items-center space-x-2 text-muted-foreground">
                Primary pickup address can't be disabled. Set another address as primary first.
              </p>
            </HoverCardToolTip>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    // {
    //   id: 'actions',
    //   header: ({ column }) => <DataTableColumnHeader column={column} title="Actions" />,
    //   cell: ({ row }) => {
    //     const hub = row.original;
    //     return (
    //       <div className="flex items-center gap-2">
    //         <Button variant="outline" size="sm" onClick={() => handleEditPickupAddress(hub)}>
    //           Edit
    //         </Button>
    //         <Button variant="destructive" size="sm" onClick={() => handleDeletePickupAddress(hub.id)} disabled={hub.is_primary}>
    //           Delete
    //         </Button>
    //       </div>
    //     );
    //   },
    //   enableSorting: false,
    //   enableHiding: false,
    // },
  ];

  // Define filterable columns
  const filterableColumns = [
    {
      id: 'is_active',
      title: 'Status',
      options: [
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' },
      ],
    },
    {
      id: 'is_primary',
      title: 'Primary Status',
      options: [
        { label: 'Primary', value: 'true' },
        { label: 'Secondary', value: 'false' },
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pickup Addresses</h1>
          <p className="text-muted-foreground">Manage your pickup addresses and warehouse locations</p>
        </div>
        <Button onClick={handleCreatePickupAddress}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pickup Address
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.hubs || []}
        count={data?.total || 0}
        pageCount={data?.totalPages || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        filterableColumns={filterableColumns}
        searchableColumns={[
          {
            id: 'name',
            title: 'Facility Name',
          },
          {
            id: 'contact_person_name',
            title: 'Contact Person',
          },
          {
            id: 'phone',
            title: 'Phone Number',
          },
          {
            id: 'address.address',
            title: 'Address',
          },
          {
            id: 'address.city',
            title: 'City',
          },
        ]}
        searchPlaceholder="Search by facility name, contact person, phone, or address..."
        isLoading={isLoading || isFetching}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : 'Failed to fetch pickup addresses. Please try again.'}
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
