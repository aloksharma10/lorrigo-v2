'use client';
import { useCallback, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@lorrigo/ui/components';
import { 
  Plus, 
  Package, 
  Users, 
  TrendingUp, 
  Truck, 
  RefreshCw, 
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  Power,
  PowerOff,
  Eye,
  Filter
} from 'lucide-react';
import { useModal } from '@/modal/modal-provider';
import PlansTable from '@/components/tables/plans-table';
import { AssignPlanModal } from '@/components/modals/assign-plan-modal';
import { CreateCourierModal } from '@/components/modals/create-courier-modal';
import { CreateChannelModal } from '@/components/modals/create-channel-modal';
import { usePlanOperations } from '@/lib/apis/plans';
import { useCourierOperations } from '@/lib/apis/couriers';
import { useChannelOperations, ChannelConfig } from '@/lib/apis/channels';
import { useRouter } from 'next/navigation';

export default function ManagePlansPage() {
  const { openModal, closeAllModals } = useModal();
  const { getPlansQuery } = usePlanOperations();
  const { getCouriersQuery } = useCourierOperations();
  const { 
    getChannels, 
    getActiveChannels, 
    getChannelById, 
    getChannelByIdentifier,
    createChannel, 
    updateChannel, 
    deleteChannel, 
    toggleChannelStatus 
  } = useChannelOperations();
  const router = useRouter();

  // Channel-specific state
  const [channelPage, setChannelPage] = useState(1);
  const [channelLimit, setChannelLimit] = useState(10);
  const [channelSearch, setChannelSearch] = useState('');
  const [channelActiveFilter, setChannelActiveFilter] = useState<boolean | undefined>(undefined);
  const [selectedChannel, setSelectedChannel] = useState<ChannelConfig | null>(null);

  // Queries
  const channelsQuery = getChannels(channelPage, channelLimit, channelSearch || undefined, channelActiveFilter);
  const activeChannelsQuery = getActiveChannels();
  const selectedChannelQuery = getChannelById(selectedChannel?.id || null);

  // Data will be fetched automatically by React Query
  const plans = getPlansQuery?.data || [];
  const couriers = getCouriersQuery?.data || [];
  const channels = channelsQuery?.channelConfigs || [];
  const channelsPagination = channelsQuery?.pagination;
  const activeChannels = activeChannelsQuery?.data || [];

  // Refresh function for manual data refresh
  const refreshAllData = useCallback(() => {
    Promise.all([
      getPlansQuery.refetch(), 
      getCouriersQuery.refetch(), 
      channelsQuery.refetch(),
      activeChannelsQuery.refetch()
    ]);
  }, [getPlansQuery, getCouriersQuery, channelsQuery, activeChannelsQuery]);

  // Channel operations handlers
  const handleCreateChannel = () => {
    openModal('create-channel', {
      title: 'Create New Channel',
      component: CreateChannelModal,
      props: {
        onClose: closeAllModals,
        onSuccess: () => {
          channelsQuery.refetch();
          activeChannelsQuery.refetch();
        }
      },
    });
  };

  const handleEditChannel = (channel: ChannelConfig) => {
    openModal('edit-channel', {
      title: 'Edit Channel',
      component: CreateChannelModal,
      props: {
        channel,
        onClose: closeAllModals,
        onSuccess: () => {
          channelsQuery.refetch();
          activeChannelsQuery.refetch();
        }
      },
    });
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await deleteChannel.mutateAsync(channelId);
      channelsQuery.refetch();
      activeChannelsQuery.refetch();
    } catch (error) {
      console.error('Failed to delete channel:', error);
    }
  };

  const handleToggleChannelStatus = async (channelId: string) => {
    try {
      await toggleChannelStatus.mutateAsync(channelId);
      channelsQuery.refetch();
      activeChannelsQuery.refetch();
    } catch (error) {
      console.error('Failed to toggle channel status:', error);
    }
  };

  const handleChannelSearch = (value: string) => {
    setChannelSearch(value);
    setChannelPage(1); // Reset to first page when searching
  };

  const handleChannelFilterChange = (value: string) => {
    const filter = value === 'all' ? undefined : value === 'active';
    setChannelActiveFilter(filter);
    setChannelPage(1); // Reset to first page when filtering
  };

  // Other handlers
  const handleCreatePlan = () => {
    router.push('/admin/plans/new', { scroll: false });
  };

  const handleAssignPlan = (planId?: string) => {
    openModal('assign-plan', {
      title: 'Assign Plan to User',
      component: AssignPlanModal,
      props: {
        planId,
        onClose: closeAllModals,
      },
    });
  };

  const handleCreateCourier = () => {
    openModal('create-courier', {
      title: 'Create New Courier',
      component: CreateCourierModal,
      props: {
        onClose: closeAllModals,
      },
    });
  };

  // Check if any queries are loading
  const isLoading = getPlansQuery.isLoading || getCouriersQuery.isLoading || channelsQuery.isLoading;

  // Check if any queries have errors
  const hasError = getPlansQuery.error || getCouriersQuery.error || channelsQuery.error;

  // Show loading state
  if (isLoading && !channels.length) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-2 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="text-lg font-semibold text-red-500">Error loading data</div>
            <p className="text-muted-foreground">
              {getPlansQuery.error?.message ||
                getCouriersQuery.error?.message ||
                channelsQuery.error?.message}
            </p>
            <Button onClick={refreshAllData} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="items-center justify-between lg:flex">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Plans</h1>
          <p className="text-muted-foreground">
            Create and manage shipping plans, assign users, and configure couriers & channels
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 overflow-x-auto lg:mt-0 lg:overflow-x-hidden">
          <Button onClick={refreshAllData} variant="ghost" size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateChannel} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Channel
          </Button>
          <Button onClick={handleCreateCourier} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Courier
          </Button>
          <Button onClick={() => handleAssignPlan()} variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Assign Plan
          </Button>
          <Button onClick={handleCreatePlan}>
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
            <p className="text-muted-foreground text-xs">
              {plans.filter((p: any) => p.isDefault).length} default plans
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Couriers</CardTitle>
            <Truck className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{couriers.length}</div>
            <p className="text-muted-foreground text-xs">
              {couriers.filter((c: any) => c.is_active).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Users</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.reduce((acc: number, plan: any) => acc + (plan.users?.length || 0), 0)}
            </div>
            <p className="text-muted-foreground text-xs">Across all plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Channels</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{channelsPagination?.total || channels.length}</div>
            <p className="text-muted-foreground text-xs">
              {activeChannels.length} active channels
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="users">Assigned Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Plans</CardTitle>
              <CardDescription>Manage your shipping plans and their configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <PlansTable onAssignPlan={handleAssignPlan} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel Management</CardTitle>
              <CardDescription>Manage your shipping channels and their configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Channel Filters */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search channels..."
                      value={channelSearch}
                      onChange={(e) => handleChannelSearch(e.target.value)}
                      className="pl-9 w-[250px]"
                    />
                  </div>
                  <Select value={channelActiveFilter === undefined ? 'all' : channelActiveFilter ? 'active' : 'inactive'} onValueChange={handleChannelFilterChange}>
                    <SelectTrigger className="w-[130px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateChannel}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Channel
                </Button>
              </div>

              {/* Channels Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Nickname</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Couriers</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-muted-foreground">
                            {channelSearch || channelActiveFilter !== undefined ? 'No channels found matching your filters' : 'No channels configured yet'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      channels.map((channel: ChannelConfig) => (
                        <TableRow key={channel.id}>
                          <TableCell className="font-medium">{channel.name}</TableCell>
                          <TableCell>{channel.nickname}</TableCell>
                          <TableCell>
                            <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                              {channel.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Truck className="h-4 w-4" />
                              <span>{channel._count?.couriers || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(channel.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedChannel(channel)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Channel Details</DialogTitle>
                                    <DialogDescription>
                                      View detailed information about {channel.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium">Basic Information</h4>
                                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                        <div>Name: {channel.name}</div>
                                        <div>Nickname: {channel.nickname}</div>
                                        <div>Status: {channel.is_active ? 'Active' : 'Inactive'}</div>
                                        <div>Couriers: {channel._count?.couriers || 0}</div>
                                      </div>
                                    </div>
                                    {channel.couriers && channel.couriers.length > 0 && (
                                      <div>
                                        <h4 className="font-medium">Associated Couriers</h4>
                                        <div className="mt-2 space-y-1">
                                          {channel.couriers.map((courier) => (
                                            <div key={courier.id} className="flex items-center gap-2 text-sm">
                                              <Badge variant={courier.is_active ? 'default' : 'secondary'} className="text-xs">
                                                {courier.name}
                                              </Badge>
                                              <span className="text-muted-foreground">({courier.code})</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditChannel(channel)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleChannelStatus(channel.id)}
                                disabled={toggleChannelStatus.isPending}
                              >
                                {channel.is_active ? (
                                  <PowerOff className="h-4 w-4" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Channel</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{channel.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteChannel(channel.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {channelsPagination && channelsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((channelsPagination.currentPage - 1) * channelsPagination.limit) + 1} to {Math.min(channelsPagination.currentPage * channelsPagination.limit, channelsPagination.total)} of {channelsPagination.total} channels
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChannelPage(channelPage - 1)}
                      disabled={channelPage <= 1 || channelsQuery.isLoading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {channelsPagination.currentPage} of {channelsPagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChannelPage(channelPage + 1)}
                      disabled={channelPage >= channelsPagination.totalPages || channelsQuery.isLoading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Users</CardTitle>
              <CardDescription>View and manage users assigned to different plans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground py-8 text-center">
                User assignments table will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan Analytics</CardTitle>
              <CardDescription>View usage statistics and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground py-8 text-center">
                Analytics dashboard will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}