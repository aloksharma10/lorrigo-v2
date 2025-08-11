'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function WalletRechargeCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [shouldClose, setShouldClose] = useState(false);
  const [messageStatus, setMessageStatus] = useState<'processing' | 'success' | 'error' | 'cancelled'>('processing');

  useEffect(() => {
    // Get merchant transaction ID from search params
    const merchantTransactionId = searchParams.get('merchantTransactionId') || searchParams.get('order_id');
    const status = searchParams.get('status');
    const error = searchParams.get('error');

    if (!window.opener) {
      setMessageStatus('error');
      setTimeout(() => {
        router.push('/seller/wallet');
      }, 3000);
      return;
    }

    if (!merchantTransactionId) {
      setMessageStatus('error');
      setShouldClose(true);
      return;
    }

    // Determine the status based on search params
    let messageType = 'PAYMENT_REDIRECT';
    let detectedStatus = 'success';

    if (status === 'failure' || error) {
      messageType = 'PAYMENT_ERROR';
      detectedStatus = 'error';
      setMessageStatus('error');
    } else if (status === 'cancelled') {
      messageType = 'PAYMENT_CANCELLED';
      detectedStatus = 'cancelled';
      setMessageStatus('cancelled');
    } else {
      messageType = 'PAYMENT_SUCCESS';
      detectedStatus = 'success';
      setMessageStatus('success');
    }

    // Send status to parent window
    try {
      const messageData = {
        type: messageType,
        status: detectedStatus,
        merchantTransactionId,
        url: window.location.href,
        searchParams: Object.fromEntries(searchParams.entries()),
        timestamp: new Date().toISOString(),
        source: 'callback_page',
        error: error || undefined,
      };

      window.opener.postMessage(messageData, window.location.origin);
      setShouldClose(true);
    } catch (error) {
      console.error('Failed to send message to parent:', error);
      setMessageStatus('error');
      setShouldClose(true);
    }
  }, [searchParams, router]);

  // Auto-close mechanism
  useEffect(() => {
    if (shouldClose) {
      const closeAttempts = [
        () => window.close(),
        () => setTimeout(() => window.close(), 100),
        () => setTimeout(() => window.close(), 500),
        () => setTimeout(() => window.close(), 1000),
      ];

      closeAttempts.forEach((attempt, index) => {
        setTimeout(attempt, index * 200);
      });

      // Final fallback - redirect to wallet if window doesn't close
      setTimeout(() => {
        if (!window.closed) {
          router.push('/seller/wallet');
        }
      }, 5000);
    }
  }, [shouldClose, router]);

  // Auto-close timer as fallback
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldClose(true);
    }, 8000); // Increased timeout for better UX

    return () => clearTimeout(timer);
  }, []);

  const getStatusContent = () => {
    switch (messageStatus) {
      case 'processing':
        return {
          icon: (
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          ),
          title: 'Processing Payment',
          description: 'Verifying your payment status...',
          color: 'blue',
        };
      case 'success':
        return {
          icon: (
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ),
          title: 'Payment Successful! ✅',
          description: 'Your wallet has been recharged. Closing window...',
          color: 'green',
        };
      case 'error':
        return {
          icon: (
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          ),
          title: 'Payment Failed ❌',
          description: 'There was an issue with your payment. Closing window...',
          color: 'red',
        };
      case 'cancelled':
        return {
          icon: (
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          ),
          title: 'Payment Cancelled ⚠️',
          description: 'You cancelled the payment. Closing window...',
          color: 'yellow',
        };
      default:
        return {
          icon: <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600"></div>,
          title: 'Processing...',
          description: 'Please wait...',
          color: 'gray',
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="text-center">
          {statusContent.icon}
          <h2 className="mb-2 text-lg font-semibold text-gray-800">{statusContent.title}</h2>
          <p className="text-sm text-gray-600">{statusContent.description}</p>
          
          {/* Show close instruction if auto-close fails */}
          <div className="mt-4 text-xs text-gray-500">
            If this window doesn&apos;t close automatically, you can close it manually.
          </div>
        </div>
      </div>
    </div>
  );
}