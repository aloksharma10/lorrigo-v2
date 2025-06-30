'use client';

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { toast, Progress, Button } from '@lorrigo/ui/components';
import { X, RefreshCw } from 'lucide-react';
import type { CSVUploadResult, HeaderMapping } from '../modals/csv-upload-modal';
import { useOrderOperations } from '@/lib/apis/order';

export type CSVUploadStatus = {
  isUploading: boolean;
  progress: number;
  startTime?: number;
  minimized: boolean;
  file?: File | null;
  headerMapping?: HeaderMapping;
  step: 'upload' | 'mapping' | 'processing' | 'complete';
  result?: CSVUploadResult;
  shouldPersist?: boolean; // New flag to indicate if the upload should persist across routes
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
};

const CSVUploadContext = createContext<CSVUploadContextType>({
  uploadStatus: { isUploading: false, progress: 0, minimized: false, step: 'upload', shouldPersist: false, operationId: undefined },
  checkForExistingUpload: () => {},
  startUpload: () => {},
  updateProgress: () => {},
  completeUpload: () => {},
  cancelUpload: () => {},
  toggleMinimized: () => {},
  resetUpload: () => {},
  setOperationId: () => {},
  mappingPreferences: [],
  saveMappingPreference: () => {},
  updateMappingPreference: () => {},
  deleteMappingPreference: () => {},
  preferenceKey: 'csvMappingPreferences',
});

