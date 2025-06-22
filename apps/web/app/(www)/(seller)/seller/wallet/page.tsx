'use client';

import { useWalletOperations } from '@/lib/apis/user';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { IndianRupee, Plus, ArrowDownCircle, ArrowUpCircle, History, Loader2 } from 'lucide-react';
import { useModalStore } from '@/modal/modal-store';
import { format } from 'date-fns';

export default function WalletPage() {
  const {
    getWalletBalance: { data: walletData, isLoading: isLoadingBalance },
    getTransactionHistory
  } = useWalletOperations();
  const { openModal } = useModalStore();

  // Get wallet balance
  const walletBalance = walletData?.balance || 0;

  // Get transaction history
  const { data: transactionData, isLoading: isLoadingTransactions } = getTransactionHistory({ page: 1, limit: 10 });
  const transactions = transactionData?.transactions || [];

  // Open recharge wallet modal
  const handleRechargeWallet = () => {
    openModal('recharge-wallet');
  };

  // Format transaction type
  const formatTransactionType = (type: string) => {
    return type === 'CREDIT' ? (
      <div className="flex items-center text-green-500">
        <ArrowDownCircle className="mr-1 h-4 w-4" />
        <span>Credit</span>
      </div>
    ) : (
      <div className="flex items-center text-red-500">
        <ArrowUpCircle className="mr-1 h-4 w-4" />
        <span>Debit</span>
      </div>
    );
  };

  // Format transaction status
  const formatTransactionStatus = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Completed</span>;
      case 'PENDING':
        return <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">Pending</span>;
      case 'FAILED':
        return <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">Failed</span>;
      case 'REFUNDED':
        return <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">Refunded</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Wallet</h1>
        <Button onClick={handleRechargeWallet}>
          <Plus className="mr-2 h-4 w-4" />
          Recharge Wallet
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex items-center">
                <IndianRupee className="mr-2 h-8 w-8 text-primary" />
                <span className="text-4xl font-bold">{walletBalance.toLocaleString('en-IN')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-gray-600">Total Credits</p>
                <div className="mt-2 flex items-center">
                  <IndianRupee className="mr-1 h-4 w-4 text-green-600" />
                  <span className="text-xl font-semibold text-green-600">
                    {isLoadingTransactions ? '...' : '0.00'}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-gray-600">Total Debits</p>
                <div className="mt-2 flex items-center">
                  <IndianRupee className="mr-1 h-4 w-4 text-red-600" />
                  <span className="text-xl font-semibold text-red-600">
                    {isLoadingTransactions ? '...' : '0.00'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions History */}
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No transactions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Transaction ID</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction: any) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(transaction.created_at), 'dd MMM yyyy, HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{transaction.code}</td>
                      <td className="px-4 py-3 text-sm">{formatTransactionType(transaction.type)}</td>
                      <td className="px-4 py-3 text-sm">{transaction.description}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">
                        <div className="flex items-center justify-end">
                          <IndianRupee className="mr-1 h-3 w-3" />
                          {transaction.amount.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {formatTransactionStatus(transaction.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 