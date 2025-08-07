'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  toast,
  Button,
  Input,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@lorrigo/ui/components';
import { X, Loader2, IndianRupee, Wallet } from 'lucide-react';
import { useTransferRemittanceToWallet } from '@/lib/apis/remittance';
import { currencyFormatter } from '@lorrigo/utils';

interface TransferRemittanceToWalletModalProps {
  onClose: () => void;
  remittance: {
    id: string;
    code: string;
    amount: number;
    status: string;
  };
}

const formSchema = z.object({
  amount: z
    .number()
    .min(1, 'Amount must be greater than 0')
    .refine((val) => val > 0, 'Amount must be greater than 0'),
});

type FormData = z.infer<typeof formSchema>;

export function TransferRemittanceToWalletModal({ onClose, remittance }: TransferRemittanceToWalletModalProps) {
  const { mutate: transferToWallet, isPending } = useTransferRemittanceToWallet();
  const [selectedAmount, setSelectedAmount] = useState<number>(remittance.amount);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: remittance.amount,
    },
  });

  const handleSubmit = async (data: FormData) => {
    if (data.amount > remittance.amount) {
      toast.error('Amount cannot be greater than remittance amount');
      return;
    }

    transferToWallet(
      { remittanceId: remittance.id, amount: data.amount },
      {
        onSuccess: (response: any) => {
          if (response.valid) {
            onClose();
          }
        },
      }
    );
  };

  const handleClose = () => {
    if (isPending) {
      if (!confirm('Transfer is in progress. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  const quickAmounts = [
    { label: '25%', value: Math.round(remittance.amount * 0.25) },
    { label: '50%', value: Math.round(remittance.amount * 0.5) },
    { label: '75%', value: Math.round(remittance.amount * 0.75) },
    { label: '100%', value: remittance.amount },
  ];

  return (
    <Card className="flex w-full flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Transfer to Wallet
            </CardTitle>
            <CardDescription>
              Transfer remittance amount directly to your wallet
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 rounded-full" disabled={isPending}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="font-medium">Remittance Details</span>
          </div>
          <p className="mt-1">Code: {remittance.code}</p>
          <p>Available Amount: {currencyFormatter(remittance.amount)}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        className="pl-10"
                        disabled={isPending}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : Number(e.target.value);
                          field.onChange(value);
                          setSelectedAmount(value || 0);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Quick Select:</p>
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map(({ label, value }) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      form.setValue('amount', value);
                      setSelectedAmount(value);
                    }}
                    className={`flex-grow ${
                      selectedAmount === value ? 'border-primary bg-primary/10' : ''
                    }`}
                  >
                    {label} ({currencyFormatter(value)})
                  </Button>
                ))}
              </div>
            </div>

            {selectedAmount > 0 && (
              <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                <div className="flex items-center justify-between">
                  <span>Amount to transfer:</span>
                  <span className="font-bold">{currencyFormatter(selectedAmount)}</span>
                </div>
                {selectedAmount < remittance.amount && (
                  <div className="mt-1 text-xs text-green-600">
                    Remaining: {currencyFormatter(remittance.amount - selectedAmount)}
                  </div>
                )}
              </div>
            )}
          </form>
        </Form>

        {isPending && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Transferring amount to wallet...
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-muted/20 flex-shrink-0 border-t">
        <div className="flex w-full justify-end space-x-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(handleSubmit)} 
            disabled={isPending || !form.formState.isValid || selectedAmount <= 0 || selectedAmount > remittance.amount}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              'Transfer to Wallet'
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 