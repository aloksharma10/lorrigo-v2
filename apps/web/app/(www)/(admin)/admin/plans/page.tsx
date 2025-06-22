'use client';
import { useCallback, useMemo, useState, ReactNode } from 'react';
import {
  Button,
  Badge,
  TableCell,
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
import { CardItems } from '@/components/card-items';

// Main Page Component
export default function ManagePlansPage() {
  const router = useRouter();
  const { openModal, closeAllModals } = useModal();

  // State for channel filtering and pagination
  const [channelPage, setChannelPage] = useState(1);
  const [channelLimit] = useState(10);
  const [channelSearch, setChannelSearch] = useState('');
  const [channelActiveFilter, setChannelActiveFilter] = useState<boolean | undefined>(undefined);
  const [selectedChannel, setSelectedChannel] = useState<ChannelConfig | null>(null);

  // API hooks
  const { getPlansQuery } = usePlanOperations();
  const { getCouriersQuery } = useCourierOperations();
  const {
    getChannels,
    getActiveChannels,
    deleteChannel,
    toggleChannelStatus
  } = useChannelOperations();

  // Queries with dependencies
  const plansQuery = getPlansQuery();
  const channelsQuery = getChannels(channelPage, channelLimit, channelSearch || undefined, channelActiveFilter);
  const activeChannelsQuery = getActiveChannels();

  // Memoized data to prevent unnecessary re-renders
  const plans = useMemo(() => plansQuery.data || [], [plansQuery.data]);
  const couriers = useMemo(() => getCouriersQuery.data || [], [getCouriersQuery.data]);
  const channels = useMemo(() => channelsQuery?.channelConfigs || [], [channelsQuery]);
  const channelsPagination = useMemo(() => channelsQuery?.pagination, [channelsQuery]);
  const activeChannels = useMemo(() => activeChannelsQuery?.data || [], [activeChannelsQuery]);

  // Derived stats for analytics cards
  const totalPlans = useMemo(() => plans.length, [plans]);
  const defaultPlansCount = useMemo(() => plans.filter((p: any) => p.isDefault).length, [plans]);
  const totalCouriers = useMemo(() => couriers.length, [couriers]);
  const activeCouriersCount = useMemo(() => couriers.filter((c: any) => c.is_active).length, [couriers]);
  const assignedUsersCount = useMemo(() =>
    plans.reduce((acc: number, plan: any) => acc + (plan.users?.length || 0), 0),
    [plans]
  );
  const activeChannelsCount = useMemo(() =>
    Array.isArray(activeChannels) ? activeChannels.length : 0,
    [activeChannels]
  );

  // Memoized handlers to prevent recreating functions on each render
  const refreshAllData = useCallback(() => {
    Promise.all([
      plansQuery.refetch(),
      getCouriersQuery.refetch(),
      channelsQuery.refetch(),
      activeChannelsQuery.refetch()
    ]);
  }, [plansQuery, getCouriersQuery, channelsQuery, activeChannelsQuery]);

  const handleCreatePlan = useCallback(() => {
    router.push('/admin/plans/new', { scroll: false });
  }, [router]);

  const handleAssignPlan = useCallback((planId?: string) => {
    openModal('assign-plan', {
      title: 'Assign Plan to User',
      component: AssignPlanModal,
      props: {
        planId,
        onClose: closeAllModals,
      },
    });
  }, [openModal, closeAllModals]);

  const handleCreateCourier = useCallback(() => {
    openModal('create-courier', {
      title: 'Create New Courier',
      component: CreateCourierModal,
      props: {
        onClose: closeAllModals,
      },
    });
  }, [openModal, closeAllModals]);

  const handleCreateChannel = useCallback(() => {
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
  }, [openModal, closeAllModals, channelsQuery, activeChannelsQuery]);

  const handleEditChannel = useCallback((channel: ChannelConfig) => {
    // Placeholder for edit functionality
    console.log('Edit channel:', channel.id);
  }, []);

  const handleDeleteChannel = useCallback(async (channelId: string) => {
    try {
      await deleteChannel.mutateAsync(channelId);
      channelsQuery.refetch();
      activeChannelsQuery.refetch();
    } catch (error) {
      console.error('Failed to delete channel:', error);
    }
  }, [deleteChannel, channelsQuery, activeChannelsQuery]);

  const handleToggleChannelStatus = useCallback(async (channelId: string) => {
    try {
      await toggleChannelStatus.mutateAsync(channelId);
      channelsQuery.refetch();
      activeChannelsQuery.refetch();
    } catch (error) {
      console.error('Failed to toggle channel status:', error);
    }
  }, [toggleChannelStatus, channelsQuery, activeChannelsQuery]);

  const handleChannelSearch = useCallback((value: string) => {
    setChannelSearch(value);
    setChannelPage(1); // Reset to first page when searching
  }, []);

  const handleChannelFilterChange = useCallback((value: string) => {
    const filter = value === 'all' ? undefined : value === 'active';
    setChannelActiveFilter(filter);
    setChannelPage(1); // Reset to first page when filtering
  }, []);

  // Loading and error states
  const isLoading = plansQuery.isLoading || getCouriersQuery.isLoading || channelsQuery.isLoading;
  const hasError = plansQuery.error || getCouriersQuery.error || channelsQuery.error;
  const errorMessage = plansQuery.error?.message || getCouriersQuery.error?.message || channelsQuery.error?.message;

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
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button onClick={refreshAllData} variant="outline">Try Again</Button>
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
        <CardItems
          title="Total Plans"
          value={totalPlans}
          description={`${defaultPlansCount} default plans`}
          icon={Package}
        />
        <CardItems
          title="Active Couriers"
          value={totalCouriers}
          description={`${activeCouriersCount} active`}
          icon={Truck}
        />
        <CardItems
          title="Assigned Users"
          value={assignedUsersCount}
          description="Across all plans"
          icon={Users}
        />
        <CardItems
          title="Channels"
          value={channelsPagination?.total || channels.length}
          description={`${activeChannelsCount} active channels`}
          icon={TrendingUp}
        />
      </div>

      {/* Main Content */}
      <PlansTable onAssignPlan={handleAssignPlan} />

    </div>
  );
}