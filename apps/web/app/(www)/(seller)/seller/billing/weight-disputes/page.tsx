'use client';

import { Button } from '@lorrigo/ui/components';
import { WeightDisputesTable } from '@/components/tables/billing/weight-disputes-table';
import { Upload } from 'lucide-react';
import { useModalStore } from '@/modal/modal-store';

export default function SellerWeightDisputesPage() {
  const { openModal } = useModalStore();

  const handleOpenUploadModal = () => {
    openModal('dispute-actions-csv');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weight Disputes</h1>
          <p className="text-muted-foreground">Review and resolve your shipment weight disputes.</p>
        </div>
        <Button onClick={handleOpenUploadModal} variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Actions
        </Button>
      </div>

      <WeightDisputesTable userRole="SELLER" />
    </div>
  );
} 