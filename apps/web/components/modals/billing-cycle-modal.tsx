'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, Calendar, Settings, AlertTriangle, Users, Clock, CheckCircle } from 'lucide-react';
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
  userId: preselectedUserId, 
  userName: preselectedUserName,
  onCycleCreated 
}: BillingCycleModalProps) {
  const [selectedUserId, setSelectedUserId] = useState(preselectedUserId || '');
  const [selectedUserName, setSelectedUserName] = useState(preselectedUserName || '');
  const [cycleDays, setCycleDays] = useState(30);
  const [confirmCreation, setConfirmCreation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createBillingCycle, getBillingCyclesQuery } = useBillingOperations();

  // Fetch existing cycles for the user
  const { data: existingCycles, isLoading: cyclesLoading } = getBillingCyclesQuery(selectedUserId);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(preselectedUserId || '');
      setSelectedUserName(preselectedUserName || '');
      setCycleDays(30);
      setConfirmCreation(false);
    }
  }, [isOpen, preselectedUserId, preselectedUserName]);

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

  const activeCycles = existingCycles?.filter(cycle => cycle.is_active) || [];
  const hasActiveCycle = activeCycles.length > 0;

  return (
    <Modal showModal={isOpen} setShowModal={onClose} className="max-w-4xl">
      <div className="flex h-[80vh] flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Billing Cycle Management</h2>
              <p className="text-sm text-muted-foreground">
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Create New Billing Cycle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* User Selection */}
                  {preselectedUserId ? (
                    <div className="flex items-center justify-between p-3 border rounded bg-blue-50">
                      <div>
                        <p className="font-medium">{selectedUserName}</p>
                        <p className="text-sm text-muted-foreground">User ID: {selectedUserId}</p>
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

                  <div>
                    <Label htmlFor="cycle-days">Billing Cycle (Days)</Label>
                    <Select value={cycleDays.toString()} onValueChange={(value) => setCycleDays(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cycle duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Weekly (7 days)</SelectItem>
                        <SelectItem value="15">Bi-weekly (15 days)</SelectItem>
                        <SelectItem value="30">Monthly (30 days)</SelectItem>
                        <SelectItem value="60">Bi-monthly (60 days)</SelectItem>
                        <SelectItem value="90">Quarterly (90 days)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Billing will be processed automatically every {cycleDays} days
                    </p>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="confirm-creation"
                      checked={confirmCreation}
                      onCheckedChange={setConfirmCreation}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="confirm-creation"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Create Automatic Billing Cycle
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        This will create an automated billing cycle that processes billing every {cycleDays} days
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
                  <CardTitle className="text-base flex items-center gap-2">
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
                    <div className="text-center py-8">
                      <RotateCcw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading cycles...</p>
                    </div>
                  ) : !selectedUserId ? (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Select a user to view their billing cycles
                      </p>
                    </div>
                  ) : existingCycles && existingCycles.length > 0 ? (
                    <div className="space-y-3">
                      {existingCycles.map((cycle) => (
                        <div key={cycle.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{cycle.code}</p>
                                <Badge className={`${getStatusColor(cycle.status)} flex items-center gap-1`}>
                                  {getStatusIcon(cycle.status)}
                                  {cycle.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {cycle.cycle_type} • Every {cycle.cycle_days} days
                              </p>
                            </div>
                            {cycle.is_active && (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                Active
                              </Badge>
                            )}
                          </div>

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
                                  : 'Not scheduled'
                                }
                              </p>
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

                          <Separator />

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Period:</span>
                              <p className="font-medium">
                                {new Date(cycle.cycle_start_date).toLocaleDateString()} - {' '}
                                {new Date(cycle.cycle_end_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">
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