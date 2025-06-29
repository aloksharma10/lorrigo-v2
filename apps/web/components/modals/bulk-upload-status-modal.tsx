'use client';

import { useState } from 'react';
import { Button } from '@lorrigo/ui/components';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@lorrigo/ui/components';
import { Progress } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  RefreshCw,
  AlertCircle 
} from 'lucide-react';
import { useBulkUploadStatus, useBulkUploadReport } from '@/lib/hooks/apis/use-bulk-order-upload';
import { formatDistanceToNow } from 'date-fns';

interface BulkUploadStatusModalProps {
  operationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BulkUploadStatusModal({ 
  operationId, 
  isOpen, 
  onClose 
}: BulkUploadStatusModalProps) {
  const { data: status, isLoading, error } = useBulkUploadStatus(operationId, isOpen);
  const downloadReport = useBulkUploadReport();

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PROCESSING':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDownloadReport = () => {
    if (operationId) {
      downloadReport.mutate(operationId);
    }
  };

  if (!operationId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(status?.status)}
            Bulk Upload Status
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-600">Loading status...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-red-800">Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                {error instanceof Error ? error.message : 'Failed to load status'}
              </p>
            </div>
          )}

          {status && (
            <>
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={getStatusColor(status.status)}
                >
                  {status.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  Operation ID: {status.id}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{status.progress}%</span>
                </div>
                <Progress value={status.progress} className="h-2" />
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900">Total Orders</div>
                  <div className="text-lg font-bold text-blue-600">
                    {status.totalCount.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900">Processed</div>
                  <div className="text-lg font-bold text-gray-900">
                    {status.processedCount.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="font-medium text-green-900">Successful</div>
                  <div className="text-lg font-bold text-green-600">
                    {status.successCount.toLocaleString()}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="font-medium text-red-900">Failed</div>
                  <div className="text-lg font-bold text-red-600">
                    {status.failedCount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Started:</span>
                  <span>
                    {formatDistanceToNow(new Date(status.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {status.completedAt && (
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span>
                      {formatDistanceToNow(new Date(status.completedAt), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {status.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-800">Error Details</span>
                  </div>
                  <p className="text-sm text-red-700">{status.errorMessage}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {status.status === 'COMPLETED' && status.reportPath && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReport}
                    disabled={downloadReport.isPending}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {downloadReport.isPending ? 'Downloading...' : 'Download Report'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="ml-auto"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 