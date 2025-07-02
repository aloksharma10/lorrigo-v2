'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function WalletRechargeCallback() {
  const params = useParams();
  const [shouldClose, setShouldClose] = useState(false);
  const [messageStatus, setMessageStatus] = useState<'processing' | 'success' | 'error'>(
    'processing'
  );

  useEffect(() => {
    const merchantTransactionId = params.mrId;

    if (!window.opener) {
      setMessageStatus('error');
      setTimeout(() => {
        window.location.href = '/seller/wallet';
      }, 3000);
      return;
    }

    if (!merchantTransactionId) {
      setMessageStatus('error');
      setShouldClose(true);
      return;
    }

    // Send status to parent
    try {
      const messageData = {
        type: 'PAYMENT_STATUS_DETECTED',
        // status: result.status,
        merchantTransactionId,
        url: window.location.href,
        // gateway: result.gateway,
        // paymentDetails: Object.fromEntries(searchParams.entries()),
        timestamp: new Date().toISOString(),
        source: 'callback_page',
      };

      window.opener.postMessage(messageData, window.location.origin);

      setMessageStatus('success');
      setShouldClose(true);
    } catch (error) {
      setMessageStatus('error');
      setShouldClose(true);
    }
  }, [params]);

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

      // Final fallback
      // setTimeout(() => {
      //   if (!window.closed) {
      //     window.location.href = "/seller/wallet"
      //   }
      // }, 3000)
    }
  }, [shouldClose]);

  // Auto-close timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldClose(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="text-center">
          {messageStatus === 'processing' && (
            <>
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">Processing Payment</h2>
              <p className="text-sm text-gray-600">Analyzing payment status...</p>
            </>
          )}

          {messageStatus === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-5 w-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">Payment Detected! ✅</h2>
              <p className="text-sm text-gray-600">Closing window automatically...</p>
            </>
          )}

          {messageStatus === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-5 w-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">Processing Error ❌</h2>
              <p className="text-sm text-gray-600">Redirecting to wallet...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
