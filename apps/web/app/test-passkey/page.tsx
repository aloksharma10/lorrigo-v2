'use client';

import { usePasskeySetupContext } from '@/components/providers/passkey-setup-provider';
import { Button } from '@lorrigo/ui/components';
import { PasskeySettings } from '@/components/settings/passkey-settings';

export default function TestPasskeyPage() {
  const { resetSkipPreference, hasConfigured } = usePasskeySetupContext();

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="max-w-2xl">
        <h1 className="mb-4 text-2xl font-bold">Passkey Setup Test</h1>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h2 className="mb-2 font-semibold">Test Controls</h2>
            <div className="space-y-2">
              <Button onClick={resetSkipPreference}>Show Passkey Setup Modal</Button>
              <p className="text-muted-foreground text-sm">Current status: {hasConfigured ? 'Configured' : 'Not configured'}</p>
            </div>
          </div>

          <PasskeySettings />
        </div>
      </div>
    </div>
  );
}
