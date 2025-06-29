'use client';

import { useState } from 'react';
import { Button } from '@lorrigo/ui/components';
import { useCSVBulkOperationsContext } from '@/components/providers/csv-bulk-operations-provider';
import { CSVUploadResult } from '@/components/modals/csv-upload-modal';
import { CSVBulkOperationsProvider } from '@/components/providers/csv-bulk-operations-provider';

export default function ImportPage() {
  const [lastResult, setLastResult] = useState<CSVUploadResult | null>(null);

  const handleImportComplete = (result: CSVUploadResult) => {
    setLastResult(result);
  };

  return (
    <CSVBulkOperationsProvider onOperationComplete={handleImportComplete}>
      <ImportPageContent lastResult={lastResult} />
    </CSVBulkOperationsProvider>
  );
}

function ImportPageContent({ lastResult }: { lastResult: CSVUploadResult | null }) {
  const { openCSVBulkOperations } = useCSVBulkOperationsContext();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Data Import</h1>
        <p className="text-gray-600 mt-2">
          Import your data from CSV files to create orders and customers.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">CSV Import</h2>
          <p className="text-gray-600 mb-6">
            Upload CSV files to import orders, customers, and other data into your account.
            You can map columns from your CSV to our system fields.
          </p>
          <Button 
            onClick={openCSVBulkOperations}
            className="w-full"
          >
            Open CSV Import
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">API Integration</h2>
          <p className="text-gray-600 mb-6">
            Connect your e-commerce platform or other systems directly to our API for automated data import.
          </p>
          <Button variant="outline" className="w-full">
            View API Documentation
          </Button>
        </div>
      </div>

      {lastResult && (
        <div className="mt-8 rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Last Import Result</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Status:</span>{' '}
              {lastResult.success ? (
                <span className="text-green-500 font-medium">Success</span>
              ) : (
                <span className="text-red-500 font-medium">Failed</span>
              )}
            </p>
            {lastResult.processedRows && (
              <p>
                <span className="font-medium">Rows Processed:</span> {lastResult.processedRows}
              </p>
            )}
            {lastResult.errors && lastResult.errors.length > 0 && (
              <div>
                <p className="font-medium">Errors:</p>
                <ul className="list-disc pl-5 text-red-500">
                  {lastResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 