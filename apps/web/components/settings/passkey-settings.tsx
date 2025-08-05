'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePasskey } from '@/lib/hooks/use-passkey';
import { usePasskeySetupContext } from '@/components/providers/passkey-setup-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { Fingerprint, Plus, Trash2, Shield, Smartphone, Monitor, Tablet, AlertTriangle } from 'lucide-react';
import { toast } from '@lorrigo/ui/components';
import { Passkey } from '@/lib/hooks/use-passkey';

export function PasskeySettings() {
  const { data: session } = useSession();
  const { registerPasskey, deletePasskey, isPasskeySupported, getUserPasskeys } = usePasskey();
  const { resetSkipPreference, hasConfigured } = usePasskeySetupContext();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const loadPasskeys = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const userPasskeys = await getUserPasskeys(session.user.id);
      setPasskeys(userPasskeys);
    } catch (error) {
      console.error('Error loading passkeys:', error);
      toast.error('Failed to load passkeys');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, getUserPasskeys]);

  useEffect(() => {
    if (session?.user?.id) {
      loadPasskeys();
    }
  }, [session?.user?.id]);

  const handleAddPasskey = async () => {
    if (!session?.user?.id) {
      toast.error('User session not found');
      return;
    }

    setIsAdding(true);
    try {
      const success = await registerPasskey(session.user.id);
      if (success) {
        toast.success('Passkey added successfully');
        await loadPasskeys(); // Reload the list
      }
    } catch (error) {
      console.error('Error adding passkey:', error);
      toast.error('Failed to add passkey');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    if (!session?.user?.id) {
      toast.error('User session not found');
      return;
    }

    try {
      const success = await deletePasskey(session.user.id, passkeyId);
      if (success) {
        toast.success('Passkey deleted successfully');
        await loadPasskeys(); // Reload the list
      }
    } catch (error) {
      console.error('Error deleting passkey:', error);
      toast.error('Failed to delete passkey');
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isPasskeySupported()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Passkeys
          </CardTitle>
          <CardDescription>Secure your account with passkeys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium">Passkeys not supported</p>
              <p className="text-muted-foreground text-sm">
                Your browser or device doesn't support passkeys. Please use a modern browser with biometric authentication support.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Passkeys
        </CardTitle>
        <CardDescription>Manage your passkeys for secure authentication</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Passkey Button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Add New Passkey</h3>
            <p className="text-muted-foreground text-sm">Add a new passkey to this device for faster and more secure sign-in</p>
          </div>
          <Button onClick={handleAddPasskey} disabled={isAdding} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {isAdding ? 'Adding...' : 'Add Passkey'}
          </Button>
        </div>

        {/* Show Setup Modal Button if not configured */}
        {!hasConfigured && passkeys.length === 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Secure your account</p>
                <p className="text-muted-foreground text-sm">Set up your first passkey for enhanced security</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetSkipPreference}>
              Set Up Now
            </Button>
          </div>
        )}

        {/* Passkeys List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded bg-gray-200"></div>
                  <div>
                    <div className="h-4 w-24 rounded bg-gray-200"></div>
                    <div className="mt-1 h-3 w-32 rounded bg-gray-200"></div>
                  </div>
                </div>
                <div className="h-8 w-16 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        ) : passkeys.length > 0 ? (
          <div className="space-y-3">
            {passkeys.map((passkey) => (
              <div key={passkey.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {getDeviceIcon(passkey.deviceType)}
                  <div>
                    <p className="text-sm font-medium capitalize">{passkey.deviceType} Passkey</p>
                    <p className="text-muted-foreground text-xs">
                      Added {formatDate(passkey.createdAt)}
                      {passkey.lastUsedAt !== passkey.createdAt && <span> • Last used {formatDate(passkey.lastUsedAt)}</span>}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDeletePasskey(passkey.id)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground py-8 text-center">
            <Fingerprint className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="font-medium">No passkeys configured</p>
            <p className="text-sm">Add your first passkey to get started</p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
          <h4 className="mb-2 text-sm font-medium">About Passkeys</h4>
          <ul className="text-muted-foreground space-y-1 text-sm">
            <li>• Passkeys are more secure than passwords</li>
            <li>• They work with your device's biometric authentication</li>
            <li>• No need to remember complex passwords</li>
            <li>• Protected against phishing attacks</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
