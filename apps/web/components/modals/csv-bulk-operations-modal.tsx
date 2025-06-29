'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CSVField, CSVUploadModal, CSVUploadResult, HeaderMapping } from './csv-upload-modal';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@lorrigo/ui/components';

// Props interface
interface CSVBulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOperationComplete?: (result: any) => void;
}

export default function CSVBulkOperationsModal({
  isOpen,
  onClose,
  onOperationComplete
}: CSVBulkOperationsModalProps) {
  const [activeTab, setActiveTab] = useState<string>('orders');

  // Define fields for order import
  const orderFields: CSVField[] = [
    { key: 'order_id', label: 'Order ID', required: true, description: 'Unique identifier for the order' },
    { key: 'customer_name', label: 'Customer Name', required: true },
    { key: 'customer_email', label: 'Customer Email', required: true },
    { key: 'customer_phone', label: 'Customer Phone', required: false },
    { key: 'shipping_address', label: 'Shipping Address', required: true },
    { key: 'shipping_city', label: 'City', required: true },
    { key: 'shipping_state', label: 'State', required: true },
    { key: 'shipping_zip', label: 'ZIP/Postal Code', required: true },
    { key: 'product_sku', label: 'Product SKU', required: true },
    { key: 'quantity', label: 'Quantity', required: true },
    { key: 'price', label: 'Price', required: true },
  ];

  // Define fields for customer import
  const customerFields: CSVField[] = [
    { key: 'email', label: 'Email Address', required: true, description: 'Customer email (must be unique)' },
    { key: 'first_name', label: 'First Name', required: true },
    { key: 'last_name', label: 'Last Name', required: true },
    { key: 'phone', label: 'Phone Number', required: false },
    { key: 'company', label: 'Company', required: false },
    { key: 'address', label: 'Address', required: true },
    { key: 'city', label: 'City', required: true },
    { key: 'state', label: 'State', required: true },
    { key: 'postal_code', label: 'Postal Code', required: true },
    { key: 'country', label: 'Country', required: true },
  ];

  // Use React Query for the upload process
  const uploadMutation = useMutation({
    mutationFn: async ({ file, mapping, type }: { file: File; mapping: HeaderMapping; type: string }) => {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For demo, return a successful result
      return { 
        success: true, 
        processedRows: Math.floor(Math.random() * 100) + 50,
        type
      };
    }
  });

  const handleUpload = async (file: File, mapping: HeaderMapping, type: string): Promise<CSVUploadResult> => {
    try {
      const result = await uploadMutation.mutateAsync({ file, mapping, type });
      
      // Call the onOperationComplete callback if provided
      if (onOperationComplete) {
        onOperationComplete(result);
      }
      
      return result;
    } catch (error) {
      console.error('Upload failed:', error);
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
      };
    }
  };

  const handleOrderUpload = (file: File, mapping: HeaderMapping) => {
    return handleUpload(file, mapping, 'orders');
  };

  const handleCustomerUpload = (file: File, mapping: HeaderMapping) => {
    return handleUpload(file, mapping, 'customers');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>CSV Import</DialogTitle>
          <DialogDescription>
            Import data from CSV files to create orders and customers.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="orders" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Import Orders</TabsTrigger>
            <TabsTrigger value="customers">Import Customers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="orders" className="mt-4 space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file to create multiple orders at once.
              </p>
              
              <CSVUploadModal
                fields={orderFields}
                onSubmit={handleOrderUpload}
                title="Import Orders"
                description="Upload order data from your existing system."
                buttonLabel="Select CSV File"
                acceptedFileTypes={['.csv']}
                maxFileSize={5}
                enableMappingPreferences={true}
                preferenceKey="orderMappingPreferences"
                className="w-full"
                showMinimize={true}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="customers" className="mt-4 space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file to create multiple customers at once.
              </p>
              
              <CSVUploadModal
                fields={customerFields}
                onSubmit={handleCustomerUpload}
                title="Import Customers"
                description="Upload customer data from your existing system."
                buttonLabel="Select CSV File"
                acceptedFileTypes={['.csv']}
                maxFileSize={2}
                enableMappingPreferences={true}
                preferenceKey="customerMappingPreferences"
                className="w-full"
                showMinimize={true}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 