'use client';

import { useState, useEffect } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@lorrigo/ui/components';
import { WeightDisputesTable } from '@/components/tables/billing/weight-disputes-table';
import { Upload, Download, RefreshCw, Filter } from 'lucide-react';
import { useModalStore } from '@/modal/modal-store';
import { useBillingOperations } from '@/lib/apis/billing';

export default function WeightDisputesPage() {
  const { openModal } = useModalStore();
  const [activeTab, setActiveTab] = useState<string>('pending');
  
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
      status: tabToStatusMap[activeTab]
    }
  });

  const { data: disputes, refetch, isLoading } = disputesQuery;

  // Refetch data when tab changes
  useEffect(() => {
    refetch();
  }, [activeTab, refetch]);

  const handleOpenUploadModal = () => {
    openModal('weight-dispute-csv');
  };

  const handleOpenActionsModal = () => {
    openModal('dispute-actions-csv');
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/billing/disputes/export?status=${tabToStatusMap[activeTab] || ''}`, {
        method: 'GET',
      });
      
      if (!response.ok) throw new Error('Failed to export disputes');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `weight-disputes-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting disputes:', error);
    }
  };

  // Calculate stats
  const pendingCount = disputes?.data.filter(d => d.status === 'PENDING').length || 0;
  const resolvedCount = disputes?.data.filter(d => d.status === 'RESOLVED').length || 0;
  const rejectedCount = disputes?.data.filter(d => d.status === 'REJECTED').length || 0;
  const raisedCount = disputes?.data.filter(d => d.status === 'RAISED_BY_SELLER').length || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weight Disputes</h1>
          <p className="text-muted-foreground">
            Manage and resolve weight disputes from couriers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Admin Portal
          </Badge>
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
            <CardTitle className="text-sm font-medium">Raised by Seller</CardTitle>
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

      {/* Tabs */}
      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="raised_by_seller">Raised</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

      {/* Controls */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenActionsModal}>
              <Filter className="mr-2 h-4 w-4" />
              Bulk Actions
            </Button>
            <Button onClick={handleOpenUploadModal}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Dispute Report
            </Button>
          </div>
        </div>

        <TabsContent value="pending" className="mt-6">
          <WeightDisputesTable userRole="ADMIN" status={tabToStatusMap[activeTab]} />
        </TabsContent>
        <TabsContent value="raised_by_seller" className="mt-6">
          <WeightDisputesTable userRole="ADMIN" status={tabToStatusMap[activeTab]} />
        </TabsContent>
        <TabsContent value="resolved" className="mt-6">
          <WeightDisputesTable userRole="ADMIN" status={tabToStatusMap[activeTab]} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-6">
          <WeightDisputesTable userRole="ADMIN" status={tabToStatusMap[activeTab]} />
        </TabsContent>
        <TabsContent value="all" className="mt-6">
          <WeightDisputesTable userRole="ADMIN" status={tabToStatusMap[activeTab]} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 