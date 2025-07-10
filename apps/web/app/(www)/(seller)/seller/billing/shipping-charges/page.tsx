'use client';

import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Calendar, Calculator, Package, AlertCircle } from 'lucide-react';
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
import { UserBillingDetailTable } from '@/components/tables/billing/user-billing-detail-table';
import { currencyFormatter } from '@lorrigo/utils';

export default function SellerBillingShippingChargesPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Use the new billing operations hook
  const { getAvailableBillingMonthsQuery, getCurrentUserBillingQuery } = useBillingOperations();

  // API hooks using the new pattern
  const { data: availableMonths, isLoading: monthsLoading } = getAvailableBillingMonthsQuery();
  const {
    data: billingData,
    isLoading: billingLoading,
    refetch,
  } = getCurrentUserBillingQuery(selectedMonth);

  // Set default month if not selected
  useEffect(() => {
    if (!selectedMonth && availableMonths && availableMonths.length > 0 && availableMonths[0]) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Summary cards
  const summaryCards = useMemo(() => {
    if (!billingData) {
      return [
        {
          title: 'Total Orders',
          value: 0,
          icon: Package,
          description: 'Billing records for the month',
        },
        {
          title: 'Total Billing Amount',
          value: '₹0',
          icon: Calculator,
          description: 'Total charges for the month',
        },
        {
          title: 'Pending Payment',
          value: '₹0',
          icon: AlertCircle,
          description: 'Amount pending payment',
          textColor: 'text-orange-600',
        },
        {
          title: 'Paid Amount',
          value: '₹0',
          icon: Calculator,
          description: 'Amount already paid',
          textColor: 'text-green-600',
        },
      ];
    }

    return [
      {
        title: 'Total Orders',
        value: billingData.summary?.total_orders || 0,
        icon: Package,
        description: 'Billing records for the month',
      },
      {
        title: 'Total Billing Amount',
        value: currencyFormatter(billingData.summary?.total_billing_amount || 0),
        icon: Calculator,
        description: 'Total charges for the month',
      },
      {
        title: 'Pending Payment',
        value: currencyFormatter(billingData.summary?.pending_amount || 0),
        icon: AlertCircle,
        description: 'Amount pending payment',
        textColor: 'text-orange-600',
      },
      {
        title: 'Paid Amount',
        value: currencyFormatter(billingData.summary?.paid_amount || 0),
        icon: Calculator,
        description: 'Amount already paid',
        textColor: 'text-green-600',
      },
    ];
  }, [billingData]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping Charges</h1>
          <p className="text-muted-foreground">View your billing charges and payment status</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Seller Dashboard
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
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
      </div>

      {/* Loading State */}
      {(monthsLoading || billingLoading) && (
        <Alert>
          <AlertDescription>Loading billing data...</AlertDescription>
        </Alert>
      )}

      {/* No Month Selected */}
      {!monthsLoading && !selectedMonth && (
        <Alert>
          <AlertDescription>
            No billing data available. Billing records will appear here once they are processed.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {selectedMonth && billingData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.textColor || ''}`}>{card.value}</div>
                <p className="text-muted-foreground text-xs">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Billing Details */}
      {selectedMonth && (
        <Accordion type="single" defaultValue="billing-details" className="w-full">
          <AccordionItem value="billing-details">
            <AccordionTrigger className="text-lg font-semibold">
              Billing Details for{' '}
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
              })}{' '}
              ({new Date(selectedMonth + '-01').toLocaleDateString('en-US', { weekday: 'long' })})
              {billingData && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  ({billingData.summary?.total_orders || 0} orders)
                </span>
              )}
            </AccordionTrigger>
            <AccordionContent>
              <UserBillingDetailTable month={selectedMonth} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
