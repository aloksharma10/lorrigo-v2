'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  FormDescription,
} from '@lorrigo/ui/components';
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  Search,
  Loader2,
  Eye,
  EyeOff,
  Building,
} from 'lucide-react';
import { DataTable, DataTableColumnHeader } from '@lorrigo/ui/components';
import type { ColumnDef } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  UserBankAccount,
  BankAccountParams,
  useUserBankAccounts,
  useAddUserBankAccount,
  useUpdateUserBankAccount,
  useDeleteUserBankAccount,
} from '@/lib/apis/users';
import { useAuthToken } from '@/components/providers/token-provider';
import { CopyBtn } from '@/components/copy-btn';
import ActionTooltip from '@/components/action-tooltip';
import HoverCardToolTip from '@/components/hover-card-tooltip';

// Zod schema for bank account form
const bankAccountSchema = z.object({
  account_number: z.string().min(1, 'Account number is required').max(20),
  ifsc: z.string().length(11, 'IFSC code must be exactly 11 characters'),
  bank_name: z.string().min(1, 'Bank name is required').max(100),
  account_holder: z.string().min(1, 'Account holder name is required').max(100),
  acc_type: z.enum(['SAVINGS', 'CURRENT']),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

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
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<UserBankAccount | null>(null);
  const [showAccountNumbers, setShowAccountNumbers] = React.useState(false);
  const [isBulkVerifying, setIsBulkVerifying] = React.useState(false);

  const addBankAccount = useAddUserBankAccount();
  const updateBankAccount = useUpdateUserBankAccount();
  const deleteBankAccount = useDeleteUserBankAccount();

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

  // Form for adding/editing bank accounts
  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      account_number: '',
      ifsc: '',
      bank_name: '',
      account_holder: '',
      acc_type: 'SAVINGS',
    },
  });

  // Update form when editing
  React.useEffect(() => {
    if (editingAccount) {
      form.reset({
        account_number: editingAccount.account_number,
        ifsc: editingAccount.ifsc,
        bank_name: editingAccount.bank_name,
        account_holder: editingAccount.account_holder,
        acc_type: editingAccount.acc_type || 'SAVINGS',
      });
    }
  }, [editingAccount, form]);

  const onSubmit = async (data: BankAccountFormData) => {
    try {
      if (editingAccount) {
        await updateBankAccount.mutateAsync({
          userId,
          bankAccountId: editingAccount.id,
          data,
        });
        toast.success('Bank account updated successfully');
        // toast({
        //   title: 'Success',
        //   description: 'Bank account updated successfully',
        // });
        setEditingAccount(null);
      } else {
        await addBankAccount.mutateAsync({
          userId,
          data,
        });
        toast.success('Bank account added successfully');
        // toast({
        //   title: 'Success',
        //   description: 'Bank account added successfully',
        // });
      }
      setIsAddDialogOpen(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to save bank account');
      // toast({
      //   title: 'Error',
      //   description: 'Failed to save bank account',
      //   variant: 'destructive',
      // });
    }
  };

  const handleEdit = (account: UserBankAccount) => {
    setEditingAccount(account);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (accountId: string) => {
    try {
      await deleteBankAccount.mutateAsync({ userId, bankAccountId: accountId });
      toast.success('Bank account deleted successfully');
      // toast({
      //   title: 'Success',
      //   description: 'Bank account deleted successfully',
      // });
    } catch (error) {
      toast.error('Failed to delete bank account');
      // toast({
      //   title: 'Error',
      //   description: 'Failed to delete bank account',
      //   variant: 'destructive',
      // });
    }
  };

  const handleVerify = async (account: UserBankAccount) => {
    try {
      await updateBankAccount.mutateAsync({
        userId,
        bankAccountId: account.id,
        data: { is_verified: !account.is_verified },
      });
          toast.success(`Bank account ${account.is_verified ? 'unverified' : 'verified'} successfully`);
      // toast({
      //   title: 'Success',
      //   description: `Bank account ${account.is_verified ? 'unverified' : 'verified'} successfully`,
      // });
    } catch (error) {
      toast.error('Failed to update verification status');
      // toast({
      //   title: 'Error',
      //   description: 'Failed to update verification status',
      //   variant: 'destructive',
      // });
    }
  };

  const handleSelectForRemittance = async (account: UserBankAccount) => {
    try {
      await updateBankAccount.mutateAsync({
        userId,
        bankAccountId: account.id,
        data: { is_selected_for_remittance: !account.is_selected_for_remittance },
      });
      toast.success(`Bank account ${account.is_selected_for_remittance ? 'deselected' : 'selected'} for remittance`);
      // toast({
      //   title: 'Success',
      //   description: `Bank account ${account.is_selected_for_remittance ? 'deselected' : 'selected'} for remittance`,
      // });
    } catch (error) {
        toast.error('Failed to update remittance selection');
      // toast({
      //   title: 'Error',
      //   description: 'Failed to update remittance selection',
      //   variant: 'destructive',
      // });
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
      // toast({
      //   title: 'Success',
      //   description: `${selectedRows.length} account(s) ${verify ? 'verified' : 'unverified'} successfully`,
      // });
    } catch (error) {
      toast.error('Failed to update verification status for some accounts');
      // toast({
      //   title: 'Error',
      //   description: 'Failed to update verification status for some accounts',
      //   variant: 'destructive',
      // });
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
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
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
            <div className="text-muted-foreground text-sm font-mono">
              <CopyBtn
                label={maskAccountNumber(account.account_number)}
                tooltipText="Copy Account Number"
                text={account.account_number}
              />
            </div>
            <div className="text-muted-foreground text-sm">
              IFSC: <CopyBtn label={account.ifsc} tooltipText="Copy IFSC" text={account.ifsc} />
            </div>
            {account.is_verified && (
              <div className="text-xs text-green-600 font-medium mt-1">
                <CheckCircle className="h-3 w-3 inline mr-1" />
                Verified by Admin
                {account.verified_at && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(account.verified_at).toLocaleDateString()}
                  </div>
                )}
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
          <HoverCardToolTip
            className="w-80"
            label={account.bank_name}
            triggerComponent={<div className="font-medium">{account.bank_name}</div>}
          >
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                <span>{account.bank_name}</span>
              </div>
            </div>
            <div className="text-muted-foreground text-sm">
              Account: {maskAccountNumber(account.account_number)}
            </div>
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
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Unverified
                </>
              )}
            </Badge>
            <ActionTooltip label={account.is_verified ? 'Mark as unverified' : 'Mark as verified'}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVerify(account)}
                disabled={updateBankAccount.isPending}
              >
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
    // {
    //   id: 'is_selected_for_remittance',
    //   accessorKey: 'is_selected_for_remittance',
    //   header: ({ column }) => <DataTableColumnHeader column={column} title="Remittance" />,
    //   cell: ({ row }) => {
    //     const account = row.original;
    //     return (
    //       <div className="flex items-center gap-2">
    //         {account.is_selected_for_remittance && (
    //           <Badge variant="outline">
    //             <Star className="h-3 w-3 mr-1" />
    //             Selected
    //           </Badge>
    //         )}
    //         <ActionTooltip
    //           label={account.is_selected_for_remittance ? 'Deselect for remittance' : 'Select for remittance'}
    //         >
    //           <Button
    //             variant="ghost"
    //             size="sm"
    //             onClick={() => handleSelectForRemittance(account)}
    //             disabled={updateBankAccount.isPending}
    //           >
    //             {updateBankAccount.isPending ? (
    //               <Loader2 className="h-3 w-3 animate-spin" />
    //             ) : (
    //               <Star className="h-3 w-3" />
    //             )}
    //           </Button>
    //         </ActionTooltip>
    //       </div>
    //     );
    //   },
    //   enableSorting: true,
    //   enableHiding: true,
    //   filterFn: (row, id, value) => value.includes(row.getValue(id)),
    // },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => {
        const account = row.original;
        return (
          <div className="flex flex-col">
            <div className="text-sm">{new Date(account.created_at).toLocaleDateString()}</div>
            <div className="text-muted-foreground text-xs">
              {new Date(account.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
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
                className='p-2'
                onClick={() => handleVerify(account)}
                disabled={updateBankAccount.isPending}
              >
                {updateBankAccount.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : account.is_verified ? (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Unverify
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verify
                  </>
                )}
              </Button>
            </ActionTooltip>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                {/* <Button variant="ghost" size="sm"> */}
                  <ActionTooltip label="Delete account">
                    <Trash2 className="h-7 w-7" />
                  </ActionTooltip>
                {/* </Button> */}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this bank account? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(account.id)}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
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
    // {
    //   id: 'is_selected_for_remittance',
    //   title: 'Remittance Status',
    //   options: [
    //     { label: 'Selected', value: 'true' },
    //     { label: 'Not Selected', value: 'false' },
    //   ],
    // },
  ];

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  // Handle pagination change
  const handlePaginationChange = React.useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      setPagination(newPagination);
    },
    []
  );

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
    <div className="max-w-6xl mx-auto space-y-6">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAccountNumbers(!showAccountNumbers)}
              >
                {showAccountNumbers ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showAccountNumbers ? 'Hide' : 'Show'} Account Numbers
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bank Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}</DialogTitle>
                    <DialogDescription>
                      {editingAccount
                        ? 'Update the bank account details below.'
                        : 'Add a new bank account for this user.'}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="account_holder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Holder Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter account holder name" {...field} />
                            </FormControl>
                            <FormDescription>Name as per bank records</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bank_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter bank name" {...field} />
                            </FormControl>
                            <FormDescription>Full name of the bank</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="acc_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select account type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SAVINGS">Savings Account</SelectItem>
                                <SelectItem value="CURRENT">Current Account</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Type of bank account</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="account_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter account number" {...field} />
                              </FormControl>
                              <FormDescription>Your bank account number</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ifsc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IFSC Code</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="SBIN0001234"
                                  className="uppercase"
                                  maxLength={11}
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>11-character IFSC code (e.g., SBIN0001234)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddDialogOpen(false);
                            setEditingAccount(null);
                            form.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addBankAccount.isPending || updateBankAccount.isPending}>
                          {(addBankAccount.isPending || updateBankAccount.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {editingAccount ? 'Update' : 'Add'} Account
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs and DataTable */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
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
              {/* <TabsTrigger value="selected" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Selected for Remittance</span>
              </TabsTrigger> */}
            </TabsList>
            <TabsContent value={activeTab}>
              <DataTable
              
                columns={columns}
                data={data?.data || []}
                count={data?.meta?.total || 0}
                pageCount={data?.meta?.pageCount || 0}
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
                errorMessage={
                  error instanceof Error ? error.message : 'Failed to fetch bank accounts. Please try again.'
                }
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
        </CardContent>
      </Card>
    </div>
  );
}