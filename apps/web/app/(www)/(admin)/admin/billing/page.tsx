'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { Scale, History, CreditCard, Users, Upload, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useBillingOperations } from '@/lib/apis/billing';

export default function AdminBillingPage() {
  const { walletBalanceQuery, billingCyclesQuery, disputesQuery } = useBillingOperations();
  
  // Get counts from queries
  const pendingDisputesCount = disputesQuery.data?.data.filter(d => d.status === 'PENDING').length || 0;
  const activeCyclesCount = billingCyclesQuery.data?.data.filter(c => c.status === 'ACTIVE').length || 0;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
        <p className="text-muted-foreground">
          Manage billing cycles, weight disputes, and transaction history
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Weight Disputes Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Weight Disputes</CardTitle>
            <Scale className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDisputesCount}</div>
            <p className="text-xs text-muted-foreground">Pending disputes</p>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/billing/weight-disputes" className="flex items-center justify-between">
                  <span>Manage Disputes</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Billing Cycles Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Billing Cycles</CardTitle>
            <History className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCyclesCount}</div>
            <p className="text-xs text-muted-foreground">Active billing cycles</p>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/billing/cycles" className="flex items-center justify-between">
                  <span>Manage Cycles</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Transactions Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Transactions</CardTitle>
            <CreditCard className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">View All</div>
            <p className="text-xs text-muted-foreground">Transaction history</p>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/billing/transactions" className="flex items-center justify-between">
                  <span>View Transactions</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center justify-center gap-2">
            <Link href="/admin/billing/weight-disputes">
              <Upload className="h-5 w-5" />
              <span>Upload Weight Disputes</span>
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center justify-center gap-2">
            <Link href="/admin/billing/cycles/new">
              <History className="h-5 w-5" />
              <span>Create Billing Cycle</span>
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center justify-center gap-2">
            <Link href="/admin/users">
              <Users className="h-5 w-5" />
              <span>Manage Users</span>
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center justify-center gap-2">
            <Link href="/admin/billing/transactions">
              <CreditCard className="h-5 w-5" />
              <span>View Transactions</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 