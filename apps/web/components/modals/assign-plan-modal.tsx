'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';

import {
  toast,
  Button,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@lorrigo/ui/components';
import { X, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { usePlanOperations } from '@/lib/apis/plans';
import { cn } from '@lorrigo/ui/lib/utils';

interface Plan {
  id: string;
  name: string;
  code: string;
  description: string;
  isDefault: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface AssignPlanModalProps {
  planId?: string;
  userId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const formSchema = z.object({
  planId: z.string().min(1, 'Please select a plan'),
  userId: z.string().min(1, 'Please select a user'),
});

type FormData = z.infer<typeof formSchema>;

export function AssignPlanModal({ planId, userId, onClose, onSuccess }: AssignPlanModalProps) {
  const { getPlansQuery, assignPlanToUser, getUsersQuery } = usePlanOperations();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planId: planId || '',
      userId: userId || '',
    },
  });

  // Set initial values if provided
  useEffect(() => {
    if (planId) {
      form.setValue('planId', planId);
    }
    if (userId) {
      form.setValue('userId', userId);
    }
  }, [planId, userId, form]);

  const { data: users = [], isLoading: isLoadingUsers } = getUsersQuery({
    queryKey: ['users', debouncedSearchQuery],
    search: debouncedSearchQuery,
    enabled: true,
  });

  // Fetch plans
  const { data: plans = [], isLoading: isLoadingPlans } = getPlansQuery(['plans']);

  const isAssigning = assignPlanToUser.isPending;

  const handleSubmit = async (data: FormData) => {
    try {
      await assignPlanToUser.mutateAsync({
        planId: data.planId,
        userId: data.userId,
      });
      toast.success('Plan assigned to user successfully');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to assign plan to user');
    }
  };

  // Get selected user details
  const selectedUser = users.find((user: User) => user.id === form.watch('userId'));

  return (
    <Card className="mx-auto flex w-full max-w-md flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Assign Plan to User</CardTitle>
            <CardDescription>Select a plan and user to assign</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                      {plans.map((plan: any) => (
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
                <FormItem className="flex flex-col">
                  <FormLabel>Select User</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className={cn(
                            'w-full justify-between text-left flex',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value && selectedUser
                            ? `${selectedUser.name} (${selectedUser.phone})`
                            : 'Select user'}
                          <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search users by name, email, or phone..."
                          value={searchQuery}
                          onValueChange={setSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingUsers ? (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Searching users...
                              </div>
                            ) : searchQuery ? (
                              `No users found for "${searchQuery}"`
                            ) : (
                              'Start typing to search users...'
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {users.map((user: User) => (
                              <CommandItem
                                key={user.id}
                                value={`${user.name} ${user.email} ${user.phone}`} // This helps with built-in filtering
                                onSelect={() => {
                                  form.setValue('userId', user.id);
                                  setOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    user.id === field.value ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{user.name}</span>
                                  <span className="text-muted-foreground text-xs">{user.email}</span>
                                  <span className="text-muted-foreground text-xs">{user.phone}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>

      <CardFooter className="bg-muted/20 flex-shrink-0 border-t">
        <div className="flex w-full justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isAssigning || !form.formState.isValid}
            isLoading={isAssigning}
          >
            Assign Plan
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}