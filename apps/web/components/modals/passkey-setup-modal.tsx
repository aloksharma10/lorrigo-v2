'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { X, Fingerprint, Shield, Zap } from 'lucide-react';
import { usePasskey } from '@/lib/hooks/use-passkey';
import { useSession } from 'next-auth/react';
import { toast } from '@lorrigo/ui/components';

interface PasskeySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
  onConfigure: () => void;
}

export function PasskeySetupModal({ 
  isOpen, 
  onClose, 
  onSkip, 
  onConfigure 
}: PasskeySetupModalProps) {
  const { data: session } = useSession();
  const { registerPasskey, isPasskeySupported, isLoading } = usePasskey();
  const [step, setStep] = useState<'intro' | 'configuring' | 'success'>('intro');

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('intro');
    }
  }, [isOpen]);

  const handleConfigure = async () => {
    if (!session?.user?.id) {
      toast.error('User session not found');
      return;
    }

    setStep('configuring');
    
    try {
      const success = await registerPasskey(session.user.id);
      if (success) {
        setStep('success');
        setTimeout(() => {
          onConfigure();
        }, 2000);
      } else {
        setStep('intro');
      }
    } catch (error) {
      setStep('intro');
      toast.error('Failed to configure passkey. Please try again.');
    }
  };

  const handleSkip = () => {
    // Store skip preference in localStorage with timestamp
    localStorage.setItem('passkey_skip_until', new Date().toISOString());
    onSkip();
  };

  const handleClose = () => {
    // Don't allow closing by clicking outside or X button
    // This forces user to make a choice
    return;
  };

  if (!isPasskeySupported()) {
    return null; // Don't show modal if passkeys aren't supported
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={handleClose}>
        {step === 'intro' && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Fingerprint className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <DialogTitle className="text-xl font-semibold">
                Secure Your Account with Passkeys
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-muted-foreground">
                Add an extra layer of security to your account with passkeys. 
                Sign in faster and more securely with biometrics or PIN.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start space-x-3 rounded-lg border p-3">
                  <Shield className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-medium text-sm">Enhanced Security</h4>
                    <p className="text-xs text-muted-foreground">
                      Phishing-resistant authentication
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 rounded-lg border p-3">
                  <Zap className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-sm">Faster Sign-in</h4>
                    <p className="text-xs text-muted-foreground">
                      No more typing passwords
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={handleConfigure}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Configuring...' : 'Configure Passkey'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleSkip}
                  className="w-full"
                >
                  Skip for Now
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                You can configure passkeys anytime in your account settings
              </p>
            </div>
          </>
        )}

        {step === 'configuring' && (
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Fingerprint className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              Setting Up Your Passkey
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Please follow the prompts on your device to create your passkey.
              This may include using your fingerprint, face ID, or PIN.
            </DialogDescription>
          </DialogHeader>
        )}

        {step === 'success' && (
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl font-semibold text-green-600">
              Passkey Configured Successfully!
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Your account is now secured with passkeys. You can use biometrics 
              or PIN to sign in on this device.
            </DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
} 