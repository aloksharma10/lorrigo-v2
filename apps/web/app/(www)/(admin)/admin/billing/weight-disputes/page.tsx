'use client';

import { Badge, Button } from '@lorrigo/ui/components';
import { WeightDisputesTable } from '@/components/tables/billing/weight-disputes-table';
import { Upload } from 'lucide-react';

export default function WeightDisputesPage() {
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

      {/* Controls */}
      <div className="flex justify-end">
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Dispute Report
        </Button>
      </div>

      {/* Weight Disputes Table */}
      <WeightDisputesTable />
    </div>
  );
} 