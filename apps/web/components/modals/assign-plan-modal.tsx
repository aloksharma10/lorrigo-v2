'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  toast,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@lorrigo/ui/components';
import { X, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { usePlanOperations } from '@/lib/apis/plans';

interface Plan {
  id: string;
  name: string;
  code: string;
  description: string;
  isDefault: boolean;
}

interface AssignPlanModalProps {
  planId?: string;
  onClose: () => void;
}

const formSchema = z.object({
  planId: z.string().min(1, 'Please select a plan'),
  userId: z.string().min(1, 'Please enter a user ID').trim(),
});

type FormData = z.infer<typeof formSchema>;

export function AssignPlanModal({ planId, onClose }: AssignPlanModalProps) {
  const { getPlansQuery, assignPlanToUser } = usePlanOperations();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planId: planId || '',
      userId: '',
    },
  });

  // Set initial plan if provided
  useEffect(() => {
    if (planId) {
      form.setValue('planId', planId);
    }
  }, [planId, form]);

  // Use cached data - no unnecessary refetch calls
  const plans: Plan[] = getPlansQuery.data || [];
  const isLoadingPlans = getPlansQuery.isLoading;
  const isAssigning = assignPlanToUser.isPending;

  const handleSubmit = async (data: FormData) => {
    try {
      await assignPlanToUser.mutateAsync({
        planId: data.planId,
        userId: data.userId,
      });
      toast.success('Plan assigned to user successfully');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to assign plan to user');
    }
  };

  return (
    <Card className="mx-auto flex w-full max-w-md flex-col">
      {/* Fixed Header */}
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Assign Plan to User</CardTitle>
            <CardDescription>Select a plan and enter the user ID to assign</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Scrollable Content */}
      <CardContent className="flex-1 overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Plan</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingPlans}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={isLoadingPlans ? 'Loading plans...' : 'Choose a plan'}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{plan.name}</span>
                            <span className="text-muted-foreground text-xs">{plan.code}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isLoadingPlans && (
                    <div className="text-muted-foreground mt-2 flex items-center text-sm">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading plans...
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter user ID" disabled={isAssigning} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>

      {/* Fixed Footer */}
      <CardFooter className="bg-muted/20 flex-shrink-0 border-t">
        <div className="flex w-full justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isAssigning || !form.formState.isValid}
          >
            {isAssigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Plan'
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
