'use client';

import { useState } from 'react';
import { RefreshCw, Upload, Calendar } from 'lucide-react';
import {
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
import { AdminBillingSummaryTable } from '@/components/tables/billing/admin-billing-summary-table';
import { AdminBillingDetailTable } from '@/components/tables/billing/admin-billing-detail-table';
import { Calculator, Users, TrendingUp, DollarSign } from 'lucide-react';
import { currencyFormatter } from '@lorrigo/utils';
import { useModalStore } from '@/modal/modal-store';
import { useAuthToken } from './providers/token-provider';

export default function BillingCharges() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [expandedSection, setExpandedSection] = useState<string>('summary');
  const {isAdmin} =useAuthToken()

  // Use the billing operations hook
  const { billingCyclesQuery, getBillingSummaryByMonthQuery, uploadWeightDisputeCSV } = useBillingOperations({
    billingCycles: {
      page: 1,
      pageSize: 100,
    },
  });

  // API hooks using the new pattern
  const { data: billingCycles, isLoading: cyclesLoading } = billingCyclesQuery;

  // Get unique billing months from cycles
  const availableMonths = billingCycles?.data
    ? [...new Set(billingCycles.data.map((cycle) => new Date(cycle.cycle_start_date).toISOString().slice(0, 7)))]
    : [];

  // Default to current month if no months available
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Get billing summary for selected month
  const { data: billingSummary, isLoading: summaryLoading, refetch } = getBillingSummaryByMonthQuery(selectedMonth || currentMonth);

  // Set default month if not selected
  if (!selectedMonth && availableMonths.length > 0) {
    // Ensure we have a string value
    const defaultMonth = availableMonths[0];
    if (defaultMonth) {
      setSelectedMonth(defaultMonth);
    } else {
      setSelectedMonth(currentMonth);
    }
  }

  const handleUserSelect = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setExpandedSection('user-details');
  };

  const { openModal } = useModalStore();

  const handleOpenCSVModal = () => {
    openModal('weight-dispute-csv');
  };

  const handleOpenBillingCycleModal = () => {
    openModal('billing-cycle', { className: 'max-w-4xl' });
  };

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
      value: billingSummary?.users?.length ? currencyFormatter((billingSummary.total_amount || 0) / billingSummary.users.length) : currencyFormatter(0),
      icon: TrendingUp,
      description: 'Average billing per user',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
        <p className="text-muted-foreground">Manage billing charges and view user billing summaries</p>
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
                {availableMonths.map((month, i) => (
                  <SelectItem key={i} value={month}>
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

        {isAdmin && <div className="flex items-center gap-2">
          <Button variant="default" size="sm" className="gap-2" onClick={handleOpenCSVModal}>
            <Upload className="h-4 w-4" /> Upload Billing CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenBillingCycleModal}>
            <Calendar className="h-4 w-4" /> Manage Billing Cycles
          </Button>
        </div>}
      </div>

      {/* Loading State */}
      {(cyclesLoading || summaryLoading) && (
        <Alert>
          <AlertDescription>Loading billing data...</AlertDescription>
        </Alert>
      )}

      {/* No Month Selected */}
      {!cyclesLoading && !selectedMonth && (
        <Alert>
          <AlertDescription>No billing months available. Upload billing data to get started.</AlertDescription>
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
        <Accordion type="single" value={expandedSection} onValueChange={setExpandedSection} className="w-full">
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
                  ({billingSummary.total_orders} orders, {currencyFormatter(billingSummary.total_amount)})
                </span>
              )}
            </AccordionTrigger>
            <AccordionContent>
              <AdminBillingSummaryTable
                month={selectedMonth}
                onUserSelect={handleUserSelect}
                onManualBilling={(userId, userName) => {
                  // Use billing-cycle modal with manual billing option for now
                  openModal('billing-cycle', { userId, userName, className: 'max-w-4xl' });
                }}
                onBillingCycle={(userId, userName) => {
                  openModal('billing-cycle', { userId, userName, className: 'max-w-4xl' });
                }}
              />
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
