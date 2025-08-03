import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '../apis/axios';

export const usePasskeySetup = () => {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [hasConfigured, setHasConfigured] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!session?.user?.id || isChecking || hasConfigured || hasCheckedRef.current) return;

    // Check if user already has passkeys configured
    const checkPasskeyStatus = async () => {
      hasCheckedRef.current = true;
      setIsChecking(true);
      try {
        const data = await api.get(`/auth/passkey/${session.user.id}`);
        if ((data as any).success && (data as any).passkeys && (data as any).passkeys.length > 0) {
          setHasConfigured(true);
          return;
        }
      } catch (error) {
        console.error('Error checking passkey status:', error);
      } finally {
        setIsChecking(false);
      }

      // Check if user has skipped recently
      const skipUntil = localStorage.getItem('passkey_skip_until');
      if (skipUntil) {
        const skipDate = new Date(skipUntil);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        if (skipDate < tomorrow) {
          // Skip period has expired, show modal again
          setShowModal(true);
        }
      } else {
        // First time user, show modal
        setShowModal(true);
      }
    };

    checkPasskeyStatus();
  }, [session?.user?.id]); // Removed isChecking and hasConfigured from dependencies

  const handleClose = () => {
    // Don't allow closing - user must make a choice
    return;
  };

  const handleSkip = () => {
    setShowModal(false);
    // Store skip preference for 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    localStorage.setItem('passkey_skip_until', tomorrow.toISOString());
  };

  const handleConfigure = () => {
    setShowModal(false);
    setHasConfigured(true);
    // Remove skip preference since user configured
    localStorage.removeItem('passkey_skip_until');
  };

  const resetSkipPreference = () => {
    localStorage.removeItem('passkey_skip_until');
    hasCheckedRef.current = false; // Reset the ref to allow checking again
    setShowModal(true);
  };

  return {
    showModal,
    hasConfigured,
    handleClose,
    handleSkip,
    handleConfigure,
    resetSkipPreference,
  };
}; 