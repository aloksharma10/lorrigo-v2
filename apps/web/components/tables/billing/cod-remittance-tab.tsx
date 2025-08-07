'use client';
import { Button, DataTable, Badge, DataTableColumnHeader } from '@lorrigo/ui/components';
import { Download, Settings, PlusCircleIcon, Wallet } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  useAdminRemittances,
  useSellerRemittances,
  exportAdminRemittances,
  exportSellerRemittances,
  useUserBankAccounts,
  useSelectUserBankAccount,
} from '@/lib/apis/remittance';
import { downloadBlob } from '@/lib/utils/downloadBlob';
import { useModalStore } from '@/modal/modal-store';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@lorrigo/ui/components';
import { useWalletOperations } from '@/lib/apis/wallet';
import { useSession } from 'next-auth/react';

export default function CODRemittanceTab() {
  const pathname = usePathname();
  const isAdmin = pathname.includes('admin');
  const openModal = useModalStore((state) => state.openModal);

  // Get wallet type for WALLET users - we'll check this from user profile
  const { getWalletBalance: { data: walletData } } = useWalletOperations();
  const { data: session } = useSession();
  // For now, we'll show the button for all users and let the backend validate
  // In a real implementation, you'd fetch user profile to check wallet_type
  const isWalletUser = true; // This will be validated on the backend

  // DataTable state (like ShipmentsTable)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const [filters, setFilters] = useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 10, 0),
  });

  // Modal state for Add Bank Account
  const { mutate: selectUserBankAccount } = useSelectUserBankAccount();

  // Handler for transferring to wallet
  const handleTransferToWallet = (remittance: any) => {
    openModal('transfer-remittance-to-wallet', {
      remittance: {
        id: remittance.id,
        code: remittance.code,
        amount: remittance.amount,
        status: remittance.status,
      },
    });
  };

  // Fetch remittance data
  const params = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    sort: sorting,
    filters,
    search: debouncedGlobalFilter,
    from: dateRange.from ? dateRange.from.toISOString().split('T')[0] : '',
    to: dateRange.to ? dateRange.to.toISOString().split('T')[0] : '',
  };
  const { data, isLoading, isError } = isAdmin ? useAdminRemittances(params) : useSellerRemittances(params);

  // Fetch user bank accounts (for sellers)
  const { data: bankAccountsData, isLoading: isBankLoading } = useUserBankAccounts();
  const bankAccounts = bankAccountsData?.data?.bankAccounts || bankAccountsData?.bankAccounts || [];

  // Handler for selecting a bank account
  const handleSelectBankAccount = async (bankAccountId: string, remittanceId: string) => {
    selectUserBankAccount({ bankAccountId, remittanceId });
  };

  // DataTable columns
  const columns = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }: any) => <DataTableColumnHeader column={column} title="Remittance ID" />,
        cell: ({ row }: any) => row.getValue('code'),
      },
      {
        accessorKey: 'remittance_date',
        header: ({ column }: any) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }: any) => new Date(row.getValue('remittance_date')).toLocaleDateString(),
      },
      {
        accessorKey: 'amount',
        header: ({ column }: any) => <DataTableColumnHeader column={column} title="Remittance Amount" />,
        cell: ({ row }: any) => `₹ ${row.getValue('amount')?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      },
      {
        accessorKey: 'early_remittance_charge_amount',
        header: ({ column }: any) => <DataTableColumnHeader column={column} title="Early COD Charges" />,
        cell: ({ row }: any) => `₹ ${row.getValue('early_remittance_charge_amount')?.toFixed(2)}`,
      },
      {
        accessorKey: 'wallet_transfer_amount',
        header: ({ column }: any) => <DataTableColumnHeader column={column} title="Wallet Transfer Amount" />,
        cell: ({ row }: any) => `₹ ${row.getValue('wallet_transfer_amount')?.toFixed(2)}`,
      },
      {
        accessorKey: 'status',
        header: ({ column }: any) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }: any) => (
          <Badge variant="outline" className={row.getValue('status') === 'COMPLETED' ? 'border-green-600 text-green-600' : 'border-blue-600 text-blue-600'}>
            {row.getValue('status')}
          </Badge>
        ),
      },
      {
        id: 'bank_account',
        header: 'Bank Account',
        cell: ({ row }: any) => {
          const remittance = row.original;
          const selectedBankId = remittance.bank_account_id;
          return (
            <Select value={selectedBankId || ''} onValueChange={(value) => handleSelectBankAccount(value, remittance.id)} disabled={isBankLoading}>
              <SelectTrigger disabled={isBankLoading || remittance.status !== 'PENDING' || isAdmin} className="border-none">
                <SelectValue placeholder="Select Bank Account" defaultValue={selectedBankId} />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((acc: any) => (
                  <SelectItem key={acc.id} value={acc.id} className="flex w-full items-center justify-between gap-2">
                    {acc.is_verified ? (
                      <Badge variant={'status_success'} className="ml-auto">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant={'status_warning'} className="ml-auto">
                        Unverified
                      </Badge>
                    )}
                    {acc.bank_name} ({acc.account_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        id: 'actions',
        header: 'Action',
        cell: ({ row }: any) => {
          const remittance = row.original;
          const canTransferToWallet = isWalletUser && 
            remittance.status === 'PENDING' && 
            !remittance.wallet_balance_before && 
            !remittance.wallet_balance_after;

          return (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  openModal('remittance-detail', { id: row.original.id });
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
              {canTransferToWallet && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTransferToWallet(remittance)}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  title="Transfer to Wallet"
                >
                  <Wallet className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [isAdmin, bankAccounts, isBankLoading]
  );

  // DataTable filterable/searchable columns
  const filterableColumns = [
    {
      id: 'status',
      title: 'Status',
      options: [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Completed', value: 'COMPLETED' },
        { label: 'Failed', value: 'FAILED' },
      ],
    },
  ];
  const searchableColumns = [
    { id: 'code', title: 'Remittance ID' },
    { id: 'name', title: 'Name' },
  ];

  // Export handler (unchanged)
  const handleExport = async (type: 'csv' | 'xlsx') => {
    const exportFn: (params: any) => Promise<import('axios').AxiosResponse<Blob>> = isAdmin ? exportAdminRemittances : exportSellerRemittances;
    const res = await exportFn({ ...params, type });
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : `remittances.${type}`;
    downloadBlob(res.data, filename);
  };

  // DataTable handlers
  const handlePaginationChange = ({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
    setPagination({ pageIndex, pageSize });
  };
  const handleSortingChange = (newSorting: any) => setSorting(newSorting);
  const handleFiltersChange = (newFilters: any) => setFilters(newFilters);
  const handleGlobalFilterChange = (newGlobalFilter: string) => setGlobalFilter(newGlobalFilter);
  const handleDateRangeChange = (newDateRange: { from: Date; to: Date }) => setDateRange(newDateRange);

  // Remittance data normalization
  const remittanceOrders = Array.isArray(data?.remittanceOrders) ? data.remittanceOrders : [];
  const paginationMeta = data?.pagination || { total: 0, page: 0, pages: 1 };

  return (
    <div className="space-y-6">
      {/* Export buttons */}
      <div className="mb-4 flex flex-col justify-between gap-2 lg:flex-row">
        <h1 className="text-2xl font-bold">Remittance Report</h1>
        <div className="flex gap-2">
          {!isAdmin && (
            <Button icon={PlusCircleIcon} onClick={() => openModal('add-bank-account')}>
              Add Bank Account
            </Button>
          )}
          <Button icon={Settings} onClick={() => openModal('manage-bank-accounts')}>
            Manage Bank Accounts
          </Button>
        </div>
      </div>
      {/* Data Table */}
      <DataTable
        columns={columns}
        showDownload={true}
        handleDownload={() => handleExport('xlsx')}
        data={remittanceOrders}
        count={paginationMeta.total}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        pageCount={paginationMeta.pages}
        filterableColumns={filterableColumns}
        searchableColumns={searchableColumns}
        searchPlaceholder="Search Remittance ID, Name, etc."
        isLoading={isLoading}
        isError={isError}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        onFiltersChange={handleFiltersChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        onDateRangeChange={handleDateRangeChange}
        defaultDateRange={dateRange}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
      />
    </div>
  );
}
