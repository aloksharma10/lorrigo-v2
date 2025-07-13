'use client';

import React, { useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Button,
  Modal,
  Alert,
  AlertDescription,
  AlertTitle,
  Progress,
  Input,
  Label,
} from '@lorrigo/ui/components';
import { useBillingOperations } from '@/lib/apis/billing';
import { useCSVUpload } from '../providers/csv-upload-provider';
import { CSVUploadModal, type CSVField } from './csv-upload-modal';

interface WeightDisputeCSVModalProps {
  modalId?: string;
  onClose?: () => void;
}

export function WeightDisputeCSVModal({ modalId, onClose }: WeightDisputeCSVModalProps) {
  const { uploadWeightDisputeCSV } = useBillingOperations();
  const csvUploadContext = useCSVUpload();

  if (!csvUploadContext) {
    throw new Error('WeightDisputeCSVModal must be used within a CSVUploadProvider');
  }

  const { showBulkOperationStatus } = csvUploadContext;
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define the fields for the CSV upload
  const weightDisputeFields: CSVField[] = [
    {
      key: 'AWB',
      label: 'AWB Number',
      required: true,
      description: 'The AWB number of the shipment',
    },
    {
      key: 'Charged_Weight',
      label: 'Charged Weight (kg)',
      required: true,
      description: 'The weight charged by the courier',
      type: 'number',
    },
    {
      key: 'evidence_url',
      label: 'Evidence URL',
      description: 'URL to evidence of the weight dispute (optional)',
    },
  ];

  const handleCSVUpload = async (file: File, mapping: Record<string, string>) => {
    try {
      setIsUploading(true);
      setError(null);

      // Call the API to upload the CSV
      const response = await uploadWeightDisputeCSV(file);

      if (response?.operationId) {
        // Show the bulk operation status modal
        showBulkOperationStatus(response.operationId, false);
      }

      return {
        success: true,
        operationId: response.operationId,
        data: [response],
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload CSV');
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Upload failed'],
      };
    } finally {
      setIsUploading(false);
    }
  };

  const handleError = (error: string) => {
    setError(error);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-semibold">Upload Weight Dispute CSV</h2>
          <p className="text-muted-foreground text-sm">
            Upload a CSV file with weight dispute data from couriers
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h3 className="font-medium">CSV Format Requirements</h3>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>File must be in CSV format</li>
            <li>Required columns: AWB Number, Charged Weight</li>
            <li>Optional columns: Evidence URL</li>
            <li>First row must contain column headers</li>
          </ul>
        </div>

        <CSVUploadModal
          fields={weightDisputeFields}
          onSubmit={handleCSVUpload}
          onError={handleError}
          title="Upload Weight Dispute CSV"
          description="Upload weight dispute data from couriers"
          buttonLabel="Upload Weight Dispute CSV"
          preferenceKey="weight_disputes"
          className="w-full"
        />
      </div>
    </div>
  );
} 