// Minimized CSV Upload component that stays visible across routes
export function MinimizedCSVUpload() {
  const { uploadStatus, toggleMinimized, cancelUpload, resetUpload } = useCSVUpload();
  const { bulkOrderUploadStatusQuery } = useOrderOperations();

  // Get real-time status from backend using a stable hook call
  const backendStatusQuery = bulkOrderUploadStatusQuery(uploadStatus.operationId || '');
  const backendStatus = backendStatusQuery.data?.data;
  const backendProgress = backendStatusQuery.data?.progress || 0;

  // Show minimized widget if it's minimized OR if there's a persisted upload in localStorage
  const shouldShow = uploadStatus.minimized || (uploadStatus.shouldPersist && uploadStatus.isUploading);

  if (!shouldShow) {
    return null;
  }

  const handleReopen = () => {
    // If the upload is complete, reset the progress
    if (uploadStatus.step === 'complete' || backendStatus?.status === 'COMPLETED') {
      resetUpload();
    } else {
      toggleMinimized();
    }
  };

  const handleClose = () => {
    // Explicitly close and cleanup
    cancelUpload();
  };

  // Determine progress display - use backend progress if available
  const displayProgress = backendStatus ? backendProgress : (uploadStatus.progress || 0);
  
  // Determine status text based on backend status or local status
  let statusText = 'Preparing upload...';
  if (backendStatus) {
    switch (backendStatus.status) {
      case 'PENDING':
        statusText = 'Queued for processing...';
        break;
      case 'PROCESSING':
        statusText = `Processing: ${Math.round(displayProgress)}%`;
        break;
      case 'COMPLETED':
        statusText = 'Complete!';
        break;
      case 'FAILED':
        statusText = 'Processing failed';
        break;
      default:
        statusText = `Processing: ${Math.round(displayProgress)}%`;
    }
  } else if (uploadStatus.step === 'complete') {
    statusText = 'Complete!';
  } else if (uploadStatus.step === 'processing') {
    statusText = `Processing: ${Math.round(displayProgress)}%`;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border bg-background p-4 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">CSV Upload</h3>
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleReopen}
            className="h-5 w-5"
            title="Restore window"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose}
            className="h-5 w-5"
            title="Close upload"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <Progress value={displayProgress} className="mb-2 h-2" />
      <p className="text-xs text-muted-foreground">
        {statusText}
      </p>
      {backendStatus && (
        <div className="mt-1 text-xs text-muted-foreground">
          {backendStatus.success_count > 0 && `✓ ${backendStatus.success_count} successful`}
          {backendStatus.failed_count > 0 && ` • ✗ ${backendStatus.failed_count} failed`}
        </div>
      )}
      {(uploadStatus.step === 'complete' || backendStatus?.status === 'COMPLETED') && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClose}
          className="mt-2 w-full"
        >
          Close
        </Button>
      )}
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
  const [uploadStatus, setUploadStatus] = useState<CSVUploadStatus>({
    isUploading: false,
    progress: 0,
    minimized: false,
    step: 'upload',
    shouldPersist: false,
    operationId: undefined,
  });

  const [mappingPreferences, setMappingPreferences] = useState<MappingPreference[]>([]);

  // Helper function to get all mapping preferences from localStorage
  const getAllMappingPreferences = (): MappingPreference[] => {
    const allPreferences: MappingPreference[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Only consider keys that contain 'MappingPreferences' in their name
      if (key && key.toLowerCase().includes('mappingpreferences')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            // Validate that it's an array of mapping preferences
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Check if the first item has the expected structure
              const first = parsed[0];
              if (first && typeof first === 'object' && 'name' in first && 'mapping' in first) {
                const preferencesWithKey = parsed.map((pref: MappingPreference) => ({
                  ...pref,
                  key: key
                }));
                allPreferences.push(...preferencesWithKey);
              }
            }
          }
        } catch (error) {
          console.error(`Error parsing preferences for key ${key}:`, error);
        }
      }
    }

    return allPreferences;
  };

  // Load mapping preferences
  useEffect(() => {
    try {
      setMappingPreferences(getAllMappingPreferences());
    } catch (error) {
      console.error('Error loading mapping preferences:', error);
    }
  }, [preferenceKey]);

  // Check for existing uploads in localStorage
  const checkForExistingUpload = () => {
    const savedUpload = localStorage.getItem('csvUploadStatus');
    if (savedUpload) {
      try {
        const status = JSON.parse(savedUpload);
        // Restore upload if it was minimized or in progress
        if (status.isUploading || status.minimized) {
          setUploadStatus({
            ...status,
            // File object can't be serialized, so it will be null here
            file: null,
            shouldPersist: true, // Mark as persistent when restored
          });
        }
      } catch (error) {
        console.error('Error parsing saved upload status:', error);
        localStorage.removeItem('csvUploadStatus');
      }
    }
  };

  // Save current upload status to localStorage
  useEffect(() => {
    if (uploadStatus.isUploading || uploadStatus.minimized || uploadStatus.shouldPersist) {
      const statusToSave = {
        ...uploadStatus,
        // Remove file object as it can't be serialized
        file: null,
      };
      localStorage.setItem('csvUploadStatus', JSON.stringify(statusToSave));
    } else if (uploadStatus.step === 'complete' && !uploadStatus.minimized) {
      // Only clean up localStorage when upload is complete AND not minimized
      localStorage.removeItem('csvUploadStatus');
    }
  }, [uploadStatus]);

  // Check for existing uploads on mount
  useEffect(() => {
    checkForExistingUpload();
  }, []);

  // Update the useEffect for progress simulation
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (uploadStatus.isUploading && uploadStatus.step === 'processing') {
      // Reset progress to 0 when starting a new upload
      if (uploadStatus.progress === 0) {
        setUploadStatus(prev => ({ ...prev, progress: 0 }));
      }
      
      interval = setInterval(() => {
        setUploadStatus((prev) => {
          // Don't update progress if we're already at 95% or higher
          if (prev.progress >= 95) {
            return prev;
          }
          
          const newProgress = prev.progress + (95 - prev.progress) * 0.1;
          return {
            ...prev,
            progress: Math.min(newProgress, 95),
          };
        });
      }, 1000);
    }

    // Clean up the interval when the component unmounts or when the upload is no longer in progress
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [uploadStatus.isUploading, uploadStatus.step, uploadStatus.progress]);

  // Start a new upload
  const startUpload = (file: File, headerMapping: HeaderMapping) => {
    setUploadStatus({
      isUploading: true,
      progress: 0,
      minimized: true, // Automatically minimize when upload starts
      step: 'processing',
      file,
      headerMapping,
      startTime: Date.now(),
      shouldPersist: true, // New uploads should persist across routes
    });
  };

  // Update progress manually
  const updateProgress = (progress: number) => {
    setUploadStatus((prev) => ({
      ...prev,
      progress,
    }));
  };

  // Update the completeUpload function to handle the final state better
  const completeUpload = (result: CSVUploadResult) => {
    setUploadStatus((prev) => ({
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
      preferenceKey
    }}>
      {children}
      <MinimizedCSVUpload />
    </CSVUploadContext.Provider>
  );
}

export const useCSVUpload = () => useContext(CSVUploadContext);
