'use client';

import { useState } from 'react';
import { Button } from '@lorrigo/ui/components';
import { Progress } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import {
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  AlertCircle,
  Minus,
  X,
} from 'lucide-react';
import { useOrderOperations } from '@/lib/apis/order';
import { formatDistanceToNow } from 'date-fns';
import { useModalStore } from '@/modal/modal-store';
import { cn } from '@lorrigo/ui/lib/utils';

export function BulkUploadStatusModal() {
  const { bulkOrderUploadStatusQuery } = useOrderOperations();
  const { modals, closeModal } = useModalStore();
  const modal_props = modals.filter((modal) => modal.type === 'bulk-upload-status')[0];
  const { operationId: modalOperationId, isMinimized: initialMinimized = false, onClose, modalId } = modal_props?.props as {
    operationId: string;
    isMinimized: boolean;
    onClose: () => void;
    modalId: string;
  };
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  // Use the hook conditionally
  const statusQuery = bulkOrderUploadStatusQuery(modalOperationId || '');
  const { data: statusResponse, isLoading, error, refetch } = statusQuery;
  console.log(statusResponse);

  // Extract status data from response
  const status = statusResponse?.data;

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'PROCESSING':
        return <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'FAILED':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
      case 'PROCESSING':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800';
    }
  };

  const handleDownloadReport = async () => {
    if (modalOperationId && status?.report_path) {
      try {
        const downloadUrl = `/api/bulk-operations/${modalOperationId}/download?type=report`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `bulk_operation_${status.code || modalOperationId}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading report:', error);
      }
    }
  };

  const handleMinimize = () => {
    if (modalOperationId) {
      localStorage.setItem('csvUploadStatus', modalOperationId);
    }
    setIsMinimized(true);
  };

  const handleRestore = () => {
    setIsMinimized(false);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (modalId) {
      closeModal(modalId);
    }
    localStorage.removeItem('csvUploadStatus');
  };

  if (!modalOperationId) {
    return null;
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-4 max-w-sm transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(status?.status)}
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Upload Progress</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRestore}
                className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          </div>
          {status && (
            <div className="mt-3">
              <Progress value={statusResponse?.progress || 0} className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
                {statusResponse?.progress || 0}% complete
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="flex flex-col p-6 rounded-xl shadow-lg max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {getStatusIcon(status?.status)}
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bulk Upload Status</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMinimize}
            className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <Minus className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-3 text-sm font-medium text-gray-700">Loading status...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-semibold text-red-800">Error</span>
            </div>
            <p className="text-sm text-red-700 mt-2">
              {error instanceof Error ? error.message : 'Failed to load status'}
            </p>
          </div>
        )}

        {status && (
          <>
            {/* Status Badge and Operation ID */}
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={cn(
                  'text-sm font-semibold px-3 py-1 rounded-full',
                  getStatusColor(status.status)
                )}
              >
                {status.status}
              </Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Operation ID: {status.id}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                <span>Progress</span>
                <span>{statusResponse?.progress || 0}%</span>
              </div>
              <Progress
                value={statusResponse?.progress || 0}
                className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full"
              />
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow-sm">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Orders</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {status.total_count?.toLocaleString() || 0}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow-sm">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Processed</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {status.processed_count?.toLocaleString() || 0}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4 shadow-sm">
                <div className="text-sm font-medium text-green-700 dark:text-green-300">Successful</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {status.success_count?.toLocaleString() || 0}
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 shadow-sm">
                <div className="text-sm font-medium text-red-700 dark:text-red-300">Failed</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {status.failed_count?.toLocaleString() || 0}
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex justify-between">
                <span className="font-medium">Started:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDistanceToNow(new Date(statusResponse?.createdAt || status.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {status.completed_at && (
                <div className="flex justify-between">
                  <span className="font-medium">Completed:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatDistanceToNow(new Date(status.completed_at), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {(statusResponse?.errorMessage || status.error_message) && (
              <div className="bg-red-50 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-semibold text-red-800">Error Details</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {statusResponse?.errorMessage || status.error_message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {status.status === 'COMPLETED' && (statusResponse?.reportPath || status.report_path) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReport}
                  className="flex items-center gap-2 border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="flex items-center gap-2 border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="ml-auto border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}