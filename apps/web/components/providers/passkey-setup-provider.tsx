'use client';

import { createContext, useContext, ReactNode } from 'react';
import { PasskeySetupModal } from '@/components/modals/passkey-setup-modal';
import { usePasskeySetup } from '@/lib/hooks/use-passkey-setup';

interface PasskeySetupContextType {
  resetSkipPreference: () => void;
  hasConfigured: boolean;
}

const PasskeySetupContext = createContext<PasskeySetupContextType | undefined>(undefined);

export function usePasskeySetupContext() {
  const context = useContext(PasskeySetupContext);
  if (context === undefined) {
    throw new Error('usePasskeySetupContext must be used within a PasskeySetupProvider');
  }
  return context;
}

interface PasskeySetupProviderProps {
  children: ReactNode;
}

export function PasskeySetupProvider({ children }: PasskeySetupProviderProps) {
  const { showModal, hasConfigured, handleClose, handleSkip, handleConfigure, resetSkipPreference } = usePasskeySetup();

  return (
    <PasskeySetupContext.Provider value={{ resetSkipPreference, hasConfigured }}>
      {children}
      <PasskeySetupModal isOpen={showModal} onClose={handleClose} onSkip={handleSkip} onConfigure={handleConfigure} />
    </PasskeySetupContext.Provider>
  );
}
