'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useModalStore } from '@/modal/modal-store';

import { X, Minus, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { Button, Progress, Badge, toast } from '@lorrigo/ui/components';
import { useOrderOperations } from '@/lib/apis/order';
import { useShippingOperations } from '@/lib/apis/shipment';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@lorrigo/ui/lib/utils';
import type { CSVUploadResult, HeaderMapping } from '../modals/csv-upload-modal';

export type CSVUploadStatus = {
  isUploading: boolean;
  progress: number;
  startTime?: number;
  minimized: boolean;
  file?: File | null;
  headerMapping?: HeaderMapping;
  step: 'upload' | 'mapping' | 'processing' | 'complete';
  result?: CSVUploadResult;
  shouldPersist?: boolean; // Flag to indicate if the upload should persist across routes
  operationId?: string; // Track the backend operation ID
};

export type MappingPreference = {
  name: string;
  mapping: HeaderMapping;
  key?: string; // The preference key this mapping belongs to
};

type CSVUploadContextType = {
  uploadStatus: CSVUploadStatus;
  checkForExistingUpload: () => void;
  startUpload: (file: File, headerMapping: HeaderMapping) => void;
  updateProgress: (progress: number) => void;
  completeUpload: (result: CSVUploadResult) => void;
  cancelUpload: () => void;
  toggleMinimized: () => void;
  resetUpload: () => void;
  setOperationId: (operationId: string) => void;
  mappingPreferences: MappingPreference[];
  saveMappingPreference: (name: string, mapping: HeaderMapping, key?: string) => void;
  updateMappingPreference: (oldName: string, newName: string, mapping: HeaderMapping, key?: string) => void;
  deleteMappingPreference: (name: string, key?: string) => void;
  preferenceKey: string;
  openCSVUploadModal: () => void;
  // Bulk upload status modal controls
  bulkUploadStatus: {
    isVisible: boolean;
    isMinimized: boolean;
    operationId?: string;
    operationType?: 'bulk-order-upload' | 'bulk-operation';
  };
  showBulkUploadStatus: (operationId: string, operationType?: 'bulk-order-upload' | 'bulk-operation', minimized?: boolean) => void;
  hideBulkUploadStatus: () => void;
  toggleBulkUploadMinimized: () => void;
  // Convenience functions for different operation types
  showBulkOperationStatus: (operationId: string, minimized?: boolean) => void;
  showBulkOrderUploadStatus: (operationId: string, minimized?: boolean) => void;
};

const CSVUploadContext = createContext<CSVUploadContextType | undefined>(undefined);

// Bulk Upload Status Modal Component - Embedded directly in provider
function BulkUploadStatusModal({ 
  operationId, 
  operationType,
  isMinimized, 
  onMinimize, 
  onRestore, 
  onClose 
}: {
  operationId: string;
  operationType?: 'bulk-order-upload' | 'bulk-operation';
  isMinimized: boolean;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
}) {
  const { bulkOrderUploadStatusQuery } = useOrderOperations();
  const { getBulkOperationStatus } = useShippingOperations();
  
  // Only use the appropriate status query based on operation type
  const orderStatusQuery = bulkOrderUploadStatusQuery(
    operationType === 'bulk-order-upload' ? operationId : ''
  );
  const shipmentStatusQuery = getBulkOperationStatus(
    operationType === 'bulk-operation' ? operationId : ''
  );
  
  // Choose the right query based on operation type
  const statusQuery = operationType === 'bulk-order-upload' ? orderStatusQuery : shipmentStatusQuery;
  const { data: statusResponse, isLoading, error, refetch } = statusQuery;

  // Extract status data from response
  const status = statusResponse?.data;
  const progress = statusResponse?.progress || 0;

  // Check if operation is done
  const isDone = React.useMemo(() => {
    if (!status) return false;
    
    return progress >= 100 || 
           status.status === 'COMPLETED' || 
           status.status === 'FAILED';
  }, [status, progress]);

  // Auto-close when operation is done (optional)
  React.useEffect(() => {
    if (isDone && !isMinimized) {
      // Auto close after 5 seconds when completed
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isDone, isMinimized, onClose]);

  const getOperationTitle = (type?: string) => {
    if (operationType === 'bulk-order-upload') {
      return 'Bulk Order Upload';
    }
    
    switch (type) {
      case 'CREATE_SHIPMENT':
        return 'Bulk Shipment Creation';
      case 'SCHEDULE_PICKUP':
        return 'Bulk Pickup Scheduling';
      case 'CANCEL_SHIPMENT':
        return 'Bulk Shipment Cancellation';
      case 'DOWNLOAD_LABELS':
        return 'Bulk Label Generation';
      case 'EDIT_PICKUP_ADDRESS':
        return 'Bulk Pickup Address Update';
      default:
        return 'Bulk Operation';
    }
  };

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
    if (operationId && (statusResponse?.reportPath || status?.report_path)) {
      try {
        const downloadUrl = `/api/bulk-operations/${operationId}/download?type=report`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `bulk_operation_${status?.code || operationId}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading report:', error);
      }
    }
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-4 max-w-sm transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(status?.status)}
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {getOperationTitle(status?.type)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onRestore}
                className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          </div>
          {status && (
            <div className="mt-3">
              <Progress value={progress} className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
                {progress}% complete
                {isDone && (
                  <span className="ml-2 text-green-600 dark:text-green-400">
                    ✓ {status.status}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - prevent closing on click */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Modal content */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {getStatusIcon(status?.status)}
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {getOperationTitle(status?.type)}
              </h2>
              {isDone && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-semibold px-2 py-1 rounded-full',
                    getStatusColor(status?.status)
                  )}
                >
                  {status?.status}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onMinimize}
                className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <Minus className="h-4 w-4 text-gray-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Loading status...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-semibold text-red-800 dark:text-red-200">Error</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                  {error instanceof Error ? error.message : 'Failed to load status'}
                </p>
              </div>
            )}

            {status && (
              <>
                {/* Operation ID */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Operation ID: {status.id}
                  </span>
                  {isDone && (
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Operation Complete
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress
                    value={progress}
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
                  {status.updated_at && isDone && (
                    <div className="flex justify-between">
                      <span className="font-medium">Completed:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatDistanceToNow(new Date(status.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {(statusResponse?.errorMessage || status.error_message) && (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-semibold text-red-800 dark:text-red-200">Error Details</span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {statusResponse?.errorMessage || status.error_message}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  {isDone && (statusResponse?.reportPath || status.report_path) && (
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
                  {!isDone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                      className="flex items-center gap-2 border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  )}
                  {isDone && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onClose}
                      className="flex items-center gap-2"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimized CSV Upload Component
function MinimizedCSVUpload({ uploadStatus, onRestore, onClose }: {
  uploadStatus: CSVUploadStatus;
  onRestore: () => void;
  onClose: () => void;
}) {
  if (!uploadStatus.isUploading || !uploadStatus.minimized) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-3 min-w-[280px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">CSV Upload</span>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onRestore}
              className="h-6 w-6"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Progress value={uploadStatus.progress} className="h-2" />
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {Math.round(uploadStatus.progress)}% complete
          </div>
        </div>
      </div>
    </div>
  );
}

export function CSVUploadProvider({ 
  children,
  preferenceKey = 'csvMappingPreferences'
}: { 
  children: React.ReactNode;
  preferenceKey?: string;
}) {
  const { openModal } = useModalStore();
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  const [uploadStatus, setUploadStatus] = useState<CSVUploadStatus>({
    isUploading: false,
    progress: 0,
    minimized: false,
    step: 'upload',
    shouldPersist: false,
  });

  const [bulkUploadStatus, setBulkUploadStatus] = useState({
    isVisible: false,
    isMinimized: false,
    operationId: undefined as string | undefined,
    operationType: 'bulk-operation' as 'bulk-order-upload' | 'bulk-operation',
  });

  const [mappingPreferences, setMappingPreferences] = useState<MappingPreference[]>([]);

  const getAllMappingPreferences = (): MappingPreference[] => {
    try {
      const allPreferences: MappingPreference[] = [];
      
      // Get all preference keys from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('mappingpreferences')) {
          try {
            const preferences = JSON.parse(localStorage.getItem(key) || '[]');
            const preferencesWithKey = preferences.map((pref: any) => ({
              ...pref,
              key: key
            }));
            allPreferences.push(...preferencesWithKey);
          } catch (error) {
            console.warn(`Failed to parse preferences for key: ${key}`, error);
          }
        }
      }
      
      return allPreferences;
    } catch (error) {
      console.error('Error getting mapping preferences:', error);
      return [];
    }
  };

  // Load mapping preferences on mount
  useEffect(() => {
    setMappingPreferences(getAllMappingPreferences());
  }, []);

  // Check for existing upload on mount
  useEffect(() => {
    checkForExistingUpload();
  }, []);

  const checkForExistingUpload = () => {
    try {
      const saved = localStorage.getItem('csvUploadStatus');
      if (saved) {
        const parsedStatus: CSVUploadStatus = JSON.parse(saved);
        
        // Only restore if it's not complete or if it should persist
        if (parsedStatus.shouldPersist || parsedStatus.step !== 'complete') {
          setUploadStatus(prev => ({
            ...prev,
            ...parsedStatus,
            file: null, // Don't restore file object
          }));

                  // If there's an operationId and it's processing, show the bulk upload status
        if (parsedStatus.operationId && parsedStatus.isUploading) {
          setBulkUploadStatus({
            isVisible: true,
            isMinimized: true,
            operationId: parsedStatus.operationId,
            operationType: 'bulk-order-upload',
          });
        }
        }
      }
    } catch (error) {
      console.error('Error loading saved upload status:', error);
      localStorage.removeItem('csvUploadStatus');
    }
  };

  // Open CSV upload modal
  const openCSVUploadModal = () => {
    // Check if upload is in progress and restore if minimized
    if (uploadStatus.isUploading && uploadStatus.minimized) {
      toggleMinimized();
      return;
    }
    
    // Otherwise open new upload modal
    // openModal('csv-upload', {});
  };

  // Start a new upload
  const startUpload = (file: File, headerMapping: HeaderMapping) => {
    setUploadStatus({
      isUploading: true,
      progress: 0,
      startTime: Date.now(),
      minimized: false,
      file,
      headerMapping,
      step: 'processing',
      shouldPersist: true,
    });

    // Start progress simulation
    let progress = 0;
    progressInterval.current = setInterval(() => {
      progress += Math.random() * 15;
      if (progress < 90) {
        updateProgress(progress);
      }
    }, 500);
  };

  // Update upload progress
  const updateProgress = (progress: number) => {
    setUploadStatus(prev => ({
      ...prev,
      progress: Math.min(progress, 100),
    }));
  };

  // Complete the upload
  const completeUpload = (result: CSVUploadResult) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    setUploadStatus(prev => ({
      ...prev,
      isUploading: false,
      progress: 100,
      step: 'complete',
      result,
    }));
    
    // If the modal is not minimized, clean up after a delay
    if (!uploadStatus.minimized) {
      setTimeout(() => {
        resetUpload();
      }, 3000);
    } else {
      // Update localStorage to reflect completion
      const statusToSave = {
        ...uploadStatus,
        isUploading: false,
        progress: 100,
        step: 'complete',
        result,
        file: null,
      };
      localStorage.setItem('csvUploadStatus', JSON.stringify(statusToSave));
    }
  };

  // Cancel the upload
  const cancelUpload = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    // Clean up localStorage when user explicitly cancels
    localStorage.removeItem('csvUploadStatus');
    setUploadStatus({
      isUploading: false,
      progress: 0,
      minimized: false,
      step: 'upload',
      shouldPersist: false,
      operationId: undefined,
    });
  };

  // Toggle minimized state
  const toggleMinimized = () => {
    setUploadStatus((prev) => {
      const newMinimized = !prev.minimized;
      
      // Save to localStorage when minimizing to ensure persistence
      if (newMinimized) {
        const statusToSave = {
          ...prev,
          minimized: newMinimized,
          shouldPersist: true,
          file: null, // Remove file object as it can't be serialized
        };
        localStorage.setItem('csvUploadStatus', JSON.stringify(statusToSave));
      }
      
      return {
        ...prev,
        minimized: newMinimized,
        shouldPersist: true, // Always persist when minimized
          };
        });
  };

  // Reset upload state
  const resetUpload = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    // Clean up localStorage when user explicitly resets
    localStorage.removeItem('csvUploadStatus');
    setUploadStatus({
      isUploading: false,
      progress: 0,
      minimized: false,
      step: 'upload',
      shouldPersist: false,
      operationId: undefined,
    });
  };

  // Save a new mapping preference
  const saveMappingPreference = (name: string, mapping: HeaderMapping, key?: string) => {
    try {
      const storageKey = key || preferenceKey;
      const newPreference = { name, mapping, key: storageKey };
      
      // Get current preferences for this key
      const currentPreferences = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedPreferences = [...currentPreferences.filter((p: MappingPreference) => p.name !== name), { name, mapping }];
      
      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedPreferences));
      
      // Refresh global state so all consumers update
      setMappingPreferences(getAllMappingPreferences());
      
      toast.success('Mapping preference saved!');
    } catch (error) {
      toast.error('Failed to save mapping preference');
      console.error('Error saving mapping preference:', error);
    }
  };

  // Update an existing mapping preference
  const updateMappingPreference = (oldName: string, newName: string, mapping: HeaderMapping, key?: string) => {
    try {
      const storageKey = key || preferenceKey;
      
      // Get current preferences for this key
      const currentPreferences = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedPreferences = currentPreferences.map((p: MappingPreference) => 
        p.name === oldName ? { name: newName, mapping } : p
      );
      
      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedPreferences));
      
      // Refresh global state so all consumers update
      setMappingPreferences(getAllMappingPreferences());
      
      toast.success('Mapping preference updated!');
    } catch (error) {
      toast.error('Failed to update mapping preference');
      console.error('Error updating mapping preference:', error);
    }
  };

  // Delete a mapping preference
  const deleteMappingPreference = (name: string, key?: string) => {
    try {
      const storageKey = key || preferenceKey;
      
      // Get current preferences for this key
      const currentPreferences = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedPreferences = currentPreferences.filter((p: MappingPreference) => p.name !== name);
      
      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedPreferences));
      
      // Refresh global state so all consumers update
      setMappingPreferences(getAllMappingPreferences());
      
      toast.success('Mapping preference deleted!');
    } catch (error) {
      toast.error('Failed to delete mapping preference');
      console.error('Error deleting mapping preference:', error);
    }
  };

  const setOperationId = (operationId: string) => {
    setUploadStatus((prev) => ({
      ...prev,
      operationId,
    }));
  
    if (operationId) {
      // Show bulk upload status modal immediately (minimized)
      showBulkOrderUploadStatus(operationId, true);
    }
  };

  // Bulk upload status modal controls
  const showBulkUploadStatus = (operationId: string, operationType: 'bulk-order-upload' | 'bulk-operation' = 'bulk-operation', minimized = false) => {
    setBulkUploadStatus({
      isVisible: true,
      isMinimized: minimized,
      operationId,
      operationType,
    });
  };

  const hideBulkUploadStatus = () => {
    setBulkUploadStatus({
      isVisible: false,
      isMinimized: false,
      operationId: undefined,
      operationType: 'bulk-operation',
    });
    
    // Clean up localStorage
    localStorage.removeItem('csvUploadStatus');
    setUploadStatus(prev => ({
      ...prev,
      operationId: undefined,
    }));
  };

  const toggleBulkUploadMinimized = () => {
    setBulkUploadStatus(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  };

  // Convenience functions for different operation types
  const showBulkOperationStatus = (operationId: string, minimized = false) => {
    showBulkUploadStatus(operationId, 'bulk-operation', minimized);
  };

  const showBulkOrderUploadStatus = (operationId: string, minimized = false) => {
    showBulkUploadStatus(operationId, 'bulk-order-upload', minimized);
  };

  return (
    <CSVUploadContext.Provider value={{ 
      uploadStatus, 
      checkForExistingUpload,
      startUpload,
      updateProgress,
      completeUpload,
      cancelUpload,
      toggleMinimized,
      resetUpload,
      setOperationId,
      mappingPreferences,
      saveMappingPreference,
      updateMappingPreference,
      deleteMappingPreference,
      preferenceKey,
      openCSVUploadModal,
      bulkUploadStatus,
      showBulkUploadStatus,
      hideBulkUploadStatus,
      toggleBulkUploadMinimized,
      showBulkOperationStatus,
      showBulkOrderUploadStatus,
    }}>
      {children}
      
      {/* Minimized CSV Upload */}
      <MinimizedCSVUpload
        uploadStatus={uploadStatus}
        onRestore={toggleMinimized}
        onClose={resetUpload}
      />
      
      {/* Bulk Upload Status Modal - Directly embedded */}
      {bulkUploadStatus.isVisible && bulkUploadStatus.operationId && (
        <BulkUploadStatusModal
          operationId={bulkUploadStatus.operationId}
          operationType={bulkUploadStatus.operationType}
          isMinimized={bulkUploadStatus.isMinimized}
          onMinimize={toggleBulkUploadMinimized}
          onRestore={toggleBulkUploadMinimized}
          onClose={hideBulkUploadStatus}
        />
      )}
    </CSVUploadContext.Provider>
  );
}

export const useCSVUpload = () => useContext(CSVUploadContext);
