'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getRoleBasedRedirect } from '@/lib/routes/redirect';
import { Role } from '@lorrigo/db';
import { useAuthToken } from '@/components/providers/token-provider';

export default function Redirecting() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isTokenReady } = useAuthToken();
  const userRole = (session?.user as any)?.role as Role;

  useEffect(() => {
    if (isTokenReady && userRole) {
      const redirectUrl = getRoleBasedRedirect(userRole);
      router.push(redirectUrl);
    }
  }, [isTokenReady, userRole, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <svg className="h-12 w-12 animate-spin text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Redirecting to your dashboard...</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please wait while we take you to your personalized dashboard</p>
      </div>
    </div>
  );
}
