'use client';
import { useCallback } from 'react';
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
} from '@lorrigo/ui/components';
import { Plus, Package, Users, TrendingUp, Truck, RefreshCw } from 'lucide-react';
import { useModal } from '@/modal/modal-provider';
import PlansTable from '@/components/tables/plans-table';
import { AssignPlanModal } from '@/components/modals/assign-plan-modal';
import { CreateCourierModal } from '@/components/modals/create-courier-modal';
import { CreateChannelModal } from '@/components/modals/create-channel-modal';
import { usePlanOperations } from '@/lib/apis/plans';
import { useCourierOperations } from '@/lib/apis/couriers';
import { useChannelOperations } from '@/lib/apis/channels';
import { useRouter } from 'next/navigation';

export default function ManagePlansPage() {
  const { openModal, closeAllModals } = useModal();
  const { getPlansQuery } = usePlanOperations();
  const { getCouriersQuery } = useCourierOperations();
  const { getChannelsQuery } = useChannelOperations();
  const router = useRouter();

  // Data will be fetched automatically by React Query
  // No need to manually refetch on every render

  // Refresh function for manual data refresh
  const refreshAllData = useCallback(() => {
    Promise.all([getPlansQuery.refetch(), getCouriersQuery.refetch(), getChannelsQuery.refetch()]);
  }, [getPlansQuery, getCouriersQuery, getChannelsQuery]);

  const handleCreatePlan = () => {
    router.push('/admin/plan/new', { scroll: false });
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

  const handleCreateChannel = () => {
    openModal('create-channel', {
      title: 'Create New Channel',
      component: CreateChannelModal,
      props: {
        onClose: closeAllModals,
      },
    });
  };

  const plans = getPlansQuery.data || [];
  const couriers = getCouriersQuery.data || [];
  const channels = getChannelsQuery.data || [];

  // Check if any queries are loading
  const isLoading =
    getPlansQuery.isLoading || getCouriersQuery.isLoading || getChannelsQuery.isLoading;

  // Check if any queries have errors
  const hasError = getPlansQuery.error || getCouriersQuery.error || getChannelsQuery.error;

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-2 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <p className="text-muted-foreground">Loading plans data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="text-lg font-semibold text-red-500">Error loading data</div>
            <p className="text-muted-foreground">
              {getPlansQuery.error?.message ||
                getCouriersQuery.error?.message ||
                getChannelsQuery.error?.message}
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
    <div className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="items-center justify-between lg:flex">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Plans</h1>
          <p className="text-muted-foreground">
            Create and manage shipping plans, assign users, and configure couriers
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
            <div className="text-2xl font-bold">{channels.length}</div>
            <p className="text-muted-foreground text-xs">Available channels</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
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
