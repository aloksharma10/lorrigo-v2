'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWalletOperations } from '@/lib/apis/user';
import { toast } from '@lorrigo/ui/components';
import { Loader2 } from 'lucide-react';

export default function WalletRechargeCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const { verifyWalletRecharge } = useWalletOperations();

  useEffect(() => {
    const merchantTransactionId = searchParams.get('merchantTransactionId');
    
    if (!merchantTransactionId) {
      toast.error('Invalid callback parameters');
      setIsVerifying(false);
      // Redirect back to wallet page after a short delay
      setTimeout(() => {
        router.push('/seller/billing/wallet');
      }, 2000);
      return;
    }

    // Verify the payment - using only merchantTransactionId like in old code
    verifyWalletRecharge.mutate(
      {
        merchantTransactionId,
      },
      {
        onSuccess: (data) => {
          if (data.valid) {
            toast.success('Wallet recharged successfully');
          } else {
            toast.error(data.message || 'Payment verification failed');
          }
          setIsVerifying(false);
          // Redirect back to wallet page after a short delay
          setTimeout(() => {
            router.push('/seller/billing/wallet');
          }, 2000);
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Payment verification failed');
          setIsVerifying(false);
          // Redirect back to wallet page after a short delay
          setTimeout(() => {
            router.push('/seller/billing/wallet');
          }, 2000);
        },
      }
    );
  }, [searchParams, verifyWalletRecharge, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Wallet Recharge</h1>
        {isVerifying ? (
          <div className="mt-4 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4">Verifying your payment...</p>
          </div>
        ) : (
          <div className="mt-4">
            <p>Redirecting you back to your wallet...</p>
          </div>
        )}
      </div>
    </div>
  );
} 