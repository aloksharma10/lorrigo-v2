'use client';

import { useState, useCallback } from 'react';
import { BulkOperationResponse } from '../apis/shipment';
import { BulkOperationType } from '@/components/providers/bulk-operations-provider';

interface UseBulkOperationsModalReturn {
  isOpen: boolean;
  operationType: BulkOperationType;
  selectedRows: any[];
  openModal: (type: BulkOperationType, rows?: any[]) => void;
  closeModal: () => void;
  onOperationComplete: (result: BulkOperationResponse) => void;
}

/**
 * Custom hook to manage the bulk operations modal state
 * @param onComplete Optional callback to be called when an operation completes
 * @returns Modal state and control functions
 */
export function useBulkOperationsModal(onComplete?: (result: BulkOperationResponse) => void): UseBulkOperationsModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [operationType, setOperationType] = useState<BulkOperationType>('create-shipment');
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const openModal = useCallback((type: BulkOperationType, rows: any[] = []) => {
    setOperationType(type);
    setSelectedRows(rows);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const onOperationComplete = useCallback(
    (result: BulkOperationResponse) => {
      onComplete?.(result);
    },
    [onComplete]
  );

  return {
    isOpen,
    operationType,
    selectedRows,
    openModal,
    closeModal,
    onOperationComplete,
  };
}
