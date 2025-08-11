'use client';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

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
import { useWalletOperations } from '@/lib/apis/wallet';
import { load as loadCashfree } from '@cashfreepayments/cashfree-js';

interface RechargeWalletModalProps {
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

const formSchema = z.object({
  amount: z
    .number()
    .min(500, 'Minimum recharge amount is ₹500')
    .max(100000, 'Maximum recharge amount is ₹100,000')
    .refine((val) => val % 100 === 0, 'Amount must be a multiple of 100'),
});

type FormData = z.infer<typeof formSchema>;

export function RechargeWalletModal({ onClose, onSuccess }: RechargeWalletModalProps) {
  const router = useRouter();
  const { rechargeWallet, verifyWalletRecharge } = useWalletOperations();
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Use refs to avoid stale closure issues
  const paymentWindowRef = useRef<Window | null>(null);
  const processingRef = useRef(false);
  const verifyingRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 500,
    },
  });

  // Cleanup function
  const cleanup = () => {
    if (paymentWindowRef.current && !paymentWindowRef.current.closed) {
      paymentWindowRef.current.close();
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPaymentWindow(null);
    paymentWindowRef.current = null;
    setProcessingPayment(false);
    processingRef.current = false;
    setVerifyingPayment(false);
    verifyingRef.current = false;
    setPendingTransactionId(null);
  };

  // Handle messages from the payment popup window
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate message origin
      if (event.origin !== window.location.origin) {
        return;
      }

      const { type, merchantTransactionId, error, status } = event.data;

      // Validate transaction ID
      if (!merchantTransactionId || merchantTransactionId !== pendingTransactionId) {
        return;
      }

      // Prevent duplicate processing
      if (verifyingRef.current) {
        return;
      }

      verifyingRef.current = true;
      setVerifyingPayment(true);

      // Clear polling interval since we received a message
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      try {
        switch (type) {
          case 'PAYMENT_SUCCESS':
          case 'PAYMENT_REDIRECT':
            // Close the popup immediately
            if (paymentWindowRef.current && !paymentWindowRef.current.closed) {
              paymentWindowRef.current.close();
            }

            // Verify payment with backend
            const result = await verifyWalletRecharge.mutateAsync({
              merchantTransactionId,
            });

            if (result.valid) {
              toast.success('Wallet recharged successfully');
              if (onSuccess && form.getValues('amount')) {
                onSuccess(form.getValues('amount'));
              }
              cleanup();
              onClose();
            } else {
              toast.error(result.message || 'Payment verification failed');
              cleanup();
              onClose();
            }
            break;

          case 'PAYMENT_ERROR':
            toast.error(error || 'Payment failed');
            cleanup();
            onClose();
            break;

          case 'PAYMENT_CANCELLED':
            toast.info('Payment cancelled');
            cleanup();
            onClose();
            break;

          default:
            verifyingRef.current = false;
            setVerifyingPayment(false);
            return;
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Payment verification failed');
        cleanup();
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pendingTransactionId, onSuccess, onClose, form, verifyWalletRecharge, router]);


  // Enhanced popup monitoring with better polling
  useEffect(() => {
    if (!paymentWindow || !processingPayment || !pendingTransactionId) return;

    let pollCount = 0;
    const maxPolls = 600; // 10 minutes max (polling every second)

    pollIntervalRef.current = setInterval(async () => {
      pollCount++;

      // Check if window is closed
      if (paymentWindow.closed) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;

        // Only proceed if not already verifying
        if (verifyingRef.current) {
          return;
        }

        // Check payment status as fallback
        verifyingRef.current = true;
        setVerifyingPayment(true);

        try {
          const result = await verifyWalletRecharge.mutateAsync({
            merchantTransactionId: pendingTransactionId,
          });

          if (result.valid) {
            toast.success('Wallet recharged successfully');
            if (onSuccess && form.getValues('amount')) {
              onSuccess(form.getValues('amount'));
            }
          } else {
            toast.error(result.message || 'Payment was not completed');
          }
        } catch (error: any) {
          console.error('Fallback verification error:', error);
          toast.error('Unable to verify payment status');
        } finally {
          cleanup();
          onClose();
        }
        return;
      }

      // Timeout handling
      if (pollCount >= maxPolls) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        toast.error('Payment timeout. Please try again.');
        cleanup();
        onClose();
        return;
      }

      // Periodic status check (every 30 seconds)
      if (pollCount % 30 === 0 && !verifyingRef.current) {
        try {
          const result = await verifyWalletRecharge.mutateAsync({
            merchantTransactionId: pendingTransactionId,
          });

          if (result.valid) {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;

            // Close popup
            if (paymentWindowRef.current && !paymentWindowRef.current.closed) {
              paymentWindowRef.current.close();
            }

            toast.success('Wallet recharged successfully');
            if (onSuccess && form.getValues('amount')) {
              onSuccess(form.getValues('amount'));
            }
            cleanup();
            onClose();
          }
        } catch (error) {}
      }
    }, 1000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [paymentWindow, processingPayment, pendingTransactionId, verifyWalletRecharge, onSuccess, form, onClose, router]);

  const handleSubmit = async (data: FormData) => {
    if (processingRef.current) {
      return;
    }

    try {
      processingRef.current = true;
      setProcessingPayment(true);

      const result = await rechargeWallet.mutateAsync({
        amount: data.amount,
        redirectUrl: `${window.location.origin}/seller/wallet/callback`,
      });

      // Prefer SDK if available
      if (result.paymentSessionId && result.merchantTransactionId) {
        setPendingTransactionId(result.merchantTransactionId);
        try {
          const cashfree = await loadCashfree({ mode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox' });
          // Open modal checkout
          const checkoutResult = await cashfree?.checkout({
            paymentSessionId: result.paymentSessionId,
            redirectTarget: '_modal',
          });

          // After modal completion, verify regardless of result
          const verify = await verifyWalletRecharge.mutateAsync({ merchantTransactionId: result.merchantTransactionId });
          if (verify.valid) {
            toast.success('Wallet recharged successfully');
            if (onSuccess && form.getValues('amount')) onSuccess(form.getValues('amount'));
            cleanup();
            onClose();
            return;
          }

          // If still pending, inform user
          toast.error(verify.message || 'Payment not completed');
          cleanup();
          onClose();
          return;
        } catch (e: any) {
          // Fallback to link popup if SDK fails
        }
      }

      if (result.url && result.merchantTransactionId) {
        setPendingTransactionId(result.merchantTransactionId);

        const paymentPopup = window.open(
          result.url,
          'paymentWindow',
          'width=800,height=600,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no'
        );

        if (!paymentPopup || paymentPopup.closed || typeof paymentPopup.closed === 'undefined') {
          toast.error('Payment window was blocked. Please allow popups for this site.');
          processingRef.current = false;
          setProcessingPayment(false);
          setPendingTransactionId(null);
          return;
        }

        setPaymentWindow(paymentPopup);
        paymentWindowRef.current = paymentPopup;

        // Focus the popup window
        paymentPopup.focus();
      } else {
        throw new Error('Invalid payment initiation response');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to initiate wallet recharge');
      processingRef.current = false;
      setProcessingPayment(false);
      setPendingTransactionId(null);
    }
  };

  const handleClose = () => {
    if (processingPayment && !verifyingPayment) {
      // If payment is in progress but not verifying, ask for confirmation
      if (!confirm('Payment is in progress. Are you sure you want to close?')) {
        return;
      }
    }

    cleanup();
    onClose();
  };

  return (
    <Card className="flex w-full flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recharge Wallet</CardTitle>
            <CardDescription>
              {verifyingPayment
                ? 'Verifying your payment...'
                : processingPayment
                  ? 'Complete payment in the popup window'
                  : 'Enter amount to add to your wallet'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 rounded-full" disabled={verifyingPayment}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
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
                        disabled={processingPayment}
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
                  disabled={processingPayment}
                  onClick={() => form.setValue('amount', amount)}
                  className={`flex-grow ${form.getValues('amount') === amount ? 'border-primary bg-primary/10' : ''}`}
                >
                  ₹{amount.toLocaleString('en-IN')}
                </Button>
              ))}
            </div>
          </form>
        </Form>

        {processingPayment && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {verifyingPayment ? 'Verifying payment...' : 'Complete your payment in the popup window'}
            </div>
            <p className="mt-1 text-xs">The popup will close automatically after successful payment</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-muted/20 flex-shrink-0 border-t">
        <div className="flex w-full justify-end space-x-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={verifyingPayment}>
            {processingPayment && !verifyingPayment ? 'Cancel Payment' : 'Cancel'}
          </Button>
          <Button onClick={form.handleSubmit(handleSubmit)} disabled={processingPayment || !form.formState.isValid || rechargeWallet.isPending}>
            {verifyingPayment ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : processingPayment || rechargeWallet.isPending ? (
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
