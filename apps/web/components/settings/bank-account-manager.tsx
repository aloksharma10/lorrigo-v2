'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  toast,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@lorrigo/ui/components';

import { useUserBankAccounts, useAddUserBankAccount, useUpdateUserBankAccount, useDeleteUserBankAccount } from '@/lib/apis/users';
import { Loader2, Plus, Edit, Trash2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

const bankAccountSchema = z.object({
  account_number: z.string().min(1, 'Account number is required'),
  ifsc: z.string().min(1, 'IFSC code is required'),
  bank_name: z.string().min(1, 'Bank name is required'),
  account_holder: z.string().min(1, 'Account holder name is required'),
  acc_type: z.enum(['SAVINGS', 'CURRENT']).optional(),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccountManagerProps {
  userId: string;
}

export const BankAccountManager = ({ userId }: BankAccountManagerProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deletingAccount, setDeletingAccount] = useState<any>(null);

  const { data: bankAccountsData, refetch } = useUserBankAccounts(userId);
  const addBankAccount = useAddUserBankAccount();
  const updateBankAccount = useUpdateUserBankAccount();
  const deleteBankAccount = useDeleteUserBankAccount();

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

  const handleSubmit = async (data: BankAccountFormData) => {
    try {
      if (editingAccount) {
        await updateBankAccount.mutateAsync({
          userId,
          bankAccountId: editingAccount.id,
          data,
        });
        toast.success('Bank account updated successfully');
      } else {
        await addBankAccount.mutateAsync({
          userId,
          data,
        });
        toast.success('Bank account added successfully');
      }
      
      setIsAddDialogOpen(false);
      setEditingAccount(null);
      form.reset();
      refetch();
    } catch (error) {
      toast.error('Failed to save bank account');
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    
    try {
      await deleteBankAccount.mutateAsync({
        userId,
        bankAccountId: deletingAccount.id,
      });
      toast.success('Bank account deleted successfully');
      setDeletingAccount(null);
      refetch();
    } catch (error) {
      toast.error('Failed to delete bank account');
    }
  };

  const openEditDialog = (account: any) => {
    setEditingAccount(account);
    form.reset({
      account_number: account.account_number,
      ifsc: account.ifsc,
      bank_name: account.bank_name,
      account_holder: account.account_holder,
      acc_type: account.acc_type || 'SAVINGS',
    });
    setIsAddDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingAccount(null);
    form.reset({
      account_number: '',
      ifsc: '',
      bank_name: '',
      account_holder: '',
      acc_type: 'SAVINGS',
    });
    setIsAddDialogOpen(true);
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingAccount(null);
    form.reset();
  };

  const bankAccounts = bankAccountsData?.data || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Bank Accounts</span>
              </CardTitle>
              <CardDescription>
                Manage your bank accounts for remittances and payments
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Bank Account</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAccount 
                      ? 'Update your bank account information'
                      : 'Add a new bank account for remittances and payments'
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="account_holder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter account holder name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter bank name" {...field} />
                          </FormControl>
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
                            <FormLabel>Account Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter account number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ifsc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IFSC Code *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter IFSC code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="acc_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SAVINGS">Savings</SelectItem>
                              <SelectItem value="CURRENT">Current</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={closeDialog}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addBankAccount.isPending || updateBankAccount.isPending}
                      >
                        {(addBankAccount.isPending || updateBankAccount.isPending) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {editingAccount ? 'Update Account' : 'Add Account'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bankAccounts.length > 0 ? (
              bankAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{account.bank_name}</h4>
                        {account.is_verified && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {account.account_holder}
                      </p>
                      <p className="text-sm text-gray-500">
                        ****{account.account_number.slice(-4)} • {account.ifsc}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex flex-col items-end space-y-1">
                      {account.is_verified && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Verified
                        </Badge>
                      )}
                      {account.is_selected_for_remittance && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          Primary
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(account)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingAccount(account)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this bank account? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeletingAccount(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={deleteBankAccount.isPending}
                            >
                              {deleteBankAccount.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bank accounts</h3>
                <p className="text-gray-500 mb-4">
                  Add your first bank account to receive remittances and manage payments.
                </p>
                <Button onClick={openAddDialog} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Bank Account</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 