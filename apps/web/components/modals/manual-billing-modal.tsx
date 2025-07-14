'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Calendar as CalendarIcon, FileText, AlertTriangle, Users, Package } from 'lucide-react';
import { Calendar } from '@lorrigo/ui/components';
import {
  Modal,
  Button,
  Input,
  Label,
  Textarea,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator,
  Checkbox,
  toast,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@lorrigo/ui/components';
import { useBillingOperations, type ManualBillingParams } from '@/lib/apis/billing';
import { CopyBtn } from '@/components/copy-btn';

interface ManualBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  onBillingProcessed?: () => void;
}

interface SelectedUser {
  id: string;
  name: string;
  email: string;
}

export function ManualBillingModal({ 
  isOpen, 
  onClose, 
  userId: preselectedUserId, 
  userName: preselectedUserName,
  onBillingProcessed 
}: ManualBillingModalProps) {
  const [selectedTab, setSelectedTab] = useState<'awbs' | 'dateRange'>('dateRange');
  const [selectedUserId, setSelectedUserId] = useState(preselectedUserId || '');
  const [selectedUserName, setSelectedUserName] = useState(preselectedUserName || '');
  const [awbList, setAwbList] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [notes, setNotes] = useState('');
  const [confirmProcessing, setConfirmProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { processManualBilling } = useBillingOperations();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(preselectedUserId || '');
      setSelectedUserName(preselectedUserName || '');
      setAwbList('');
      setDateRange({ from: undefined, to: undefined });
      setNotes('');
      setConfirmProcessing(false);
      setSelectedTab('dateRange');
    }
  }, [isOpen, preselectedUserId, preselectedUserName]);

  const handleUserSelect = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
  };

  const getAwbArray = (): string[] => {
    if (!awbList.trim()) return [];
    
    return awbList
      .split(/[\n,;]+/)
      .map(awb => awb.trim())
      .filter(awb => awb.length > 0);
  };

  const validateForm = (): string | null => {
    if (!selectedUserId) {
      return 'Please select a user';
    }

    if (selectedTab === 'awbs') {
      const awbs = getAwbArray();
      if (awbs.length === 0) {
        return 'Please enter at least one AWB number';
      }
      if (awbs.length > 100) {
        return 'Maximum 100 AWB numbers allowed per batch';
      }
    } else if (selectedTab === 'dateRange') {
      if (!dateRange.from || !dateRange.to) {
        return 'Please select both start and end dates';
      }
      if (dateRange.from > dateRange.to) {
        return 'Start date must be before end date';
      }
      // Check if date range is not too large (e.g., max 90 days)
      const daysDifference = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDifference > 90) {
        return 'Date range cannot exceed 90 days';
      }
    }

    if (!confirmProcessing) {
      return 'Please confirm that you want to process manual billing';
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
      const params: ManualBillingParams = {};

      if (selectedTab === 'awbs') {
        params.awbs = getAwbArray();
      } else if (selectedTab === 'dateRange' && dateRange.from && dateRange.to) {
        params.dateRange = {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        };
      }

      const result = await processManualBilling.mutateAsync({
        userId: selectedUserId,
        params,
      });

      toast.success(`Manual billing processed successfully! ${result.data.length} orders processed.`);
      onBillingProcessed?.();
      onClose();
    } catch (error) {
      console.error('Error processing manual billing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const awbs = getAwbArray();
  const estimatedCount = selectedTab === 'awbs' ? awbs.length : '?';

  return (
    <Modal showModal={isOpen} setShowModal={onClose} className="max-w-3xl">
      <div className="flex h-[70vh] flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Manual Billing Processing</h2>
              <p className="text-sm text-muted-foreground">
                Process billing for specific orders outside of automated cycles
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* User Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Target User
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                    <Label>Select User for Manual Billing</Label>
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
                    <p className="text-xs text-muted-foreground">
                      Enter the user ID and name for the user you want to process billing for
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Scope Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Billing Scope
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="dateRange" className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Date Range
                    </TabsTrigger>
                    <TabsTrigger value="awbs" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Specific AWBs
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="dateRange" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-date">Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!dateRange.from && 'text-muted-foreground'}`}
                            >
                              {dateRange.from ? (
                                dateRange.from.toLocaleDateString()
                              ) : (
                                <span>Select start date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRange.from}
                              onSelect={(date) => {
                                if (date instanceof Date || date === undefined) {
                                  setDateRange(prev => ({ ...prev, from: date }));
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="end-date">End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!dateRange.to && 'text-muted-foreground'}`}
                            >
                              {dateRange.to ? (
                                dateRange.to.toLocaleDateString()
                              ) : (
                                <span>Select end date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRange.to}
                              onSelect={(date) => {
                                if (date instanceof Date || date === undefined) {
                                  setDateRange(prev => ({ ...prev, to: date }));
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This will process billing for all unbilled orders within the selected date range. 
                        Maximum range allowed is 90 days.
                      </AlertDescription>
                    </Alert>
                  </TabsContent>

                  <TabsContent value="awbs" className="space-y-4">
                    <div>
                      <Label htmlFor="awb-list">AWB Numbers</Label>
                      <Textarea
                        id="awb-list"
                        value={awbList}
                        onChange={(e) => setAwbList(e.target.value)}
                        placeholder="Enter AWB numbers (one per line, or separated by commas)
Example:
1234567890
0987654321
1122334455"
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          You can enter AWB numbers separated by new lines, commas, or semicolons
                        </p>
                        <Badge variant="outline">
                          {awbs.length} AWBs
                        </Badge>
                      </div>
                    </div>
                    {awbs.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Processing billing for {awbs.length} specific AWB numbers. 
                          Maximum 100 AWBs allowed per batch.
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Processing Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Processing Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Target User:</Label>
                    <p className="font-medium">{selectedUserName || 'Not selected'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Billing Method:</Label>
                    <p className="font-medium capitalize">
                      {selectedTab === 'dateRange' ? 'Date Range' : 'Specific AWBs'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Estimated Orders:</Label>
                    <p className="font-medium">{estimatedCount}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Processing Type:</Label>
                    <p className="font-medium text-orange-600">Manual Billing</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="notes">Processing Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this manual billing process..."
                    rows={3}
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="confirm-processing"
                    checked={confirmProcessing}
                    onCheckedChange={(checked: boolean) => setConfirmProcessing(checked)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="confirm-processing"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Confirm Manual Billing Processing
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      I understand that this will create billing records for the selected orders and cannot be easily undone.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important Notice</AlertTitle>
              <AlertDescription>
                Manual billing will process all qualifying orders that haven't been billed yet. 
                This action cannot be easily reversed. Please ensure you've selected the correct user and scope before proceeding.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedUserId || !confirmProcessing}
              className="min-w-[140px]"
            >
              {isSubmitting ? 'Processing...' : 'Process Billing'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
} 