'use client';

import { useWalletOperations } from '@/lib/apis/wallet';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { IndianRupee, Plus, Loader2 } from 'lucide-react';
import { useModalStore } from '@/modal/modal-store';
import { TransactionHistoryTable } from '@/components/tables/billing/transaction-history-table';
import { currencyFormatter } from '@lorrigo/utils';

export default function WalletPage() {
  const {
    getWalletBalance: { data: walletData, isLoading: isLoadingBalance },
  } = useWalletOperations();
  const { openModal } = useModalStore();

  // Get wallet balance
  const walletBalance = walletData?.balance || 0;
  const holdAmount = walletData?.hold_amount || 0;
  const usableAmount = walletData?.usable_amount || 0;

  // Open recharge wallet modal
  const handleRechargeWallet = () => {
    openModal('recharge-wallet');
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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-4xl font-bold">{currencyFormatter(walletBalance)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usable Amount Card */}
        <Card>
          <CardHeader>
            <CardTitle>Usable Amount</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-4xl font-bold text-green-600">{currencyFormatter(usableAmount)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hold Amount Card */}
        <Card>
          <CardHeader>
            <CardTitle>Hold Amount</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-4xl font-bold text-yellow-600">{currencyFormatter(holdAmount)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions History */}
      <div className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">Transaction History</h2>
        <TransactionHistoryTable />
      </div>
    </div>
  );
}
