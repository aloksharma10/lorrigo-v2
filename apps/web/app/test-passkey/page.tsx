'use client';

import { usePasskeySetupContext } from '@/components/providers/passkey-setup-provider';
import { Button } from '@lorrigo/ui/components';
import { PasskeySettings } from '@/components/settings/passkey-settings';

export default function TestPasskeyPage() {
  const { resetSkipPreference, hasConfigured } = usePasskeySetupContext();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Passkey Setup Test</h1>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">Test Controls</h2>
            <div className="space-y-2">
              <Button onClick={resetSkipPreference}>
                Show Passkey Setup Modal
              </Button>
              <p className="text-sm text-muted-foreground">
                Current status: {hasConfigured ? 'Configured' : 'Not configured'}
              </p>
            </div>
          </div>

          <PasskeySettings />
        </div>
      </div>
    </div>
  );
} 