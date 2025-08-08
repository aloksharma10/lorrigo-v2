'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Checkbox,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  toast,
} from '@lorrigo/ui/components'; // Assuming these are shadcn/ui components
import { CreditCard, Plus, Edit, Trash2, CheckCircle, XCircle, Loader2, Eye, EyeOff, Building } from 'lucide-react';
import { DataTable, DataTableColumnHeader } from '@lorrigo/ui/components'; // Assuming these are shadcn/ui components
import type { ColumnDef } from '@lorrigo/ui/components'; // Assuming these are shadcn/ui components
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  type UserBankAccount,
  type BankAccountParams,
  useUserBankAccounts,
  useAddUserBankAccount,
  useUpdateUserBankAccount,
  useDeleteUserBankAccount,
} from '@/lib/apis/users';
import { CopyBtn } from '@/components/copy-btn';
import ActionTooltip from '@/components/action-tooltip';
import HoverCardToolTip from '@/components/hover-card-tooltip';
import { useModalStore } from '@/modal/modal-store';
import { useVerifyBankAccount } from '@/lib/apis/remittance';
// import { BankAccountFormDialog, type BankAccountFormData } from "@/components/bank-account" // Import the new component and type

interface BankAccountsManagerProps {
  userId: string;
}

export function BankAccountsManager({ userId }: BankAccountsManagerProps) {
  const [activeTab, setActiveTab] = React.useState('all');
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([]);
  const [filters, setFilters] = React.useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [editingAccount, setEditingAccount] = React.useState<UserBankAccount | null>(null);
  const [showAccountNumbers, setShowAccountNumbers] = React.useState(false);
  const [isBulkVerifying, setIsBulkVerifying] = React.useState(false);

  const addBankAccount = useAddUserBankAccount();
  const updateBankAccount = useUpdateUserBankAccount();
  const deleteBankAccount = useDeleteUserBankAccount();
  const { mutate: verifyBankAccount, isPending: isVerifying } = useVerifyBankAccount();

  // Fetch bank accounts with React Query
  const params: BankAccountParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    sort: sorting,
    filters,
    globalFilter: debouncedGlobalFilter,
    dateRange,
  };
  if (activeTab === 'verified') {
    params.is_verified = true;
  } else if (activeTab === 'unverified') {
    params.is_verified = false;
  } else if (activeTab === 'selected') {
    params.is_selected_for_remittance = true;
  }
  const { data, isLoading, isError, isFetching, error } = useUserBankAccounts(userId, params);
  const { openModal } = useModalStore();

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingAccount) {
        await updateBankAccount.mutateAsync({
          userId,
          bankAccountId: editingAccount.id,
          data,
        });
        toast.success('Bank account updated successfully');
        setEditingAccount(null); // Clear editing state
      } else {
        await addBankAccount.mutateAsync({
          userId,
          data,
        });
        toast.success('Bank account added successfully');
      }
    } catch (error) {
      toast.error('Failed to save bank account');
    }
  };

  const handleEdit = (account: UserBankAccount) => {
    setEditingAccount(account);
    openModal('add-bank-account', { onSubmit: handleFormSubmit, editingAccount });
  };

  const handleDelete = async (accountId: string) => {
    try {
      await deleteBankAccount.mutateAsync({ userId, bankAccountId: accountId });
      toast.success('Bank account deleted successfully');
    } catch (error) {
      toast.error('Failed to delete bank account');
    }
  };

  const handleVerify = async (account: UserBankAccount) => {
    try {
      verifyBankAccount({ bankAccountId: account.id, is_verified: !account.is_verified });
      // await updateBankAccount.mutateAsync({
      //   userId,
      //   bankAccountId: account.id,
      //   data: { is_verified: !account.is_verified },
      // });
      toast.success(`Bank account ${account.is_verified ? 'unverified' : 'verified'} successfully`);
    } catch (error) {
      toast.error('Failed to update verification status');
    }
  };

  const handleBulkVerify = async (selectedRows: UserBankAccount[], verify: boolean) => {
    if (selectedRows.length === 0) return;
    setIsBulkVerifying(true);
    try {
      const promises = selectedRows.map((account) =>
        updateBankAccount.mutateAsync({
          userId,
          bankAccountId: account.id,
          data: { is_verified: verify },
        })
      );
      await Promise.all(promises);
      toast.success(`${selectedRows.length} account(s) ${verify ? 'verified' : 'unverified'} successfully`);
    } catch (error) {
      toast.error('Failed to update verification status for some accounts');
    } finally {
      setIsBulkVerifying(false);
    }
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (showAccountNumbers) return accountNumber;
    return `****${accountNumber.slice(-4)}`;
  };

  // Define the columns for the data table
  const columns: ColumnDef<UserBankAccount>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          disabled={isLoading}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
          disabled={isLoading}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'account_holder',
      accessorKey: 'account_holder',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Details" />,
      cell: ({ row }) => {
        const account = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium">{account.account_holder}</div>
            <div className="text-muted-foreground font-mono text-sm">
              <CopyBtn label={maskAccountNumber(account.account_number)} tooltipText="Copy Account Number" text={account.account_number} />
            </div>
            <div className="text-muted-foreground text-sm">
              IFSC: <CopyBtn label={account.ifsc} tooltipText="Copy IFSC" text={account.ifsc} />
            </div>
            {account.is_verified && (
              <div className="mt-1 text-xs font-medium text-green-600">
                <CheckCircle className="mr-1 inline h-3 w-3" />
                Verified by Admin
                {account.verified_at && <div className="text-muted-foreground text-xs">{new Date(account.verified_at).toLocaleDateString()}</div>}
              </div>
            )}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'bank_name',
      accessorKey: 'bank_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bank" />,
      cell: ({ row }) => {
        const account = row.original;
        return (
          <HoverCardToolTip className="w-80" label={account.bank_name} triggerComponent={<div className="font-medium">{account.bank_name}</div>}>
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                <span>{account.bank_name}</span>
              </div>
            </div>
            <div className="text-muted-foreground text-sm">Account: {maskAccountNumber(account.account_number)}</div>
            <div className="text-muted-foreground text-sm">IFSC: {account.ifsc}</div>
          </HoverCardToolTip>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'is_verified',
      accessorKey: 'is_verified',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Verification Status" />,
      cell: ({ row }) => {
        const account = row.original;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={account.is_verified ? 'default' : 'secondary'}>
              {account.is_verified ? (
                <>
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Verified
                </>
              ) : (
                <>
                  <XCircle className="mr-1 h-3 w-3" />
                  Unverified
                </>
              )}
            </Badge>
            <ActionTooltip label={account.is_verified ? 'Mark as unverified' : 'Mark as verified'}>
              <Button variant="ghost" size="sm" onClick={() => handleVerify(account)} disabled={updateBankAccount.isPending}>
                {updateBankAccount.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : account.is_verified ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  <CheckCircle className="h-3 w-3" />
                )}
              </Button>
            </ActionTooltip>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => {
        const account = row.original;
        return (
          <div className="flex flex-col">
            <div className="text-sm">{new Date(account.created_at).toLocaleDateString()}</div>
            <div className="text-muted-foreground text-xs">{new Date(account.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actions" />,
      cell: ({ row }) => {
        const account = row.original;
        return (
          <div className="flex items-center gap-2">
            <ActionTooltip label="Edit account">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                <Edit className="h-3 w-3" />
              </Button>
            </ActionTooltip>
            <ActionTooltip label={account.is_verified ? 'Mark as unverified' : 'Mark as verified'}>
              <Button
                variant={account.is_verified ? 'outline' : 'default'}
                size="sm"
                className="p-2"
                onClick={() => handleVerify(account)}
                disabled={updateBankAccount.isPending}
              >
                {updateBankAccount.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : account.is_verified ? (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    Unverify
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Verify
                  </>
                )}
              </Button>
            </ActionTooltip>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <ActionTooltip label="Delete account">
                  <Trash2 className="h-7 w-7" onClick={() => handleDelete(account.id)}/>
                </ActionTooltip>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to delete this bank account? This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  // Define bulk actions
  const bulkActions = [
    {
      label: 'Verify Selected',
      action: (selectedRows: UserBankAccount[]) => handleBulkVerify(selectedRows, true),
      isLoading: isBulkVerifying,
    },
    {
      label: 'Unverify Selected',
      action: (selectedRows: UserBankAccount[]) => handleBulkVerify(selectedRows, false),
      variant: 'outline' as const,
      isLoading: isBulkVerifying,
    },
  ];

  const filterableColumns = [
    {
      id: 'is_verified',
      title: 'Verification Status',
      options: [
        { label: 'Verified', value: 'true' },
        { label: 'Unverified', value: 'false' },
      ],
    },
  ];

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  // Handle pagination change
  const handlePaginationChange = React.useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination);
  }, []);

  // Handle sorting change
  const handleSortingChange = React.useCallback((newSorting: { id: string; desc: boolean }[]) => {
    setSorting(newSorting);
  }, []);

  // Handle filters change
  const handleFiltersChange = React.useCallback((newFilters: { id: string; value: any }[]) => {
    setFilters(newFilters);
  }, []);

  // Handle global filter change
  const handleGlobalFilterChange = React.useCallback((newGlobalFilter: string) => {
    setGlobalFilter(newGlobalFilter);
  }, []);

  // Handle date range change
  const handleDateRangeChange = React.useCallback((newDateRange: { from: Date; to: Date }) => {
    setDateRange(newDateRange);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bank Accounts Management
              </CardTitle>
              <CardDescription>Manage user bank accounts for payments and remittances</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAccountNumbers(!showAccountNumbers)}>
                {showAccountNumbers ? <EyeOff className="h-4 w-4 sm:mr-2" /> : <Eye className="h-4 w-4 sm:mr-2" />}
                <span className="hidden sm:inline">{showAccountNumbers ? 'Hide' : 'Show'} Account Numbers</span>
              </Button>
              <Button onClick={() => openModal('add-bank-account', { onSubmit: handleFormSubmit, editingAccount: null })}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Bank Account</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      {/* Tabs and DataTable */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">All Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="verified" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Verified</span>
          </TabsTrigger>
          <TabsTrigger value="unverified" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Unverified</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <DataTable
            columns={columns}
            data={data?.data || []}
            count={data?.meta?.total || 0}
            pageCount={data?.meta?.total || 0}
            page={pagination.pageIndex}
            pageSize={pagination.pageSize}
            filterableColumns={filterableColumns}
            bulkActions={bulkActions}
            dateRangeFilter={false}
            searchableColumns={[
              { id: 'account_holder', title: 'Account Holder' },
              { id: 'bank_name', title: 'Bank Name' },
              { id: 'account_number', title: 'Account Number' },
              { id: 'ifsc', title: 'IFSC Code' },
            ]}
            searchPlaceholder="Search by account holder, bank name, account number, or IFSC code"
            isLoading={isLoading || isFetching}
            isError={isError}
            errorMessage={error instanceof Error ? error.message : 'Failed to fetch bank accounts. Please try again.'}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
