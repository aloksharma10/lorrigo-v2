'use client';

import {
  CSVUploadModal,
  type CSVField,
  type HeaderMapping,
  type CSVUploadResult,
} from '@/components/modals/csv-upload-modal';
import { useOrderOperations } from '@/lib/apis/order';
import { useCSVUpload } from '@/components/providers/csv-upload-provider';
import { toast } from '@lorrigo/ui/components';

// CSV field definitions for order upload
const orderCSVFields: CSVField[] = [
  // Order metadata
  { key: 'orderId', label: 'Order ID', required: true, description: 'Unique order identifier' },
  {
    key: 'orderChannel',
    label: 'Order Channel',
    description: 'Sales channel (e.g., CUSTOM, SHOPIFY)',
  },
  { key: 'orderType', label: 'Order Type', description: 'domestic or international' },
  {
    key: 'pickupAddressId',
    label: 'Pickup Address ID',
    required: true,
    description: 'Hub/pickup location ID',
  },

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
  // const { openModal } = useModal();
  const { bulkOrderUploadMutation } = useOrderOperations();
  const csvUploadContext = useCSVUpload();

  if (!csvUploadContext) {
    throw new Error('BulkOrderUploadPage must be used within a CSVUploadProvider');
  }

  const { setOperationId: setCSVOperationId } = csvUploadContext;

  const handleCSVUpload = async (file: File, mapping: HeaderMapping): Promise<CSVUploadResult> => {
    try {
      // Read file content
      const csvContent = await file.text();

      // Validate file size and row count
      const lines = csvContent.split('\n').filter((line) => line.trim());

      if (lines.length > 100001) {
        // Including header
        throw new Error('CSV files cannot exceed 100,000 rows');
      }

      if (file.size > 50 * 1024 * 1024) {
        // 50MB
        throw new Error('File size cannot exceed 50MB');
      }

      // Submit to backend
      const result = await bulkOrderUploadMutation.mutateAsync({
        file,
        mapping,
      });

      // Set operation ID in both local state and CSV provider
      if (result.operationId) {
        setCSVOperationId(result.operationId);
        // openModal('bulk-upload-status', {
        //   operationId: result.operationId,
        //   overlayClassName: 'backdrop-blur-none',
        //   isMinimized: false,
        //   onClose: () => {
        //     localStorage.removeItem('bulkUploadActive');
        //   },
        // });
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

  const handleUploadError = (error: string) => {
    toast.error(error);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Bulk Order Upload</h1>
        <p className="text-muted-foreground">
          Upload a CSV file with order data to create multiple orders at once. You can upload up to
          100,000 orders per file.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">Upload Instructions</h2>

        <div className="mb-6 space-y-4">
          <div>
            <h3 className="mb-2 font-medium">File Requirements:</h3>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>CSV format only</li>
              <li>Maximum 100,000 rows (excluding header)</li>
              <li>Maximum file size: 50MB</li>
              <li>First row must contain column headers</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-medium">Required Fields:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
              {orderCSVFields
                .filter((field) => field.required)
                .map((field) => (
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
    </div>
  );
}
