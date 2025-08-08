'use client';

import * as React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Button,
  Input,
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
  FormDescription,
  toast,
} from '@lorrigo/ui/components'; // Assuming these are from shadcn/ui
import { Loader2 } from 'lucide-react';
import { useAddBankAccount } from '@/lib/apis/remittance';

// Zod schema for bank account form
const bankAccountSchema = z.object({
  account_number: z.string().min(1, 'Account number is required').max(20),
  ifsc: z.string().length(11, 'IFSC code must be exactly 11 characters'),
  bank_name: z.string().min(1, 'Bank name is required').max(100),
  account_holder: z.string().min(1, 'Account holder name is required').max(100),
  acc_type: z.enum(['SAVINGS', 'CURRENT']),
});

export type BankAccountFormData = z.infer<typeof bankAccountSchema>;

// Assuming UserBankAccount type is defined in '@/lib/apis/users'
// For demonstration, defining a minimal type here if not available
interface UserBankAccount {
  id: string;
  account_number: string;
  ifsc: string;
  bank_name: string;
  account_holder: string;
  acc_type?: 'SAVINGS' | 'CURRENT';
  is_verified: boolean;
  verified_at?: string;
  created_at: string;
  is_selected_for_remittance?: boolean;
}

interface BankAccountFormDialogProps {
  onClose: () => void;
  editingAccount: UserBankAccount | null;
  onSubmit: (data: BankAccountFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function BankAccountFormModal({ onClose, editingAccount, onSubmit, isSubmitting }: BankAccountFormDialogProps) {
  const { mutate: addBankAccount, isPending } = useAddBankAccount();

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

  React.useEffect(() => {
    if (editingAccount) {
      form.reset({
        account_number: editingAccount.account_number,
        ifsc: editingAccount.ifsc,
        bank_name: editingAccount.bank_name,
        account_holder: editingAccount.account_holder,
        acc_type: editingAccount.acc_type || 'SAVINGS',
      });
    } else {
      form.reset(); // Reset form when not editing (e.g., for new account)
    }
  }, [editingAccount, form]);

  const handleFormSubmit = async (data: BankAccountFormData) => {
    if (onSubmit) {
      await onSubmit(data);
      return;
    }

    addBankAccount(data)
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      form.reset(); // Reset form on close
      onClose()
    } else {
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">{editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}</h2>
      <p className="text-muted-foreground text-sm">{editingAccount ? 'Update the bank account details below.' : 'Add a new bank account for this user.'}</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="mt-4 space-y-4">
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
                    <Input placeholder="SBIN0001234" className="uppercase" maxLength={11} {...field} />
                  </FormControl>
                  <FormDescription>11-character IFSC code (e.g., SBIN0001234)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAccount ? 'Update' : 'Add'} Account
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
