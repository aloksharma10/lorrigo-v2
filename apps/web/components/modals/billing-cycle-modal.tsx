'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Calendar,
  Settings,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle,
} from 'lucide-react';
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
} from '@lorrigo/ui/components';
import { useBillingOperations, type BillingCycle } from '@/lib/apis/billing';
import { currencyFormatter } from '@lorrigo/utils';

interface BillingCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  onCycleCreated?: () => void;
}

export function BillingCycleModal({
  isOpen,
  onClose,
  // userId: preselectedUserId,
  // userName: preselectedUserName,

  userId: preselectedUserId,
  userName: preselectedUserName,

  onCycleCreated,
}: BillingCycleModalProps) {
  const [selectedUserId, setSelectedUserId] = useState(
    preselectedUserId || 'cmcn8zp3s0000h05kwr5fxcj7'
  );
  const [selectedUserName, setSelectedUserName] = useState(preselectedUserName || 'Alok');
  const [cycleType, setCycleType] = useState<string>('MONTHLY');
  const [cycleDays, setCycleDays] = useState(30);
  const [confirmCreation, setConfirmCreation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createBillingCycle, getBillingCyclesQuery, updateBillingCycle } = useBillingOperations();

  // Fetch existing cycles for the user
  const { data: existingCycles, isLoading: cyclesLoading } = getBillingCyclesQuery(selectedUserId);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(preselectedUserId || '');
      setSelectedUserName(preselectedUserName || '');
      setCycleType('MONTHLY');
      setCycleDays(30);
      setConfirmCreation(false);
    }
  }, [isOpen, preselectedUserId, preselectedUserName]);

  // adjust days when type changes
  useEffect(() => {
    const map: Record<string, number> = { DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 15, MONTHLY: 30 };
    if (cycleType !== 'CUSTOM') {
      setCycleDays(map[cycleType] || 30);
    }
  }, [cycleType]);

  const validateForm = (): string | null => {
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

  const handleSubmit = async () => {
    const validationError = validateForm();
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

      toast.success(result.message);
      onCycleCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating billing cycle:', error);
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
    <Modal className="max-w-4xl">
      <div className="flex h-[80vh] flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Billing Cycle Management</h2>
              <p className="text-muted-foreground text-sm">
                Create and manage automated billing cycles for users
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
                    <div className="space-y-3">
                      <Label>Target User</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="User ID"
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                        />
                        <Input
                          placeholder="User Name"
                          value={selectedUserName}
                          onChange={(e) => setSelectedUserName(e.target.value)}
                        />
                      </div>
                    </div>
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
                        <Input
                          type="number"
                          id="cycle-days"
                          value={cycleDays}
                          onChange={(e) => setCycleDays(parseInt(e.target.value))}
                          min={1}
                        />
                      </div>
                    )}
                    <p className="text-muted-foreground mt-1 text-xs">
                      Cycle will run every {cycleDays} day(s)
                    </p>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="confirm-creation"
                      checked={confirmCreation}
                      onCheckedChange={(val) => setConfirmCreation(!!val)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="confirm-creation"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Create Automatic Billing Cycle
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        This will create an automated billing cycle that processes billing every{' '}
                        {cycleDays} days
                      </p>
                    </div>
                  </div>

                  {hasActiveCycle && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This user already has {activeCycles.length} active billing cycle(s).
                        Creating a new cycle will run alongside existing ones.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !selectedUserId || !confirmCreation}
                    className="w-full"
                  >
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
                      <p className="text-muted-foreground mt-2 text-sm">
                        Select a user to view their billing cycles
                      </p>
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
                            <Badge className={`border ${getStatusColor(cycle.status)}`}>
                              {cycle.status}
                            </Badge>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-muted-foreground">Created:</span>
                                <p className="font-medium">
                                  {new Date(cycle.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Next Cycle:</span>
                                <p className="font-medium">
                                  {cycle.next_cycle_date
                                    ? new Date(cycle.next_cycle_date).toLocaleDateString()
                                    : 'Not scheduled'}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total Orders:</span>
                                <p className="font-medium">{cycle.total_orders}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total Amount:</span>
                                <p className="font-medium">
                                  {currencyFormatter(cycle.total_amount)}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Processed:</span>
                                <p className="font-medium text-green-600">
                                  {cycle.processed_orders}
                                </p>
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
                                await updateBillingCycle.mutateAsync({
                                  cycleId: cycle.id,
                                  updates: { is_active: !cycle.is_active },
                                });
                              }}
                            >
                              {cycle.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const nextDate = prompt(
                                  'Enter next cycle date (YYYY-MM-DD)',
                                  cycle.next_cycle_date?.slice(0, 10) || ''
                                );
                                if (nextDate) {
                                  await updateBillingCycle.mutateAsync({
                                    cycleId: cycle.id,
                                    updates: { next_cycle_date: nextDate },
                                  });
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
                      <p className="text-muted-foreground mt-2 text-sm">
                        No billing cycles found for this user
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
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
    </Modal>
  );
}
