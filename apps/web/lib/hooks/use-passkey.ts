import { useState } from 'react';
import { 
  startRegistration, 
  startAuthentication,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON
} from '@simplewebauthn/browser';
import { api } from '@/lib/apis/axios';
import { toast } from '@lorrigo/ui/components';

export interface Passkey {
  id: string;
  deviceType: string;
  createdAt: string;
  lastUsedAt: string;
  transports: string[];
}

export const usePasskey = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Register a new passkey
  const registerPasskey = async (userId: string) => {
    setIsLoading(true);
    try {
      // Get registration options from server
      const optionsResponse = await api.post(`/auth/passkey/register/${userId}/options`);
      console.log(optionsResponse);
      
      if (!optionsResponse.success) {
        throw new Error('Failed to get registration options');
      }

      // Start registration on the client
      const credential = await startRegistration(optionsResponse.options);

      // Verify registration with server
      const verificationResponse = await api.post(`/auth/passkey/register/${userId}/verify`, {
        credential,
        expectedChallenge: optionsResponse.options.challenge,
      });

      if (verificationResponse.success) {
        toast.success('Passkey registered successfully');
        return true;
      } else {
        throw new Error(verificationResponse.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Passkey registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to register passkey');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Authenticate with passkey
  const authenticateWithPasskey = async (email: string) => {
    setIsLoading(true);
    try {
      // Get authentication options from server
      const optionsResponse = await api.post('/auth/passkey/authenticate/options', { email });
      
      if (!optionsResponse.success) {
        throw new Error('Failed to get authentication options');
      }

      // Start authentication on the client
      const credential = await startAuthentication(optionsResponse.options);

      // Verify authentication with server
      const verificationResponse = await api.post('/auth/passkey/authenticate/verify', {
        email,
        credential,
      });

      if (verificationResponse.success) {
        toast.success('Authentication successful');
        return verificationResponse 
      } else {
        throw new Error(verificationResponse.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Passkey authentication error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to authenticate with passkey');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Get user's passkeys
  const getUserPasskeys = async (userId: string): Promise<Passkey[]> => {
    try {
      const response = await api.get(`/auth/passkey/${userId}`);
      if (response && typeof response === 'object' && 'status' in response && response.status === 200) {
        const data = (response as any).data;
        if (data.success) {
          return data.passkeys;
        }
      }
      return [];
    } catch (error) {
      console.error('Error fetching passkeys:', error);
      return [];
    }
  };

  // Delete a passkey
  const deletePasskey = async (userId: string, passkeyId: string) => {
    try {
      const response = await api.delete(`/auth/passkey/${userId}/${passkeyId}`);
      if (response.success) {
        toast.success('Passkey deleted successfully');
        return true;
      } else {
        throw new Error((response as any).data.message || 'Failed to delete passkey');
      }
    } catch (error) {
      console.error('Error deleting passkey:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete passkey');
      return false;
    }
  };

  // Check if passkeys are supported
  const isPasskeySupported = () => {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential && 
           typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
           typeof PublicKeyCredential.isConditionalMediationAvailable === 'function';
  };

  return {
    registerPasskey,
    authenticateWithPasskey,
    getUserPasskeys,
    deletePasskey,
    isPasskeySupported,
    isLoading,
  };
}; 