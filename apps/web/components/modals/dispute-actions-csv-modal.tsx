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

interface DisputeActionsCSVModalProps {
  modalId?: string;
  onClose?: () => void;
}

export function DisputeActionsCSVModal({ modalId, onClose }: DisputeActionsCSVModalProps) {
  const { uploadDisputeActionsCSV } = useBillingOperations();
  const csvUploadContext = useCSVUpload();

  if (!csvUploadContext) {
    throw new Error('DisputeActionsCSVModal must be used within a CSVUploadProvider');
  }

  const { showBulkOperationStatus } = csvUploadContext;
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define the fields for the CSV upload
  const disputeActionsFields: CSVField[] = [
    {
      key: 'AWB',
      label: 'AWB Number',
      required: true,
      description: 'The AWB number of the shipment',
    },
    {
      key: 'Action',
      label: 'Action',
      required: true,
      description: 'The action to take (ACCEPT, REJECT, or RAISE)',
    },
    {
      key: 'final_weight',
      label: 'Final Weight (kg)',
      description: 'The final weight to set (required for ACCEPT action)',
      type: 'number',
    },
    {
      key: 'comment',
      label: 'Comment',
      description: 'Comment or reason for the action',
    },
  ];

  const handleCSVUpload = async (file: File, mapping: Record<string, string>) => {
    try {
      setIsUploading(true);
      setError(null);

      // Create a FormData object
      const formData = new FormData();
      formData.append('file', file);

      // Call the API to upload the CSV
      const response = await uploadDisputeActionsCSV.mutateAsync(formData);

      if (response?.operationId) {
        // Show the bulk operation status modal
        showBulkOperationStatus(response.operationId, false);
      }

      return {
        success: true,
        processedRows: 1,
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
          <h2 className="text-xl font-semibold">Upload Dispute Actions CSV</h2>
          <p className="text-muted-foreground text-sm">
            Bulk process weight dispute actions with a CSV file
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
            <li>Required columns: AWB Number, Action (ACCEPT, REJECT, or RAISE)</li>
            <li>Optional columns: Final Weight (kg), Comment</li>
            <li>First row must contain column headers</li>
          </ul>
        </div>

        <CSVUploadModal
          fields={disputeActionsFields}
          onSubmit={handleCSVUpload}
          onError={handleError}
          title="Upload Dispute Actions CSV"
          description="Process multiple dispute actions at once"
          buttonLabel="Upload Actions CSV"
          preferenceKey="dispute_actions"
          className="w-full"
        />
      </div>
    </div>
  );
} 