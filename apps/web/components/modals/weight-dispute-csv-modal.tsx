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

      // Read the file content
      const fileContent = await file.text();
      const lines = fileContent.trim().split('\n');
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least one data row');
      }

      // Parse CSV headers and create formData
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Parse CSV data
      const csvData = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, any> = {};
        
        // Map values using the provided mapping
        for (const [fieldKey, headerName] of Object.entries(mapping)) {
          const headerIndex = headers.indexOf(headerName);
          if (headerIndex !== -1) {
            row[fieldKey] = values[headerIndex] || '';
          }
        }
        
        // Validate required fields
        if (!row.AWB || !row.Charged_Weight) {
          continue; // Skip invalid rows
        }
        
        // Convert numeric fields
        if (row.Charged_Weight) {
          row.Charged_Weight = parseFloat(row.Charged_Weight);
        }
        
        csvData.push(row);
      }

      // Create a FormData object
      const formData = new FormData();
      formData.append('file', file);

      // Call the API to upload the CSV
      const response = await fetch('/api/v2/bulk-operations/billing-weight-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Failed to upload CSV');
      }

      const result = await response.json();

      if (result?.operationId) {
        // Show the bulk operation status modal
        showBulkOperationStatus(result.operationId, false);
      }

      return {
        success: true,
        processedRows: csvData.length,
        data: result,
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