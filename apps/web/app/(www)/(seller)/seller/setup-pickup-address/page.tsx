'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useModal } from '@/modal/modal-provider';
import { useHubOperations } from '@/lib/apis/hub';
import { CardStack, StepContent } from '@/components/ui/card-stack';
import { MapPin, Building2, CreditCard, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@lorrigo/ui/components';

export default function SetupPickupAddressPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openModal } = useModal();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const { getHubsQueryLegacy } = useHubOperations();
  const { data: hubsData, refetch: refetchHubs } = getHubsQueryLegacy;

  const callbackUrl = searchParams.get('callbackUrl') || '/seller/dashboard';
  const hasPrimaryPickupAddress = session?.user?.hasPrimaryPickupAddress || false;

  useEffect(() => {
    // If user already has primary pickup address, redirect them
    if (status === 'authenticated' && hasPrimaryPickupAddress) {
      setIsRedirecting(true);
      router.push(callbackUrl);
    }
  }, [status, hasPrimaryPickupAddress, router, callbackUrl]);

  // Handle creating pickup address
  const handleCreatePickupAddress = () => {
    openModal('seller:add-pickup-location', {
      title: 'Create Your First Pickup Address',
      hasPrimaryPickupAddress: false,
      onSubmit: async (data: any) => {
        await refetchHubs();
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            hasPrimaryPickupAddress: true,
          },
        });
        setCompletedSteps((prev) => [...prev, 'pickup-address']);
      },
    });
  };

  // Handle step completion
  const handleStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => [...prev, stepId]);
  };

  // Define setup cards
  const setupCards = [
    {
      id: 1,
      name: 'Primary Pickup Address',
      designation: 'Required • Step 1 of 4',
      content: (
        <StepContent onComplete={handleCreatePickupAddress} isCompleted={hasPrimaryPickupAddress || completedSteps.includes('pickup-address')}>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Primary Pickup Address</h3>
                <p className="text-sm text-gray-600">Set up your main pickup location</p>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">This will be your main pickup location for all shipments. You can add more addresses later.</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">What you'll need:</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Facility name and contact person</li>
                <li>• Complete address with pincode</li>
                <li>• Contact phone number</li>
                <li>• Return address (if different)</li>
              </ul>
            </div>

            {hasPrimaryPickupAddress && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Primary pickup address is already set up!</span>
              </div>
            )}
          </div>
        </StepContent>
      ),
    },
    {
      id: 2,
      name: 'KYC Verification',
      designation: 'Required • Step 2 of 4',
      content: (
        <StepContent onComplete={() => handleStepComplete('kyc')} isCompleted={completedSteps.includes('kyc')}>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Shield className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">KYC Verification</h3>
                <p className="text-sm text-gray-600">Complete your verification</p>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">This step will be available soon. For now, you can proceed to the next step.</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Coming Soon:</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Business verification documents</li>
                <li>• Identity verification</li>
                <li>• Address verification</li>
              </ul>
            </div>
          </div>
        </StepContent>
      ),
    },
    {
      id: 3,
      name: 'Bank Account Details',
      designation: 'Required • Step 3 of 4',
      content: (
        <StepContent onComplete={() => handleStepComplete('bank-details')} isCompleted={completedSteps.includes('bank-details')}>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Bank Account Details</h3>
                <p className="text-sm text-gray-600">Add your bank account</p>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">This step will be available soon. For now, you can proceed to the next step.</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Coming Soon:</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Bank account number</li>
                <li>• IFSC code</li>
                <li>• Account holder name</li>
              </ul>
            </div>
          </div>
        </StepContent>
      ),
    },
    {
      id: 4,
      name: 'Business Profile',
      designation: 'Optional • Step 4 of 4',
      content: (
        <StepContent onComplete={() => handleStepComplete('business-profile')} isCompleted={completedSteps.includes('business-profile')}>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Business Profile</h3>
                <p className="text-sm text-gray-600">Complete your profile</p>
              </div>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">This step is optional. You can complete it later from your settings.</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Optional Information:</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Business logo</li>
                <li>• Business description</li>
                <li>• Social media links</li>
              </ul>
            </div>
          </div>
        </StepContent>
      ),
    },
  ];

  // Show loading while checking session
  if (status === 'loading' || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">{isRedirecting ? 'Redirecting...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="container mx-auto flex flex-1 flex-col items-center justify-center space-y-8">
      <CardStack items={setupCards} offset={15} scaleFactor={0.08} />
    </div>
    //   <div className="flex w-full min-h-[calc(100vh-10rem)] flex-col items-center justify-center">
    //     {/* <div className="text-center">
    //       <div className="mb-8">
    //         <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Setup Your Account</h1>
    //         <p className="mt-2 text-gray-600">Complete these steps to get started with Lorrigo</p>
    //       </div>

    //       <div className="flex justify-center"> */}

    //       {/* </div>

    //       <div className="mt-8 text-sm text-gray-500">
    //         <p>Cards will automatically rotate every 5 seconds</p>
    //         <p className="mt-1">Click "Complete Step" to mark a step as finished</p>
    //       </div>
    //     </div> */}
    //  </div>
  );
}
