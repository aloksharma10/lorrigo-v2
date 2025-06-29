'use client';

import { useState, useCallback } from 'react';
import { CSVUploadResult } from '@/components/modals/csv-upload-modal';

interface UseCSVBulkOperationsReturn {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  onOperationComplete: (result: CSVUploadResult) => void;
}

/**
 * Custom hook to manage the CSV bulk operations modal state
 * @param onComplete Optional callback to be called when an operation completes
 * @returns Modal state and control functions
 */
export function useCSVBulkOperations(
  onComplete?: (result: CSVUploadResult) => void
): UseCSVBulkOperationsReturn {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const onOperationComplete = useCallback(
    (result: CSVUploadResult) => {
      onComplete?.(result);
    },
    [onComplete]
  );

  return {
    isOpen,
    openModal,
    closeModal,
    onOperationComplete,
  };
} 