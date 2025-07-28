'use client';

import { Button } from '@lorrigo/ui/components';
import { format } from 'date-fns';
import { useUserOperations } from '@/lib/apis/users';
import { useModalStore } from '@/modal/modal-store';
import { CreditCard, Package, Settings } from 'lucide-react';
import { currencyFormatter } from '@lorrigo/utils/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@lorrigo/ui/components';

export function SettingsHeader({ id }: { id: string }) {
  const { openModal } = useModalStore();

  // Use the users API hook
  const { getUserById } = useUserOperations();
  const { data: userData, isLoading } = getUserById(id as string);
  const user = userData?.user;

  const handleAssignPlan = () => {
    openModal('assign-plan', { userId: id });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">User not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-muted-foreground">
            {user.email} • Joined {format(new Date(user.created_at), 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAssignPlan}>
            Assign Plan
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user._count?.orders || 0}</div>
            <p className="text-muted-foreground text-xs">Total orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipments</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user._count?.shipments || 0}</div>
            <p className="text-muted-foreground text-xs">Total shipments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <CreditCard className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter(user.wallet_balance || 0)}</div>
            <p className="text-muted-foreground text-xs">Available balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Settings className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.plan?.name || 'No Plan'}</div>
            <p className="text-muted-foreground text-xs">{user.plan?.type || 'Not assigned'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
