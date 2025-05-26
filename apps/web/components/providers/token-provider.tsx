// token-provider.tsx
'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';

// Create axios instance
export const apiClient = axios.create({
   baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL || '/api',
});

// Token management context
interface TokenContextType {
   setAuthToken: (token: string | null) => void;
   clearAuthToken: () => void;
}

const TokenContext = React.createContext<TokenContextType | undefined>(undefined);

export const useAuthToken = () => {
   const context = React.useContext(TokenContext);
   if (!context) {
      throw new Error('useAuthToken must be used within TokenProvider');
   }
   return context;
};

export function TokenProvider({ children }: { children: React.ReactNode }) {
   const { data: session, status } = useSession();

   // Memoize the token to prevent unnecessary updates
   const token = React.useMemo(() => session?.user?.token || null, [session]);

   const setAuthToken = React.useCallback((token: string | null) => {
      if (token) {
         apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
         delete apiClient.defaults.headers.common['Authorization'];
      }
   }, []);

   const clearAuthToken = React.useCallback(() => {
      delete apiClient.defaults.headers.common['Authorization'];
   }, []);

   // Set token when session changes
   React.useEffect(() => {
      if (status === 'authenticated' && token) {
         setAuthToken(token);
      } else if (status === 'unauthenticated') {
         clearAuthToken();
      }
   }, [token, status, setAuthToken, clearAuthToken]);

   if (status === 'loading') {
      return null; // Prevent rendering children until session is loaded
   }

   return (
      <TokenContext.Provider value={{ setAuthToken, clearAuthToken }}>
         {children}
      </TokenContext.Provider>
   );
}