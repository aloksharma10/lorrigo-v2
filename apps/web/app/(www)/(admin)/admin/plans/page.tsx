'use client';
import { useCallback, useMemo } from 'react';
import { Button } from '@lorrigo/ui/components';
import { Plus, Package, Users, RefreshCw } from 'lucide-react';
import { useModal } from '@/modal/modal-provider';
import PlansTable from '@/components/tables/plans-table';
import { AssignPlanModal } from '@/components/modals/assign-plan-modal';
import { usePlanOperations } from '@/lib/apis/plans';
import { useRouter } from 'next/navigation';
import { CardItems } from '@/components/card-items';

// Main Page Component
export default function ManagePlansPage() {
  const router = useRouter();
  const { openModal, closeAllModals } = useModal();
  const { getPlansQuery } = usePlanOperations();
  const plansQuery = getPlansQuery();

  const plans = useMemo(() => plansQuery.data || [], [plansQuery.data]);

  const totalPlans = useMemo(() => plans.length, [plans]);
  const defaultPlansCount = useMemo(() => plans.filter((p: any) => p.isDefault).length, [plans]);

  const assignedUsersCount = useMemo(
    () => plans.reduce((acc: number, plan: any) => acc + (plan.users?.length || 0), 0),
    [plans]
  );

  // Memoized handlers to prevent recreating functions on each render
  const refreshAllData = useCallback(() => {
    Promise.all([plansQuery.refetch()]);
  }, [plansQuery]);

  const handleCreatePlan = useCallback(() => {
    router.push('/admin/plans/new', { scroll: false });
  }, [router]);

  const handleAssignPlan = useCallback(
    (planId?: string) => {
      openModal('assign-plan', {
        title: 'Assign Plan to User',
        component: AssignPlanModal,
        planId,
        onClose: closeAllModals,
      });
    },
    [openModal, closeAllModals]
  );

  // Loading and error states
  const isLoading = plansQuery.isLoading || plansQuery.isFetching;
  const hasError = plansQuery.error;
  const errorMessage = plansQuery.error?.message;

  // Show loading state
  if (isLoading && !plans.length) {
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
          <Button
            isLoading={isLoading}
            onClick={refreshAllData}
            variant="outline"
            size="sm"
            disabled={isLoading}
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Button icon={Plus} onClick={handleCreatePlan} variant="outline">
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
          title="Assigned Users"
          value={assignedUsersCount}
          description="Across all plans"
          icon={Users}
        />
      </div>

      {/* Main Content */}
      <PlansTable onAssignPlan={handleAssignPlan} />
    </div>
  );
}
