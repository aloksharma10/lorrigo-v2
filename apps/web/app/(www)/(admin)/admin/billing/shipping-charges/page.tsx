'use client';

import { useState } from 'react';
import { RefreshCw, Upload, Calendar } from 'lucide-react';
import {
  Badge,
  Button,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@lorrigo/ui/components';
import { useBillingOperations } from '@/lib/apis/billing';
import {
  CSVUploadModal,
  type CSVField,
  type HeaderMapping,
  type CSVUploadResult,
} from '@/components/modals/csv-upload-modal';
import { AdminBillingSummaryTable } from '@/components/tables/billing/admin-billing-summary-table';
import { AdminBillingDetailTable } from '@/components/tables/billing/admin-billing-detail-table';
import { Calculator, Users, TrendingUp, DollarSign } from 'lucide-react';
import { currencyFormatter } from '@lorrigo/utils';
import { useModalStore } from '@/modal/modal-store';

export default function AdminBillingShippingChargesPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [expandedSection, setExpandedSection] = useState<string>('summary');

  // Use the new billing operations hook
  const { getAvailableBillingMonthsQuery, getBillingSummaryByMonthQuery, uploadBillingCSV } =
    useBillingOperations();

  // API hooks using the new pattern
  const { data: availableMonths, isLoading: monthsLoading } = getAvailableBillingMonthsQuery();
  const {
    data: billingSummary,
    isLoading: summaryLoading,
    refetch,
  } = getBillingSummaryByMonthQuery(selectedMonth);

  // Set default month if not selected
  if (!selectedMonth && availableMonths && availableMonths.length > 0) {
    setSelectedMonth(availableMonths[0] || '');
  }

  // CSV upload configuration
  const csvFields: CSVField[] = [
    {
      key: 'awb',
      label: 'AWB Number',
      required: true,
      description: 'Airway Bill Number',
      type: 'string',
    },
    {
      key: 'weight',
      label: 'Weight (kg)',
      required: true,
      description: 'Package weight in kilograms',
      type: 'number',
      validation: (value: string) => {
        const weight = parseFloat(value);
        if (isNaN(weight) || weight <= 0) {
          return 'Weight must be a positive number';
        }
        return null;
      },
    },
  ];

  const handleCSVUpload = async (file: File, mapping: HeaderMapping): Promise<CSVUploadResult> => {
    try {
      const result = await uploadBillingCSV.mutateAsync(file);

      if (result.success) {
        // Refresh the billing summary after successful upload
        setTimeout(() => {
          refetch();
        }, 2000);

        return {
          success: true,
          processedRows: result.totalRecords,
          summary: {
            total: result.totalRecords,
            successful: result.processedCount,
            failed: result.errorCount,
            skipped: 0,
          },
        };
      } else {
        return {
          success: false,
          errors: [result.message || 'Upload failed'],
        };
      }
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message || 'Upload failed'],
      };
    }
  };

  const handleUserSelect = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setExpandedSection('user-details');
  };

  const { openModal } = useModalStore();

  // Summary cards
  const summaryCards = [
    {
      title: 'Total Users',
      value: billingSummary?.users?.length || 0,
      icon: Users,
      description: 'Users with billing records',
    },
    {
      title: 'Total Billing Amount',
      value: currencyFormatter(billingSummary?.total_amount || 0),
      icon: DollarSign,
      description: 'Total billing for the month',
    },
    {
      title: 'Total Orders',
      value: billingSummary?.total_orders || 0,
      icon: Calculator,
      description: 'Total billed orders',
    },
    {
      title: 'Average per User',
      value: billingSummary?.users?.length
        ? currencyFormatter((billingSummary.total_amount || 0) / billingSummary.users.length)
        : currencyFormatter(0),
      icon: TrendingUp,
      description: 'Average billing per user',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
          <p className="text-muted-foreground">
            Manage billing charges and view user billing summaries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Admin Portal
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="month-select" className="text-sm font-medium">
              Billing Month:
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths?.map((month) => (
                  <SelectItem key={month} value={month}>
                    {new Date(month + '-01').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <CSVUploadModal
            fields={csvFields}
            onSubmit={handleCSVUpload}
            title="Upload Billing CSV"
            description="Upload CSV file with AWB and Weight columns for billing calculation"
            buttonLabel="Upload Billing CSV"
            className="bg-primary text-primary-foreground gap-2"
            preferenceKey="billing"
            enableMappingPreferences={true}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => openModal('billing-cycle', {})}
          >
            <Calendar className="h-4 w-4" /> Manage Billing Cycles
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {(monthsLoading || summaryLoading) && (
        <Alert>
          <AlertDescription>Loading billing data...</AlertDescription>
        </Alert>
      )}

      {/* No Month Selected */}
      {!monthsLoading && !selectedMonth && (
        <Alert>
          <AlertDescription>
            No billing months available. Upload billing data to get started.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {selectedMonth && billingSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-muted-foreground text-xs">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Content */}
      {selectedMonth && (
        <Accordion
          type="single"
          value={expandedSection}
          onValueChange={setExpandedSection}
          className="w-full"
        >
          {/* Billing Summary */}
          <AccordionItem value="summary">
            <AccordionTrigger className="text-lg font-semibold">
              Billing Summary for{' '}
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
              })}{' '}
              ({new Date(selectedMonth + '-01').toLocaleDateString('en-US', { weekday: 'long' })})
              {billingSummary && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  ({billingSummary.total_orders} orders, ₹
                  {billingSummary.total_amount.toLocaleString()})
                </span>
              )}
            </AccordionTrigger>
            <AccordionContent>
              <AdminBillingSummaryTable month={selectedMonth} onUserSelect={handleUserSelect} />
            </AccordionContent>
          </AccordionItem>

          {/* User Details */}
          {selectedUserId && (
            <AccordionItem value="user-details">
              <AccordionTrigger className="text-lg font-semibold">
                User Billing Details: {selectedUserName}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUserId('');
                    setSelectedUserName('');
                    setExpandedSection('summary');
                  }}
                  className="ml-2"
                >
                  Close
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <AdminBillingDetailTable userId={selectedUserId} month={selectedMonth} />
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      )}
    </div>
  );
}
