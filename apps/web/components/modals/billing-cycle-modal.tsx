'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, Calendar, Settings, AlertTriangle, Users, Clock, CheckCircle, FileText, CalendarRange, List, Search, Loader2, User } from 'lucide-react';
import {
  Modal,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  AlertTitle,
  Separator,
  Checkbox,
  toast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@lorrigo/ui/components';
import { useBillingOperations, type BillingCycle } from '@/lib/apis/billing';
import { currencyFormatter } from '@lorrigo/utils';
import { useQuery } from '@tanstack/react-query';
import { api as axios } from '@/lib/apis/axios';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useUserOperations, User as UserType } from '@/lib/apis/users';

interface UserSearchProps {
  onSelect: (user: UserType) => void;
  preselectedUserId?: string;
  preselectedUserName?: string;
}

// User search component
function UserSearch({ onSelect, preselectedUserId, preselectedUserName }: UserSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearchValue = useDebounce(searchValue, 300);

  // Use the existing hook for user operations
  const { usersQuery } = useUserOperations({
    search: debouncedSearchValue.length >= 2 ? debouncedSearchValue : undefined,
    limit: 10,
  });

  const isLoading = usersQuery.isLoading;
  const users = usersQuery.data?.data || [];

  // Handle user selection
  const handleSelectUser = (user: UserType) => {
    onSelect(user);
    setOpen(false);
  };

  return (
    <div className="flex flex-col space-y-2">
      <Label>Select User</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            {preselectedUserId ? (
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>{preselectedUserName || preselectedUserId}</span>
              </div>
            ) : searchValue ? (
              <div className="flex items-center">
                <Search className="mr-2 h-4 w-4" />
                <span>{searchValue}</span>
              </div>
            ) : (
              <div className="text-muted-foreground flex items-center">
                <Search className="mr-2 h-4 w-4" />
                <span>Search for a user...</span>
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput placeholder="Search users..." value={searchValue} onValueChange={setSearchValue} className="h-9" />
            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="text-primary h-6 w-6 animate-spin" />
                </div>
              )}
              <CommandEmpty>{debouncedSearchValue.length >= 2 ? 'No users found.' : 'Type at least 2 characters to search'}</CommandEmpty>
              <CommandGroup heading="Users">
                {users.map((user) => (
                  <CommandItem key={user.id} value={user.id} onSelect={() => handleSelectUser(user)}>
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-muted-foreground text-xs">{user.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface BillingCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  onCycleCreated?: () => void;
}

export function BillingCycleModal({ isOpen, onClose, userId: preselectedUserId, userName: preselectedUserName, onCycleCreated }: BillingCycleModalProps) {
  const [activeTab, setActiveTab] = useState<string>('cycle');
  const [selectedUserId, setSelectedUserId] = useState(preselectedUserId || '');
  const [selectedUserName, setSelectedUserName] = useState(preselectedUserName || '');
  const [cycleType, setCycleType] = useState<string>('MONTHLY');
  const [cycleDays, setCycleDays] = useState(30);
  const [confirmCreation, setConfirmCreation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual billing state
  const [manualBillingType, setManualBillingType] = useState<'awbs' | 'dateRange'>('awbs');
  const [awbsList, setAwbsList] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { createBillingCycle, updateBillingCycle, generateManualBilling } = useBillingOperations();

  // Use the billingCyclesQuery from useBillingOperations with proper parameters
  const { billingCyclesQuery } = useBillingOperations({
    billingCycles: {
      page: 1,
      pageSize: 100,
      userId: selectedUserId,
    },
  });

  // Fetch existing cycles for the user
  const { data: billingCyclesData, isLoading: cyclesLoading } = billingCyclesQuery;
  const existingCycles = billingCyclesData?.data || [];

  // Handle user selection from search
  const handleUserSelect = (user: UserType) => {
    setSelectedUserId(user.id);
    setSelectedUserName(user.name);
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(preselectedUserId || '');
      setSelectedUserName(preselectedUserName || '');
      setCycleType('MONTHLY');
      setCycleDays(30);
      setConfirmCreation(false);
      setAwbsList('');
      setDateRange({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      });
      setActiveTab('cycle');
    }
  }, [isOpen, preselectedUserId, preselectedUserName]);

  // adjust days when type changes
  useEffect(() => {
    const map: Record<string, number> = { DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 15, MONTHLY: 30 };
    if (cycleType !== 'CUSTOM') {
      setCycleDays(map[cycleType] || 30);
    }
  }, [cycleType]);

  const validateCycleForm = (): string | null => {
    if (!selectedUserId) {
      return 'Please select a user';
    }

    if (cycleDays < 1 || cycleDays > 365) {
      return 'Cycle days must be between 1 and 365';
    }

    if (!confirmCreation) {
      return 'Please confirm that you want to create a billing cycle';
    }

    return null;
  };

  const validateManualBillingForm = (): string | null => {
    if (!selectedUserId) {
      return 'Please select a user';
    }

    if (manualBillingType === 'awbs' && (!awbsList || awbsList.trim() === '')) {
      return 'Please enter at least one AWB';
    }

    if (manualBillingType === 'dateRange') {
      if (!dateRange.startDate || !dateRange.endDate) {
        return 'Please select both start and end dates';
      }

      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);

      if (end < start) {
        return 'End date cannot be before start date';
      }
    }

    return null;
  };

  // Handle cycle creation
  const handleCycleSubmit = async () => {
    const validationError = validateCycleForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createBillingCycle.mutateAsync({
        userId: selectedUserId,
        cycleType,
        cycleDays,
      });

      toast.success('Billing cycle created successfully');
      onCycleCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating billing cycle:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle manual billing generation
  const handleManualBillingSubmit = async () => {
    const validationError = validateManualBillingForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const params = {
        userId: selectedUserId,
        ...(manualBillingType === 'awbs'
          ? { awbs: awbsList.split(',').map((awb) => awb.trim()) }
          : { startDate: dateRange.startDate, endDate: dateRange.endDate }),
      };

      const result = await generateManualBilling.mutateAsync(params);

      toast.success('Manual billing generated successfully');
      onCycleCreated?.();
      onClose();
    } catch (error) {
      console.error('Error generating manual billing:', error);
      toast.error('Failed to generate manual billing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-3 w-3" />;
      case 'PROCESSING':
        return <RotateCcw className="h-3 w-3 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="h-3 w-3" />;
      case 'FAILED':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const activeCycles = existingCycles?.filter((cycle) => cycle.is_active) || [];
  const hasActiveCycle = activeCycles.length > 0;

  return (
    <div className="flex h-[80vh] flex-col">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center gap-3">
          <RotateCcw className="text-primary h-6 w-6" />
          <div>
            <h2 className="text-xl font-semibold">Billing Management</h2>
            <p className="text-muted-foreground text-sm">Create automated billing cycles or generate manual billing</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="cycle">
              <Calendar className="mr-2 h-4 w-4" />
              Billing Cycle
            </TabsTrigger>
            <TabsTrigger value="manual">
              <FileText className="mr-2 h-4 w-4" />
              Manual Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cycle">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Create New Cycle */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="h-4 w-4" />
                      Create New Billing Cycle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* User Selection */}
                    {preselectedUserId ? (
                      <div className="flex items-center justify-between rounded border bg-blue-50 p-3">
                        <div>
                          <p className="font-medium">{selectedUserName}</p>
                          <p className="text-muted-foreground text-sm">User ID: {selectedUserId}</p>
                        </div>
                        <Badge variant="secondary">Pre-selected</Badge>
                      </div>
                    ) : (
                      <UserSearch onSelect={handleUserSelect} preselectedUserId={preselectedUserId} preselectedUserName={preselectedUserName} />
                    )}

                    <div className="grid gap-2">
                      <Label>Cycle Type</Label>
                      <Select value={cycleType} onValueChange={setCycleType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cycle type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      {cycleType === 'CUSTOM' && (
                        <div className="mt-2">
                          <Label htmlFor="cycle-days">Custom Cycle Days</Label>
                          <Input type="number" id="cycle-days" value={cycleDays} onChange={(e) => setCycleDays(parseInt(e.target.value))} min={1} />
                        </div>
                      )}
                      <p className="text-muted-foreground mt-1 text-xs">Cycle will run every {cycleDays} day(s)</p>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox id="confirm-creation" checked={confirmCreation} onCheckedChange={(val) => setConfirmCreation(!!val)} />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="confirm-creation"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Create Automatic Billing Cycle
                        </Label>
                        <p className="text-muted-foreground text-xs">
                          This will create an automated billing cycle that processes billing every {cycleDays} days
                        </p>
                      </div>
                    </div>

                    {hasActiveCycle && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          This user already has {activeCycles.length} active billing cycle(s). Creating a new cycle will run alongside existing ones.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button onClick={handleCycleSubmit} disabled={isSubmitting || !selectedUserId || !confirmCreation} className="w-full">
                      {isSubmitting ? 'Creating Cycle...' : 'Create Billing Cycle'}
                    </Button>
                  </CardContent>
                </Card>

                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertTitle>How Billing Cycles Work</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>• Automatic billing cycles process unbilled orders at regular intervals</p>
                    <p>• Orders are included based on their shipment/delivery dates</p>
                    <p>• Weight disputes are automatically detected and held for review</p>
                    <p>• Billing records are created with proper audit trails</p>
                    <p>• You can have multiple cycles running for different time periods</p>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Right Column - Existing Cycles */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <RotateCcw className="h-4 w-4" />
                      Existing Billing Cycles
                      {selectedUserId && (
                        <Badge variant="outline" className="ml-auto">
                          {existingCycles?.length || 0} cycles
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cyclesLoading ? (
                      <div className="py-8 text-center">
                        <RotateCcw className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                        <p className="text-muted-foreground mt-2 text-sm">Loading cycles...</p>
                      </div>
                    ) : !selectedUserId ? (
                      <div className="py-8 text-center">
                        <Users className="text-muted-foreground mx-auto h-8 w-8" />
                        <p className="text-muted-foreground mt-2 text-sm">Select a user to view their billing cycles</p>
                      </div>
                    ) : existingCycles && existingCycles.length > 0 ? (
                      <div className="space-y-3">
                        {existingCycles.map((cycle) => (
                          <Card key={cycle.id} className="group relative border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                {getStatusIcon(cycle.status)}
                                Cycle {cycle.code.slice(-6)}
                              </CardTitle>
                              <Badge className={`border ${getStatusColor(cycle.status)}`}>{cycle.status}</Badge>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Created:</span>
                                  <p className="font-medium">{new Date(cycle.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Next Cycle:</span>
                                  <p className="font-medium">{cycle.cycle_end_date ? new Date(cycle.cycle_end_date).toLocaleDateString() : 'Not scheduled'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total Orders:</span>
                                  <p className="font-medium">{cycle.total_orders}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total Amount:</span>
                                  <p className="font-medium">{currencyFormatter(cycle.total_amount)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Processed:</span>
                                  <p className="font-medium text-green-600">{cycle.processed_orders}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Failed:</span>
                                  <p className="font-medium text-red-600">{cycle.failed_orders}</p>
                                </div>
                              </div>
                            </CardContent>
                            <div className="absolute right-2 top-2 hidden gap-2 group-hover:flex">
                              <Button
                                size="sm"
                                variant={cycle.is_active ? 'secondary' : 'default'}
                                onClick={async () => {
                                  try {
                                    await updateBillingCycle.mutateAsync({
                                      id: cycle.id,
                                      data: {
                                        // Toggle the active status
                                        cycleDays: cycle.cycle_days,
                                        cycleType: cycle.cycle_type,
                                        userId: cycle.user_id,
                                      },
                                    });
                                  } catch (error) {
                                    console.error('Error updating billing cycle:', error);
                                  }
                                }}
                              >
                                {cycle.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const nextDate = prompt('Enter next cycle date (YYYY-MM-DD)', cycle.cycle_end_date?.slice(0, 10) || '');
                                  if (nextDate) {
                                    try {
                                      await updateBillingCycle.mutateAsync({
                                        id: cycle.id,
                                        data: {
                                          startDate: nextDate,
                                          cycleDays: cycle.cycle_days,
                                          cycleType: cycle.cycle_type,
                                          userId: cycle.user_id,
                                        },
                                      });
                                    } catch (error) {
                                      console.error('Error updating billing cycle date:', error);
                                    }
                                  }
                                }}
                              >
                                Set Next Date
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <Calendar className="text-muted-foreground mx-auto h-8 w-8" />
                        <p className="text-muted-foreground mt-2 text-sm">No billing cycles found for this user</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Generate Manual Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Selection */}
                {preselectedUserId ? (
                  <div className="flex items-center justify-between rounded border bg-blue-50 p-3">
                    <div>
                      <p className="font-medium">{selectedUserName}</p>
                      <p className="text-muted-foreground text-sm">User ID: {selectedUserId}</p>
                    </div>
                    <Badge variant="secondary">Pre-selected</Badge>
                  </div>
                ) : (
                  <UserSearch onSelect={handleUserSelect} preselectedUserId={preselectedUserId} preselectedUserName={preselectedUserName} />
                )}

                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="awbs-option"
                        name="billing-type"
                        checked={manualBillingType === 'awbs'}
                        onChange={() => setManualBillingType('awbs')}
                      />
                      <Label htmlFor="awbs-option">By AWB List</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="date-option"
                        name="billing-type"
                        checked={manualBillingType === 'dateRange'}
                        onChange={() => setManualBillingType('dateRange')}
                      />
                      <Label htmlFor="date-option">By Date Range</Label>
                    </div>
                  </div>

                  {manualBillingType === 'awbs' ? (
                    <div className="space-y-2">
                      <Label htmlFor="awbs-list">AWB List (comma separated)</Label>
                      <Textarea id="awbs-list" placeholder="AWB1, AWB2, AWB3..." value={awbsList} onChange={(e) => setAwbsList(e.target.value)} rows={5} />
                      <p className="text-muted-foreground text-xs">Enter AWBs separated by commas. Billing will be generated only for these AWBs.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                      <p className="text-muted-foreground col-span-2 text-xs">Billing will be generated for all eligible shipments within this date range.</p>
                    </div>
                  )}

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Manual billing will generate charges for all eligible shipments that match your criteria. This action cannot be undone.
                    </AlertDescription>
                  </Alert>

                  <Button onClick={handleManualBillingSubmit} disabled={isSubmitting || !selectedUserId} className="w-full">
                    {isSubmitting ? 'Generating...' : 'Generate Manual Billing'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Alert className="mt-6">
              <Settings className="h-4 w-4" />
              <AlertTitle>About Manual Billing</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>• Manual billing allows you to generate charges for specific AWBs or date ranges</p>
                <p>• This is useful for billing exceptions or missed shipments</p>
                <p>• Weight disputes will still be detected and processed</p>
                <p>• Billing records will be marked as manually generated</p>
                <p>• If a shipment has already been billed, it will only be updated if there are changes</p>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t p-6">
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
