'use client';

import { useState } from 'react';
import { CSVUploadModal, type CSVField, type HeaderMapping, type CSVUploadResult } from '@/components/modals/csv-upload-modal';
import { BulkUploadStatusModal } from '@/components/modals/bulk-upload-status-modal';
import { useOrderOperations } from '@/lib/apis/order';
import { useCSVUpload } from '@/components/providers/csv-upload-provider';
import { toast } from '@lorrigo/ui/components';

// CSV field definitions for order upload
const orderCSVFields: CSVField[] = [
  // Order metadata
  { key: 'orderId', label: 'Order ID', required: true, description: 'Unique order identifier' },
  { key: 'orderChannel', label: 'Order Channel', description: 'Sales channel (e.g., CUSTOM, SHOPIFY)' },
  { key: 'orderType', label: 'Order Type', description: 'domestic or international' },
  { key: 'pickupAddressId', label: 'Pickup Address ID', required: true, description: 'Hub/pickup location ID' },
  
  // Customer details
  { key: 'customerName', label: 'Customer Name', required: true },
  { key: 'customerPhone', label: 'Customer Phone', required: true },
  { key: 'customerEmail', label: 'Customer Email' },
  
  // Delivery address
  { key: 'deliveryAddress', label: 'Delivery Address', required: true },
  { key: 'deliveryLandmark', label: 'Delivery Landmark' },
  { key: 'deliveryPincode', label: 'Delivery Pincode', required: true },
  { key: 'deliveryCity', label: 'Delivery City' },
  { key: 'deliveryState', label: 'Delivery State' },
  
  // Seller details
  { key: 'sellerName', label: 'Seller Name', required: true },
  { key: 'sellerGstNo', label: 'Seller GST Number' },
  { key: 'sellerContact', label: 'Seller Contact', required: true },
  { key: 'sellerAddress', label: 'Seller Address', required: true },
  { key: 'sellerPincode', label: 'Seller Pincode', required: true },
  
  // Product details
  { key: 'productName', label: 'Product Name', required: true },
  { key: 'productSku', label: 'Product SKU' },
  { key: 'productQuantity', label: 'Quantity', required: true },
  { key: 'productPrice', label: 'Product Price', required: true },
  { key: 'productTax', label: 'Tax Rate (%)' },
  { key: 'productHsn', label: 'HSN Code' },
  { key: 'taxableValue', label: 'Taxable Value', required: true },
  
  // Package details
  { key: 'packageWeight', label: 'Weight (kg)', required: true },
  { key: 'packageLength', label: 'Length (cm)', required: true },
  { key: 'packageBreadth', label: 'Breadth (cm)', required: true },
  { key: 'packageHeight', label: 'Height (cm)', required: true },
  
  // Payment and billing
  { key: 'paymentMethod', label: 'Payment Method', required: true, description: 'COD or PREPAID' },
  { key: 'amountToCollect', label: 'Amount to Collect' },
  
  // Invoice details
  { key: 'orderInvoiceNumber', label: 'Invoice Number' },
  { key: 'orderInvoiceDate', label: 'Invoice Date' },
  { key: 'ewaybill', label: 'E-waybill Number' },
];

export default function BulkOrderUploadPage() {
  const [operationId, setOperationId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  const { bulkOrderUploadMutation } = useOrderOperations();
  const { setOperationId: setCSVOperationId } = useCSVUpload();

  const handleCSVUpload = async (file: File, mapping: HeaderMapping): Promise<CSVUploadResult> => {
    try {
      // Read file content
      const csvContent = await file.text();
      
      // Validate file size and row count
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length > 100001) { // Including header
        throw new Error('CSV files cannot exceed 100,000 rows');
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB
        throw new Error('File size cannot exceed 50MB');
      }

      // Submit to backend
      const result = await bulkOrderUploadMutation.mutateAsync({
        file,
        mapping,
      });

      // Set operation ID in both local state and CSV provider
      if (result.operationId) {
        setOperationId(result.operationId);
        setCSVOperationId(result.operationId);
        setShowStatusModal(true);
      }

      return {
        success: true,
        processedRows: 0, // Will be updated via status modal
        // data: result || {},
      };
    } catch (error) {
      console.error('Upload error:', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Upload failed'],
      };
    }
  };

  const handleUploadComplete = (result: CSVUploadResult) => {
    if (result.success) {
      // Status modal is already shown, no need to do anything here
      console.log('Upload initiated successfully');
    } else {
      toast.error('Upload failed: ' + (result.errors?.[0] || 'Unknown error'));
    }
  };

  const handleUploadError = (error: string) => {
    toast.error(error);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bulk Order Upload</h1>
        <p className="text-muted-foreground">
          Upload a CSV file with order data to create multiple orders at once.
          You can upload up to 100,000 orders per file.
        </p>
      </div>

      <div className="bg-card p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Upload Instructions</h2>
        
        <div className="space-y-4 mb-6">
          <div>
            <h3 className="font-medium mb-2">File Requirements:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>CSV format only</li>
              <li>Maximum 100,000 rows (excluding header)</li>
              <li>Maximum file size: 50MB</li>
              <li>First row must contain column headers</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Required Fields:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {orderCSVFields
                .filter(field => field.required)
                .map(field => (
                  <div key={field.key} className="flex items-center space-x-2">
                    <span className="text-red-500">•</span>
                    <span>{field.label}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <CSVUploadModal
          fields={orderCSVFields}
          onSubmit={handleCSVUpload}
          onComplete={handleUploadComplete}
          onError={handleUploadError}
          title="Upload Order CSV"
          description="Upload your CSV file and map the columns to the required fields."
          buttonLabel="Upload Orders CSV"
          preferenceKey="bulk_orders"
          maxFileSize={50}
          acceptedFileTypes={['.csv']}
          className="w-full"
        />
      </div>

      {/* Status Modal */}
      {operationId && (
        <BulkUploadStatusModal
          operationId={operationId}
          isOpen={showStatusModal}
          onClose={() => {
            setOperationId(null);
            setShowStatusModal(false);
          }}
        />
      )}
    </div>
  );
}
