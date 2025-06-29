'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useBulkOperationsModal } from '@/lib/hooks/use-bulk-operations-modal';
import BulkOperationsModal from '@/components/modals/bulk-operations-modal';
import { BulkOperationResponse } from '@/lib/apis/shipment';

type BulkOperationType = 'create-shipment' | 'schedule-pickup' | 'cancel-shipment';

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
export function BulkOperationsProvider({
  children,
  onOperationComplete,
}: BulkOperationsProviderProps) {
  const {
    isOpen,
    operationType,
    selectedRows,
    openModal,
    closeModal,
    onOperationComplete: handleOperationComplete,
  } = useBulkOperationsModal(onOperationComplete);

  return (
    <BulkOperationsContext.Provider
      value={{
        openBulkOperation: openModal,
        closeBulkOperation: closeModal,
      }}
    >
      {children}
      <BulkOperationsModal
        // isOpen={isOpen}
        // onClose={closeModal}
        // selectedRows={selectedRows}
        // operationType={operationType}
        // onOperationComplete={handleOperationComplete}
      />
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
