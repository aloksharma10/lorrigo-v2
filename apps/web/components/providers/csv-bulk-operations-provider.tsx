'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useCSVBulkOperations } from '@/lib/hooks/use-csv-bulk-operations';
import CSVBulkOperationsModal from '@/components/modals/csv-bulk-operations-modal';
import { CSVUploadResult } from '@/components/modals/csv-upload-modal';

interface CSVBulkOperationsContextType {
  openCSVBulkOperations: () => void;
  closeCSVBulkOperations: () => void;
}

const CSVBulkOperationsContext = createContext<CSVBulkOperationsContextType | undefined>(undefined);

interface CSVBulkOperationsProviderProps {
  children: ReactNode;
  onOperationComplete?: (result: CSVUploadResult) => void;
}

/**
 * Provider component for CSV bulk operations modal
 */
export function CSVBulkOperationsProvider({
  children,
  onOperationComplete,
}: CSVBulkOperationsProviderProps) {
  const {
    isOpen,
    openModal,
    closeModal,
    onOperationComplete: handleOperationComplete,
  } = useCSVBulkOperations(onOperationComplete);

  return (
    <CSVBulkOperationsContext.Provider
      value={{
        openCSVBulkOperations: openModal,
        closeCSVBulkOperations: closeModal,
      }}
    >
      {children}
      <CSVBulkOperationsModal
        isOpen={isOpen}
        onClose={closeModal}
        onOperationComplete={handleOperationComplete}
      />
    </CSVBulkOperationsContext.Provider>
  );
}

/**
 * Hook to use the CSV bulk operations context
 */
export function useCSVBulkOperationsContext() {
  const context = useContext(CSVBulkOperationsContext);

  if (context === undefined) {
    throw new Error('useCSVBulkOperationsContext must be used within a CSVBulkOperationsProvider');
  }

  return context;
} 