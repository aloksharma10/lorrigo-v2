'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { Button, Input, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@lorrigo/ui/components';
import { useBillingOperations, WalletBalance } from '@/lib/apis/billing';
import { Search, Wallet, TrendingUp, AlertTriangle, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { currencyFormatter } from '@lorrigo/utils/functions';

export default function SellerTransactionHistoryPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { walletBalanceQuery } = useBillingOperations();
  const { billingHistoryQuery } = useBillingOperations({
    page: currentPage,
    limit: pageSize,
  });
  const { disputesQuery } = useBillingOperations({ status: 'PENDING' });

  const billingHistory = billingHistoryQuery?.data?.data || [];
  const pagination = billingHistoryQuery?.data?.pagination;
  const wallet = walletBalanceQuery?.data?.wallet;
  const pendingDisputes = disputesQuery?.data?.data || [];

  const filteredHistory = billingHistory.filter((billing) => {
    if (statusFilter !== 'all' && billing.payment_status !== statusFilter) return false;
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    return (
      billing.code.toLowerCase().includes(searchLower) ||
      billing.awb?.toLowerCase().includes(searchLower) ||
      billing.order?.code.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground">
            View your billing history, wallet balance, and transaction details
          </p>
        </div>
      </div>

      {/* Wallet & Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currencyFormatter(wallet?.balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hold Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {currencyFormatter(wallet?.hold_amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Disputed amounts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usable Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyFormatter(wallet?.usable_amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Current available</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Disputes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {pendingDisputes.length}
            </div>
            <p className="text-xs text-muted-foreground">Require action</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View all your billing transactions and payment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by billing code, AWB, or order..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transaction List */}
          <div className="space-y-4">
            {billingHistoryQuery?.isLoading ? (
              <div className="text-center py-8">Loading transactions...</div>
            ) : filteredHistory.length > 0 ? (
              filteredHistory.map((billing) => (
                <div
                  key={billing.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {billing.code}
                        </span>
                        <Badge
                          variant={
                            billing.payment_status === 'PAID'
                              ? 'default'
                              : billing.payment_status === 'PENDING'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {billing.payment_status}
                        </Badge>
                        {billing.has_weight_dispute && (
                          <Badge variant="outline" className="text-orange-600">
                            Disputed
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <div>Order: {billing.order?.code}</div>
                        {billing.awb && <div>AWB: {billing.awb}</div>}
                        <div>
                          Billing Date: {format(new Date(billing.billing_date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div>Weight: {billing.charged_weight}kg</div>
                        <div>Zone: {billing.order_zone}</div>
                        <div>Courier: {billing.courier_name}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {currencyFormatter(billing.billing_amount)}
                        </div>
                        {billing.has_weight_dispute && (
                          <div className="text-sm text-orange-600">
                            Excess: {currencyFormatter(billing.fw_excess_charge + billing.rto_excess_charge)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Invoice
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Breakdown */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Forward Charge</div>
                        <div className="font-medium">{currencyFormatter(billing.fw_charge)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">RTO Charge</div>
                        <div className="font-medium">{currencyFormatter(billing.rto_charge)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">COD Charge</div>
                        <div className="font-medium">{currencyFormatter(billing.cod_charge)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Zone Change</div>
                        <div className="font-medium">{currencyFormatter(billing.zone_change_charge)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, pagination.total)} of{' '}
                {pagination.total} transactions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 