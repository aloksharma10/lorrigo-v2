'use client';

import React, { useState } from 'react';
import { Button, Badge, toast } from '@lorrigo/ui/components';
import { Plus, RefreshCw, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { useModal } from '@/modal/modal-provider';
import { CreateChannelModal } from '@/components/modals/create-channel-modal';
import { formatDate } from '@lorrigo/utils';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { ColumnDef } from '@lorrigo/ui/components';
import { useChannelOperations } from '@/lib/apis/channels';

// Mock data for channels
const mockChannels: ChannelConfig[] = [
  {
    id: '1',
    name: 'Channel A',
    nickname: 'ChanA',
    is_active: true,
    created_at: new Date('2023-01-01'),
    updated_at: new Date('2023-06-01'),
    _count: { couriers: 5 },
  },
  {
    id: '2',
    name: 'Channel B',
    nickname: 'ChanB',
    is_active: false,
    created_at: new Date('2023-02-01'),
    updated_at: new Date('2023-07-01'),
    _count: { couriers: 3 },
  },
  // Add more mock data as needed
];

interface ChannelConfig {
  id: string;
  name: string;
  nickname: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  _count: { couriers: number };
}

export default function ManageChannelsPage() {
  const { openModal, closeAllModals } = useModal();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const [filters, setFilters] = useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Get channel operations
  const { deleteChannel, toggleChannelStatus, getChannels } = useChannelOperations();

  // Fetch channels with React Query
  const { data, isLoading, isError, error, refetch } = getChannels(
    pagination.pageIndex + 1,
    pagination.pageSize,
    globalFilter
  );

  const channels = data?.channelConfigs || [];
  const totalCount = data?.total || 0;
  const pageCount = data?.totalPages || 0;

  // Channel operations handlers
  const handleCreateChannel = () => {
    openModal('create-channel', {
      title: 'Create New Channel',
      component: CreateChannelModal,
      props: {
        onClose: closeAllModals,
        onSuccess: () => {
          refetch();
          toast.success('Channel created successfully');
        },
      },
    });
  };

  const handleEditChannel = (channel: ChannelConfig) => {
    // openModal('edit-channel', {
    //   title: 'Edit Channel',
    //   component: CreateChannelModal,
    //   props: {
    //     channel,
    //     onClose: closeAllModals,
    //     onSuccess: (updatedChannel: ChannelConfig) => {
    //       setChannels(
    //         channels.map((ch) =>
    //           ch.id === channel.id ? { ...updatedChannel, id: channel.id, _count: ch._count } : ch
    //         )
    //       );
    //       toast.success('Channel updated successfully');
    //     },
    //   },
    // });
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await deleteChannel.mutateAsync(channelId);
      // refetch();
      toast.success('Channel deleted successfully');
    } catch (error) {
      console.error('Failed to delete channel:', error);
      toast.error('Failed to delete channel');
    }
  };

  const handleToggleChannelStatus = async (channelId: string, currentStatus: boolean) => {
    try {
      await toggleChannelStatus.mutateAsync(channelId);
      // refetch();
      toast.success(`Channel ${currentStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error('Failed to toggle channel status:', error);
      toast.error('Failed to update channel status');
    }
  };

  // Define the columns for the data table
  const columns: ColumnDef<ChannelConfig>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      id: 'nickname',
      accessorKey: 'nickname',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nickname" />,
      cell: ({ row }) => <div>{row.getValue('nickname')}</div>,
    },
    {
      id: 'is_active',
      accessorKey: 'is_active',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const isActive = row.getValue('is_active');
        return (
          <Badge variant={isActive ? 'success' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (value === 'all') return true;
        return value === 'active' ? row.getValue(id) : !row.getValue(id);
      },
    },
    {
      id: 'couriers',
      accessorKey: '_count.couriers',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couriers" />,
      cell: ({ row }) => {
        const count = row.original._count?.couriers || 0;
        return <Badge variant="outline">{count}</Badge>;
      },
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => <div>{formatDate(row.original.created_at)}</div>,
    },
    {
      id: 'updated_at',
      accessorKey: 'updated_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      cell: ({ row }) => <div>{formatDate(row.original.updated_at)}</div>,
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actions" />,
      cell: ({ row }) => {
        const channel = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleToggleChannelStatus(channel.id, channel.is_active)}
              title={channel.is_active ? 'Deactivate' : 'Activate'}
            >
              {channel.is_active ? (
                <PowerOff className="h-4 w-4 text-red-500" />
              ) : (
                <Power className="h-4 w-4 text-green-500" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleEditChannel(channel)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteChannel(channel.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Define filterable columns
  const filterableColumns = [
    {
      id: 'is_active',
      title: 'Status',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ];

  // Define searchable columns
  const searchableColumns = [
    { id: 'name', title: 'Name' },
    { id: 'nickname', title: 'Nickname' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="items-center justify-between lg:flex">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Channels</h1>
          <p className="text-muted-foreground">
            Create and manage channel configurations for your shipping integrations
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 lg:mt-0">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreateChannel}>
            <Plus className="mr-2 h-4 w-4" />
            New Channel
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={channels}
        count={totalCount}
        pageCount={pageCount}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        filterableColumns={filterableColumns}
        searchableColumns={searchableColumns}
        searchPlaceholder="Search channels by name or nickname..."
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : 'Failed to fetch channels'}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        onFiltersChange={setFilters}
        onGlobalFilterChange={setGlobalFilter}
        manualPagination={false} // Client-side pagination
        manualSorting={false} // Client-side sorting
        manualFiltering={false} // Client-side filtering
      />
    </div>
  );
}
