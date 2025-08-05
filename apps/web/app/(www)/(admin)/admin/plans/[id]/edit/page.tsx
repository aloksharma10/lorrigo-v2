'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, toast, Skeleton } from '@lorrigo/ui/components';
import { ArrowLeft } from 'lucide-react';
import { usePlanOperations } from '@/lib/apis/plans';
import { EnhancedCreatePlanForm } from '@/components/plan/enhanced-create-plan';

export default function EditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const { getPlanById } = usePlanOperations();

  // Fetch the specific plan
  const { data: plan, isLoading, error } = getPlanById(planId);

  // Handle back button
  const handleBack = () => {
    router.push('/admin/plans');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Plans
          </Button>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Plans
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Plan</CardTitle>
            <CardDescription>{(error as Error)?.message || 'Failed to load plan details'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <EnhancedCreatePlanForm planData={plan} isEditing={true} />;
}
