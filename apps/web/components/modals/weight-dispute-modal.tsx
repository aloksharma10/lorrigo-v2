'use client';

import React, { useState } from 'react';
import { Scale, AlertTriangle, CheckCircle, XCircle, FileText, Camera } from 'lucide-react';
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
  Separator,
  toast,
} from '@lorrigo/ui/components';
import { useBillingOperations, type WeightDispute } from '@/lib/apis/billing';
import { currencyFormatter } from '@lorrigo/utils';
import { CopyBtn } from '@/components/copy-btn';

interface WeightDisputeModalProps {
  dispute: WeightDispute | null;
  isOpen: boolean;
  onClose: () => void;
  onResolved?: () => void;
}

export function WeightDisputeModal({ dispute, isOpen, onClose, onResolved }: WeightDisputeModalProps) {
  const [resolution, setResolution] = useState('');
  const [finalWeight, setFinalWeight] = useState('');
  const [revisedCharges, setRevisedCharges] = useState('');
  const [status, setStatus] = useState<'ACCEPTED' | 'REJECTED' | 'RESOLVED'>('PENDING' as any);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resolveWeightDispute } = useBillingOperations();

  React.useEffect(() => {
    if (dispute) {
      setFinalWeight(dispute.final_weight?.toString() || dispute.disputed_weight.toString());
      setRevisedCharges(dispute.revised_charges?.toString() || dispute.original_charges.toString());
      setResolution(dispute.resolution || '');
      setStatus(dispute.status as any);
    } else {
      setFinalWeight('');
      setRevisedCharges('');
      setResolution('');
      setStatus('PENDING' as any);
    }
  }, [dispute]);

  const handleResolve = async () => {
    if (!dispute || !resolution.trim()) {
      toast.error('Please provide a resolution');
      return;
    }

    if (status === 'RESOLVED' && !finalWeight) {
      toast.error('Please specify the final weight');
      return;
    }

    setIsSubmitting(true);

    try {
      const resolutionData = {
        status,
        resolution: resolution.trim(),
        ...(status === 'RESOLVED' && {
          final_weight: parseFloat(finalWeight),
          revised_charges: parseFloat(revisedCharges) || undefined,
        }),
      };

      await resolveWeightDispute.mutateAsync({
        disputeId: dispute.id,
        resolution: resolutionData,
      });

      toast.success('Weight dispute resolved successfully');
      onResolved?.();
      onClose();
    } catch (error) {
      console.error('Error resolving dispute:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'RESOLVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <AlertTriangle className="h-4 w-4" />;
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      case 'RESOLVED':
        return <Scale className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (!dispute) return null;

  const weightDifference = dispute.disputed_weight - dispute.original_weight;
  const chargesDifference = (dispute.revised_charges || dispute.original_charges) - dispute.original_charges;

  return (
    <Modal showModal={isOpen} setShowModal={onClose} className="max-w-4xl">
      <div className="flex h-[80vh] flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="h-6 w-6 text-orange-600" />
              <div>
                <h2 className="text-xl font-semibold">Weight Dispute Resolution</h2>
                <p className="text-sm text-muted-foreground">
                  Dispute ID: {dispute.dispute_id}
                </p>
              </div>
            </div>
            <Badge className={`${getStatusColor(dispute.status)} flex items-center gap-1`}>
              {getStatusIcon(dispute.status)}
              {dispute.status}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Dispute Details */}
            <div className="space-y-6">
              {/* Order Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Order Number:</span>
                    <CopyBtn
                      label={dispute.order?.code}
                      text={dispute.order?.code}
                      className="font-medium"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">AWB Number:</span>
                    <CopyBtn
                      label={dispute.order?.shipment?.awb}
                      text={dispute.order?.shipment?.awb}
                      className="font-medium"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Customer:</span>
                    <span className="font-medium">{dispute.order?.customer?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <CopyBtn
                      label={dispute.order?.customer?.phone}
                      text={dispute.order?.customer?.phone}
                      className="font-medium"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Courier:</span>
                    <span className="font-medium">{dispute.courier_name || ''}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Weight Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weight Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Original Weight</p>
                      <p className="text-lg font-semibold text-green-600">
                        {dispute.original_weight} kg
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Disputed Weight</p>
                      <p className="text-lg font-semibold text-red-600">
                        {dispute.disputed_weight} kg
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Weight Difference</p>
                    <p className={`text-lg font-bold ${weightDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {weightDifference > 0 ? '+' : ''}{weightDifference} kg
                    </p>
                  </div>

                  {dispute.final_weight && (
                    <>
                      <Separator />
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Final Weight (Resolved)</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {dispute.final_weight} kg
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Charges Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Charges Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Original Charges</p>
                      <p className="text-lg font-semibold text-green-600">
                        {currencyFormatter(dispute.original_charges)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        {dispute.revised_charges ? 'Revised Charges' : 'Disputed Charges'}
                      </p>
                      <p className="text-lg font-semibold text-red-600">
                        {currencyFormatter(dispute.revised_charges || dispute.original_charges)}
                      </p>
                    </div>
                  </div>
                  
                  {chargesDifference !== 0 && (
                    <>
                      <Separator />
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Charges Difference</p>
                        <p className={`text-lg font-bold ${chargesDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {chargesDifference > 0 ? '+' : ''}{currencyFormatter(chargesDifference)}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Evidence */}
              {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Evidence Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dispute.evidence_urls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex-1"
                          >
                            Evidence {index + 1}
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Resolution */}
            <div className="space-y-6">
              {/* Current Resolution */}
              {dispute.status !== 'PENDING' && dispute.resolution && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Current Resolution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Resolution:</Label>
                      <p className="mt-1 text-sm">{dispute.resolution}</p>
                    </div>
                    {dispute.resolved_by && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Resolved By:</Label>
                        <p className="mt-1 text-sm font-medium">{dispute.resolved_by}</p>
                      </div>
                    )}
                    {dispute.resolution_date && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Resolution Date:</Label>
                        <p className="mt-1 text-sm">
                          {new Date(dispute.resolution_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Courier Response */}
              {dispute.courier_response && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Courier Response</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{dispute.courier_response}</p>
                  </CardContent>
                </Card>
              )}

              {/* Resolution Form */}
              {dispute.status === 'PENDING' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resolve Dispute</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="status">Resolution Status</Label>
                      <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resolution status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACCEPTED">Accept Dispute</SelectItem>
                          <SelectItem value="REJECTED">Reject Dispute</SelectItem>
                          <SelectItem value="RESOLVED">Resolve with Adjustments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {status === 'RESOLVED' && (
                      <>
                        <div>
                          <Label htmlFor="finalWeight">Final Weight (kg)</Label>
                          <Input
                            id="finalWeight"
                            type="number"
                            step="0.01"
                            value={finalWeight}
                            onChange={(e) => setFinalWeight(e.target.value)}
                            placeholder="Enter final weight"
                          />
                        </div>

                        <div>
                          <Label htmlFor="revisedCharges">Revised Charges (₹)</Label>
                          <Input
                            id="revisedCharges"
                            type="number"
                            step="0.01"
                            value={revisedCharges}
                            onChange={(e) => setRevisedCharges(e.target.value)}
                            placeholder="Enter revised charges"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <Label htmlFor="resolution">Resolution Notes</Label>
                      <Textarea
                        id="resolution"
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        placeholder="Explain the resolution decision..."
                        rows={4}
                      />
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Important</AlertTitle>
                      <AlertDescription>
                        This resolution will be final and will update the billing records accordingly.
                        Make sure all information is accurate before proceeding.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {dispute.status === 'PENDING' && (
              <Button
                onClick={handleResolve}
                disabled={isSubmitting || !resolution.trim()}
                className="min-w-[120px]"
              >
                {isSubmitting ? 'Resolving...' : 'Resolve Dispute'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
} 