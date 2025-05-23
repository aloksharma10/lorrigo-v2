'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@lorrigo/ui/components';
import { ModalRegistry } from '../modal/modal-registry';
import { ModalProvider } from '@/modal/modal-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            // retry: 1,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              if (error instanceof Error && error.message.includes('4')) {
                return false;
              }
              return failureCount < 3;
            },
          },
        },
      })
  );
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <ModalProvider>
            <ModalRegistry />
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
              }}
            />
          </ModalProvider>
        </NextThemesProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
