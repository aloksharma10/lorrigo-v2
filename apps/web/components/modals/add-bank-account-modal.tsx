import React from 'react';
import { Modal, Button, Input, Label, toast, Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@lorrigo/ui/components';
import { useAddBankAccount } from '@/lib/apis/remittance';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useModalStore } from '@/modal/modal-store';

export const bankAccountSchema = z.object({
  account_number: z
    .string()
    .trim()
    .min(9, "Account number must be at least 9 digits")
    .max(18, "Account number cannot exceed 18 digits")
    .regex(/^\d+$/, "Account number must contain only digits"),

  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z]{4}0[A-Z0-9]{6}$/,
      "Invalid IFSC format. Must be like 'ABCD0123456'"
    ),

  bank_name: z
    .string()
    .trim()
    .min(3, "Bank name must be at least 3 characters")
    .max(100, "Bank name is too long"),

  account_holder: z
    .string()
    .trim()
    .min(3, "Account holder name must be at least 3 characters")
    .max(100, "Account holder name is too long"),
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

interface AddBankAccountModalProps {
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  onSuccess?: () => void;
}

export default function AddBankAccountModal() {
  const { modals, closeModal } = useModalStore();
  const modal_props = modals.filter((modal) => modal.type === 'add-bank-account')[0];
  const modal_id = modal_props!.id;
  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      account_number: '',
      ifsc: '',
      bank_name: '',
      account_holder: '',
    },
  });

  const { mutate: addBankAccount, isPending } = useAddBankAccount();

  const handleSubmit = (values: BankAccountFormValues) => {
    addBankAccount(values, {
      onSuccess: () => {
        toast.success('Bank account added successfully');
        form.reset();
        closeModal(modal_id);
      },
      onError: (err: any) => {
        toast.error(err?.message || 'Failed to add bank account');
      },
    });
  };

  return (
    <Modal>
   <div className='p-4'>
   <h2 className="lg:text-xl text-lg font-semibold mb-4">Add Bank Account</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="account_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number</FormLabel>
                <FormControl>
                  <Input {...field} required />
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
                <FormLabel>IFSC</FormLabel>
                <FormControl>
                  <Input {...field} required />
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
                <FormLabel>Bank Name</FormLabel>
                <FormControl>
                  <Input {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="account_holder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Holder</FormLabel>
                <FormControl>
                  <Input {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => closeModal(modal_id)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending} disabled={isPending}>
              Add Account
            </Button>
          </div>
        </form>
      </Form>
   </div>
    </Modal>
  );
} 