'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@lorrigo/ui/components';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@lorrigo/ui/components';
import { User, CreditCard, Package, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { currencyFormatter } from '@lorrigo/utils/functions';
import { TransactionHistoryTable } from '@/components/tables/billing/transaction-history-table';
import { WeightDisputesTable } from '@/components/tables/billing/weight-disputes-table';
import { useModalStore } from '@/modal/modal-store';
import { useUserOperations } from '@/lib/apis/users';
import { UserProfileForm } from '@/components/user-profile-form';
import SettingsPage from '@/components/settings';

export default function UserDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('profile');
  const { openModal } = useModalStore();

  // Use the users API hook
  const { getUserById } = useUserOperations();
  const { data: userData, isLoading, refetch } = getUserById(id as string);
  const user = userData?.user;

  const handleAssignPlan = () => {
    openModal('assign-plan', { userId: id });
  };

  const handleProfileUpdated = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
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
    <div className="p-6 space-y-6">
      {/* Header */}
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user._count?.orders || 0}</div>
            <p className="text-xs text-muted-foreground">Total orders</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user._count?.shipments || 0}</div>
            <p className="text-xs text-muted-foreground">Total shipments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter(user.wallet_balance || 0)}</div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.plan?.name || 'No Plan'}
            </div>
            <p className="text-xs text-muted-foreground">{user.plan?.type || 'Not assigned'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="disputes">Weight Disputes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-6">
          {/* <UserProfileForm 
            userId={id as string} 
            profile={user.profile} 
            onSuccess={handleProfileUpdated}
          /> */}
          <SettingsPage />
        </TabsContent>
        
        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View all financial transactions for this user</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionHistoryTable userId={id as string} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="disputes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Weight Disputes</CardTitle>
              <CardDescription>Manage weight disputes for this user</CardDescription>
            </CardHeader>
            <CardContent>
              <WeightDisputesTable userId={id as string} userRole="ADMIN" />
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
    </div>
  );
} 