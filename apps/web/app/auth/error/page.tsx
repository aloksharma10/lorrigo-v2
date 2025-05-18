'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  const getErrorMessage = () => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'You do not have access to this resource.';
      case 'Verification':
        return 'The token has expired or has already been used.';
      case 'OAuthSignin':
        return 'Could not connect to provider. Please try again.';
      case 'OAuthCallback':
        return 'Error during sign in. Please try again.';
      case 'OAuthAccountNotLinked':
        return 'Email already in use with different provider.';
      case 'EmailCreateAccount':
        return 'Could not create your account. Email may already be in use.';
      case 'Callback':
        return 'Invalid callback URL.';
      case 'OAuthAccountNotLinked':
        return 'To confirm your identity, sign in with the same account you used originally.';
      default:
        return 'An unknown error occurred. Please try again.';
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Authentication Error</h1>
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {getErrorMessage()}
        </div>
        <button
          onClick={() => router.push('/auth/signin')}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
