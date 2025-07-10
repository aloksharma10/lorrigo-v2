'use client';

import { WeightDisputesTable } from '@/components/tables/billing/weight-disputes-table';

export default function SellerWeightDisputesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Weight Disputes</h1>
        <p className="text-muted-foreground">Review and resolve your shipment weight disputes.</p>
      </div>

      <WeightDisputesTable />
    </div>
  );
} 