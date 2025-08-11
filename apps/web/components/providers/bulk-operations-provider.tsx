'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useBulkOperationsModal } from '@/lib/hooks/use-bulk-operations-modal';
import { BulkOperationResponse } from '@/lib/apis/shipment';
import { useModalStore } from '@/modal/modal-store';

export type BulkOperationType = 'create-shipment' | 'schedule-pickup' | 'cancel-shipment' | 'edit-order';

interface BulkOperationsContextType {
  openBulkOperation: (type: BulkOperationType, rows?: any[]) => void;
  closeBulkOperation: () => void;
}

const BulkOperationsContext = createContext<BulkOperationsContextType | undefined>(undefined);

interface BulkOperationsProviderProps {
  children: ReactNode;
  onOperationComplete?: (result: BulkOperationResponse) => void;
}

/**
 * Provider component for bulk operations modal
 */
export function BulkOperationsProvider({ children, onOperationComplete }: BulkOperationsProviderProps) {
  const {
    operationType,
    selectedRows,
    openModal: openBulkModal,
    closeModal: closeBulkModal,
    onOperationComplete: handleOperationComplete,
  } = useBulkOperationsModal(onOperationComplete);

  const openModal = useModalStore((state) => state.openModal);

  const openBulkOperation = (type: BulkOperationType, rows?: any[]) => {
    openModal('bulk-orders-operations', {
      operationType: type,
      selectedRows: rows,
      onOperationComplete: handleOperationComplete,
      className: 'max-w-2xl',
    });
  };

  const closeBulkOperation = () => {
    closeBulkModal();
  };

  return (
    <BulkOperationsContext.Provider
      value={{
        openBulkOperation,
        closeBulkOperation,
      }}
    >
      {children}
    </BulkOperationsContext.Provider>
  );
}

/**
 * Hook to use the bulk operations context
 */
export function useBulkOperations() {
  const context = useContext(BulkOperationsContext);

  if (context === undefined) {
    throw new Error('useBulkOperations must be used within a BulkOperationsProvider');
  }

  return context;
}
