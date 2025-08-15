'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { AppProgressProvider as ProgressProvider } from '@bprogress/next';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@lorrigo/ui/components';
import { ModalRegistry } from '../../modal/modal-registry';
import { ModalProvider } from '@/modal/modal-provider';
import { LoadingBar } from './loading-bar';
import { TokenProvider } from './token-provider';
import { CSVUploadProvider } from './csv-upload-provider';
import DrawerProvider from './drawer-provider';
import { DrawerRegistry } from '@/drawer/drawer-registry';
import { BulkOperationsProvider } from './bulk-operations-provider';
import { PasskeySetupProvider } from './passkey-setup-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (error instanceof Error && error.message.includes('401')) {
                // signOut(); // Redirect to login page after sign-out
                return false;
              }
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
    <ProgressProvider height="4px" color="#920b08" options={{ showSpinner: false }} shallowRouting>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <TokenProvider>
            <NextThemesProvider
              attribute="class"
              defaultTheme="light"
              // enableSystem
              disableTransitionOnChange
              enableColorScheme
            >
              <CSVUploadProvider preferenceKey="csvMappingPreferences">
                <ModalProvider>
                  <ModalRegistry />
                  <DrawerProvider>
                    <BulkOperationsProvider>
                      <PasskeySetupProvider>
                        <DrawerRegistry />
                        <LoadingBar />
                        {children}
                        <Toaster closeButton swipeDirections={[ 'top', 'bottom', 'left', 'right']} position="top-right" toastOptions={{ duration: 4000 }} richColors />
                      </PasskeySetupProvider>
                    </BulkOperationsProvider>
                  </DrawerProvider>
                </ModalProvider>
              </CSVUploadProvider>
            </NextThemesProvider>
          </TokenProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ProgressProvider>
  );
}
