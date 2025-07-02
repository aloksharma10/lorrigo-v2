'use client';

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from '@lorrigo/ui/components';
import type { CSVUploadResult, HeaderMapping } from '../modals/csv-upload-modal';
import { useOrderOperations } from '@/lib/apis/order';
import { useModalStore } from '@/modal/modal-store';

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
  openCSVUploadModal: () => {},
});

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
  const openModal = useModalStore((state) => state.openModal);

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

          // If we have an operation ID and it's minimized, show the status modal
          if (status.operationId && status.minimized) {
            openModal('bulk-upload-status', {
              operationId: status.operationId,
              isMinimized: true,
              onClose: () => {
                localStorage.removeItem('csvUploadStatus');
                setUploadStatus({
                  isUploading: false,
                  progress: 0,
                  minimized: false,
                  step: 'upload',
                  shouldPersist: false,
                  operationId: undefined,
                });
              }
            });
          }
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

  // Open CSV upload modal
  const openCSVUploadModal = () => {
    // openModal('bulk-orders-operations', {
    //   onOperationComplete: completeUpload,
    //   preferenceKey
    // });
  };

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
  
    if (operationId) {
      openModal('bulk-upload-status', {
        operationId,
        isMinimized: true,
        onClose: () => {
          localStorage.removeItem('csvUploadStatus');
          setUploadStatus({
            isUploading: false,
            progress: 0,
            minimized: false,
            step: 'upload',
            shouldPersist: false,
            operationId: undefined,
          });
        }
      });
    }
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
      openCSVUploadModal
    }}>
      {children}
    </CSVUploadContext.Provider>
  );
}

export const useCSVUpload = () => useContext(CSVUploadContext);
