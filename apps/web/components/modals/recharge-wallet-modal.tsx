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
import { X, Loader2, IndianRupee } from 'lucide-react';
import { useWalletOperations } from '@/lib/apis/user';

interface RechargeWalletModalProps {
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

const formSchema = z.object({
  amount: z
    .number()
    .min(100, 'Minimum recharge amount is ₹100')
    .max(100000, 'Maximum recharge amount is ₹100,000'),
});

type FormData = z.infer<typeof formSchema>;

export function RechargeWalletModal({ onClose, onSuccess }: RechargeWalletModalProps) {
  const { rechargeWallet } = useWalletOperations();
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 500,
    },
  });

  const handleSubmit = async (data: FormData) => {
    try {
      const result = await rechargeWallet.mutateAsync({
        amount: data.amount,
        redirectUrl: `${window.location.origin}/seller/billing/wallet/callback`,
      });

      if (result.url) {
        // Open payment link in a new window
        const paymentPopup = window.open(
          result.url,
          'paymentWindow',
          'width=800,height=600,resizable=yes,scrollbars=yes,status=yes'
        );
        
        setPaymentWindow(paymentPopup);
        
        // Check if window was blocked by popup blocker
        if (!paymentPopup || paymentPopup.closed || typeof paymentPopup.closed === 'undefined') {
          toast.error('Payment window was blocked. Please allow popups for this site.');
          return;
        }

        // Poll to check if payment window is closed
        const checkWindowClosed = setInterval(() => {
          if (paymentPopup.closed) {
            clearInterval(checkWindowClosed);
            // Refresh wallet balance after payment window is closed
            if (onSuccess) {
              onSuccess(data.amount);
            }
            onClose();
          }
        }, 1000);

        // Keep modal open until payment window is closed
      } else {
        toast.error('Failed to generate payment link');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to initiate wallet recharge');
    }
  };

  // Close payment window if modal is closed
  const handleClose = () => {
    if (paymentWindow && !paymentWindow.closed) {
      paymentWindow.close();
    }
    onClose();
  };

  return (
    <Card className="mx-auto flex w-full max-w-md flex-col">
      {/* Fixed Header */}
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recharge Wallet</CardTitle>
            <CardDescription>Enter amount to add to your wallet</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Scrollable Content */}
      <CardContent className="flex-1 overflow-y-auto pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        className="pl-10"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : Number(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {[500, 1000, 2000, 5000].map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => form.setValue('amount', amount)}
                  className={`flex-grow ${
                    form.getValues('amount') === amount ? 'border-primary bg-primary/10' : ''
                  }`}
                >
                  ₹{amount.toLocaleString('en-IN')}
                </Button>
              ))}
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Fixed Footer */}
      <CardFooter className="bg-muted/20 flex-shrink-0 border-t">
        <div className="flex w-full justify-end space-x-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={rechargeWallet.isPending}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={rechargeWallet.isPending || !form.formState.isValid}
          >
            {rechargeWallet.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
