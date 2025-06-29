'use client';

import { useMutation } from '@tanstack/react-query';
import { CSVField, CSVUploadModal, CSVUploadResult } from '@/components/modals/csv-upload-modal';
import { HeaderMapping } from '@/components/modals/csv-upload-modal';

export default function BulkOrderPage() {
  const customerFields: CSVField[] = [
    { key: 'email', label: 'Email Address', required: true, description: 'Customer email (must be unique)' },
    { key: 'first_name', label: 'First Name', required: true },
    { key: 'last_name', label: 'Last Name', required: true },
    { key: 'phone', label: 'Phone Number', required: false },
  ];

  const validateCustomerFile = async (file: File): Promise<string | null> => {
    // Custom validation logic
    const text = await file.text();
    const lines = text.split('\n');

    if (lines.length > 1000) {
      return 'Customer files cannot exceed 1000 rows';
    }

    return null;
  };

  // Using React Query for the upload process
  const uploadMutation = useMutation({
    mutationFn: async ({ file, mapping }: { file: File; mapping: HeaderMapping }) => {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // In a real app, you would send the file and mapping to your API
      // const formData = new FormData();
      // formData.append('file', file);
      // formData.append('mapping', JSON.stringify(mapping));
      // const response = await fetch('/api/customers/import', {
      //   method: 'POST',
      //   body: formData,
      // });
      // const data = await response.json();
      // return data;
      
      // For demo, return a successful result
      return { success: true, processedRows: 100 };
    }
  });

  const handleCustomerUpload = async (file: File, mapping: HeaderMapping): Promise<CSVUploadResult> => {
    try {
      const result = await uploadMutation.mutateAsync({ file, mapping });
      return result;
    } catch (error) {
      console.error('Upload failed:', error);
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
      };
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Bulk Order Import</h1>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Import Customer Data</h2>
        <p className="text-gray-600 mb-6">
          Upload your customer data in CSV format to create multiple orders at once.
          The system will validate and process your data.
        </p>
        <CSVUploadModal
          fields={customerFields}
          onSubmit={handleCustomerUpload}
          validateFile={validateCustomerFile}
          title="Import Customers"
          description="Upload customer data from your existing system."
          buttonLabel="Import Customers"
          acceptedFileTypes={['.csv', '.txt']}
          maxFileSize={2}
          enableMappingPreferences={true}
          preferenceKey="customerMappingPreferences"
          className="w-full"
          showMinimize={true}
        />
      </div>
    </div>
  );
}
