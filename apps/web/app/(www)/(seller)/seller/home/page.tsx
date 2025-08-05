'use client';

import {
  IconClockPause,
  IconDeviceIpadExclamation,
  IconTruck,
  IconTruckDelivery,
  IconTruckReturn,
  IconCurrencyRupee,
  IconUserCheck,
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
} from '@tabler/icons-react';
import { SectionCards } from '@/components/section-cards';
import { CardItems } from '@/components/card-items';
import { Card, CardHeader, CardTitle, CardContent } from '@lorrigo/ui/components';
import { UpcomingPickups } from './components/upcoming-pickups';
import { useShipmentAnalysis } from '@/lib/hooks/use-shipment-analysis';
import { Skeleton } from '@lorrigo/ui/components/skeleton';

// Icon mapping for dynamic icons
const iconMap = {
  truck: IconTruck,
  'truck-delivery': IconTruckDelivery,
  'truck-return': IconTruckReturn,
  'clock-pause': IconClockPause,
  'device-tablet-exclamation': IconDeviceIpadExclamation,
  'currency-rupee': IconCurrencyRupee,
  'user-check': IconUserCheck,
  'alert-triangle': IconAlertTriangle,
  'check-circle': IconCircleCheck,
  'x-circle': IconCircleX,
};

// Loading skeleton for summary cards
const SummarySkeleton = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
    ))}
  </div>
);

// Loading skeleton for action items
const ActionItemsSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-8 w-[80px]" />
        <Skeleton className="h-3 w-[100px]" />
      </div>
    ))}
  </div>
);

export default function Home() {
  // Fetch analytics data using unified hook
  const { home, actionItems, upcomingPickups, kycStatus } = useShipmentAnalysis();

  // Extract data from API responses
  const summary = home.data?.summary || [];
  const actionItemsList = actionItems.data?.actionItems || [];
  const upcomingPickupsList = upcomingPickups.data?.upcomingPickups || [];
  const kycStatusData = kycStatus.data?.kycStatus;

  // Handle loading states
  const isLoading = home.isLoading || actionItems.isLoading || upcomingPickups.isLoading || kycStatus.isLoading;

  // Handle errors
  const hasError = home.error || actionItems.error || upcomingPickups.error || kycStatus.error;

  if (hasError) {
    return (
      <div className="flex flex-1 flex-col gap-2 space-y-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <IconAlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Error Loading Analytics</h3>
            <p className="text-gray-600">There was an error loading the analytics data. Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="scroll-m-20 text-lg font-semibold tracking-tight md:text-xl">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {kycStatus.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-8 w-[80px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            ) : (
              <>
                <CardItems
                  title="Complete your KYC"
                  value={kycStatusData?.isCompleted ? 'Completed' : `${kycStatusData?.completionPercentage || 0}%`}
                  description={kycStatusData?.nextAction || 'Complete your KYC to start selling on Lorrigo'}
                  icon={kycStatusData?.isCompleted ? IconCircleCheck : IconUserCheck}
                  className={kycStatusData?.isCompleted ? 'bg-green-100' : 'bg-yellow-100 dark:text-gray-600'}
                />
                <CardItems
                  title="Getting Started"
                  value={kycStatusData?.isCompleted ? 'Ready' : 'Pending'}
                  description={kycStatusData?.isCompleted ? "You're all set to start selling" : 'Complete KYC to get started'}
                  icon={kycStatusData?.isCompleted ? IconCircleCheck : IconClockPause}
                  className={kycStatusData?.isCompleted ? 'bg-green-100' : 'bg-gray-100 dark:text-gray-600'}
                />
              </>
            )}
          </CardContent>
        </Card>
        {home.isLoading ? (
          <div className="col-span-2">
            <SummarySkeleton />
          </div>
        ) : (
          <SectionCards
            items={summary.map((item) => ({
              ...item,
              icon: iconMap[item.icon as keyof typeof iconMap] || IconTruck,
            }))}
            title="Summary"
            className="col-span-2 p-4"
          />
        )}
      </div>
      {actionItems.isLoading ? (
        <Card className="p-4">
          <CardHeader>
            <CardTitle className="scroll-m-20 text-lg font-semibold tracking-tight md:text-xl">Actions Needing Your Attention Today</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionItemsSkeleton />
          </CardContent>
        </Card>
      ) : (
        <SectionCards
          items={actionItemsList.map((item) => ({
            ...item,
            icon: iconMap[item.icon as keyof typeof iconMap] || IconTruck,
          }))}
          title="Actions Needing Your Attention Today"
          className="p-4"
        />
      )}
      {upcomingPickups.isLoading ? (
        <Card className="p-4">
          <CardHeader>
            <CardTitle className="scroll-m-20 text-lg font-semibold tracking-tight md:text-xl">Upcoming Pickups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <UpcomingPickups data={upcomingPickupsList} />
      )}
    </div>
  );
}
