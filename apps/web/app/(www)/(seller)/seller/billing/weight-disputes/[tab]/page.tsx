'use client';

import { useState, useEffect } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { WeightDisputesTable } from '@/components/tables/billing/weight-disputes-table';
import { useBillingOperations } from '@/lib/apis/billing';
import { useParams } from 'next/navigation';
import { WEIGHT_DISPUTE_TAB_ROUTES } from '@/lib/routes/nested-shipments';
import ClientTabs from '@/components/client-tabs';

export default function SellerWeightDisputesPage() {
  const { tab } = useParams();
  const [activeTab, setActiveTab] = useState<string>(tab as string);
  
  // Map tabs to status values for API
  const tabToStatusMap: Record<string, string | undefined> = {
    'pending': 'PENDING',
    'raised_by_seller': 'RAISED_BY_SELLER',
    'resolved': 'RESOLVED',
    'rejected': 'REJECTED',
    'all': undefined
  };
  
  const { disputesQuery } = useBillingOperations({
    disputes: {
      page: 1,
      pageSize: 10,
      status: tabToStatusMap[activeTab] || undefined
    }
  });

  const { data: disputes } = disputesQuery;


  // Calculate stats
  const pendingCount = disputes?.data.filter(d => d.status === 'PENDING').length || 0;
  const resolvedCount = disputes?.data.filter(d => d.status === 'RESOLVED').length || 0;
  const rejectedCount = disputes?.data.filter(d => d.status === 'REJECTED').length || 0;
  const raisedCount = disputes?.data.filter(d => d.status === 'RAISED_BY_SELLER').length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg lg:text-2xl font-bold tracking-tight">Weight Disputes</h1>
          <p className="text-muted-foreground text-sm lg:text-base">Review and resolve your shipment weight disputes.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Disputes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting resolution</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Raised by You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{raisedCount}</div>
            <p className="text-xs text-muted-foreground">Evidence provided</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{resolvedCount}</div>
            <p className="text-xs text-muted-foreground">Successfully resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Rejected disputes</p>
          </CardContent>
        </Card>
      </div>

      <ClientTabs menuItems={WEIGHT_DISPUTE_TAB_ROUTES} />
      <WeightDisputesTable userRole="SELLER" status={tabToStatusMap[activeTab]} />

    </div>
  );
} 