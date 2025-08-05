'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Info } from 'lucide-react';
import {
  Button,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Alert,
  AlertDescription,
  AlertTitle,
  DrawerComponent,
  DrawerSide,
  DrawerSize,
} from '@lorrigo/ui/components';
import { useDrawerStore } from '@/drawer/drawer-store';
import { useBillingOperations, type WeightDispute } from '@/lib/apis/billing';
import { toast } from '@lorrigo/ui/components';

interface RaiseDisputeProps {
  dispute: WeightDispute;
  onClose?: () => void;
  isOpen?: boolean;
  size?: DrawerSize;
  side?: DrawerSide;
}

export default function RaiseDispute({ dispute, onClose, isOpen = false, size = 'greater-mid', side = 'right' }: RaiseDisputeProps) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<(File | undefined)[]>([]);
  const [comment, setComment] = useState('');
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null]);

  const { actOnDispute } = useBillingOperations();
  console.log('dispute', dispute, actOnDispute);

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file && file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }

      const newImages = [...images];
      newImages[index] = file;
      setImages(newImages);
    }
  };

  const handleUploadClick = (index: number) => {
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]?.click();
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error('Please provide a comment');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for image uploads
      const formData = new FormData();
      images.forEach((image, index) => {
        if (image) {
          formData.append(`images`, image);
        }
      });
      formData.append('comment', comment);

      // Call API to raise dispute
      await actOnDispute.mutateAsync({
        disputeId: dispute.id,
        request: {
          action: 'RAISE',
          comment: comment,
          // The backend will handle the image uploads
        },
      });

      toast.success('Dispute raised successfully');
      handleClose();
    } catch (error) {
      console.error('Error raising dispute:', error);
      toast.error('Failed to raise dispute. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    closeDrawer();
  };

  const weightDifference = dispute.disputed_weight - dispute.original_weight;
  const totalCharge = dispute.forward_excess_amount + dispute.rto_excess_amount;

  return (
    <DrawerComponent open={isOpen} onOpenChange={onClose} size={size} side={side}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Raise Dispute for AWB: {dispute.order?.shipment?.awb}</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Weight Discrepancy Details */}
            <div>
              <h3 className="mb-3 text-base font-semibold">Weight Discrepancy Details Shared by Courier</h3>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Package Image</CardTitle>
                </CardHeader>
                <CardContent>
                  {dispute.evidence_urls && dispute.evidence_urls.length > 0 ? (
                    <div className="flex items-center justify-center rounded-md border p-4">
                      <img src={dispute.evidence_urls[0]} alt="Package" className="max-h-48 object-contain" />
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex items-center justify-center rounded-md border p-4">No image available</div>
                  )}
                </CardContent>
              </Card>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Charged Weight</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-muted-foreground text-sm">Actual Weight</div>
                      <div className="text-lg font-semibold">{dispute.disputed_weight} kg</div>
                      <div className="text-muted-foreground mt-2 text-sm">Volumetric Weight</div>
                      <div className="text-sm">
                        {dispute.disputed_weight} kg ({dispute.order?.dimensions || '10x10x10'})
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Excess Weight & Charge</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-muted-foreground text-sm">Excess Weight</div>
                      <div className="text-lg font-semibold text-red-600">{weightDifference.toFixed(2)} kg</div>
                      <div className="text-muted-foreground mt-2 text-sm">Excess Charge</div>
                      <div className="text-lg font-semibold text-red-600">₹{totalCharge.toFixed(2)}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Add Product Details */}
            <div>
              <h3 className="mb-3 text-base font-semibold">Add Product Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-1 text-sm font-medium">Product</div>
                  <div className="text-sm">Product Id: {dispute.order?.product?.id || 'N/A'}</div>
                  <div className="text-sm">Name: {dispute.order?.product?.name || 'N/A'}</div>
                  <div className="text-sm">SKU ID: {dispute.order?.product?.sku || 'N/A'}</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Upload Sample Shipment Images */}
            <div>
              <h3 className="mb-3 text-base font-semibold">Upload Sample Shipment Images</h3>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Package Length Image', type: 'length' },
                  { label: 'Package Width Image', type: 'width' },
                  { label: 'Package Height Image', type: 'height' },
                  { label: 'Shipment on weighing Scale Image', type: 'scale' },
                  { label: 'Package with label', type: 'label' },
                ].map((item, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(index, e)}
                      ref={(el) => {
                        fileInputRefs.current[index] = el;
                      }}
                    />
                    <div
                      className={`flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed hover:bg-gray-50 ${images[index] ? 'border-blue-500' : 'border-gray-300'}`}
                      onClick={() => handleUploadClick(index)}
                    >
                      {images[index] ? (
                        <img src={URL.createObjectURL(images[index]!)} alt={`Upload ${index + 1}`} className="h-full w-full rounded-md object-cover" />
                      ) : (
                        <>
                          <Upload className="text-muted-foreground mb-2 h-6 w-6" />
                          <div className="text-muted-foreground text-center text-xs">
                            Upload Image
                            <br />
                            (jpg,png,jpeg)
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-2 text-center text-xs">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="text-muted-foreground mt-2 text-xs">* Images should be less than 5 MB</div>
            </div>

            <Separator />

            {/* Guidelines */}
            <div>
              <h3 className="mb-3 text-base font-semibold">Guidelines to Upload Sample Shipment Images</h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="rounded-md border p-4">
                  <div className="mb-2 text-sm font-medium">Step 1</div>
                  <div className="mb-2 flex items-center">
                    <img src="/images/measure-package.png" alt="Step 1" className="h-20 object-contain" />
                  </div>
                  <p className="text-muted-foreground text-xs">Make sure that the measuring device is placed alongside the dimension to be measured.</p>
                </div>
                <div className="rounded-md border p-4">
                  <div className="mb-2 text-sm font-medium">Step 2</div>
                  <div className="mb-2 flex items-center">
                    <img src="/images/weighing-scale.png" alt="Step 2" className="h-20 object-contain" />
                  </div>
                  <p className="text-muted-foreground text-xs">Make sure the package weight is visible on the weighing scale before uploading the image.</p>
                </div>
                <div className="rounded-md border p-4">
                  <div className="mb-2 text-sm font-medium">Step 3</div>
                  <div className="mb-2 flex items-center">
                    <img src="/images/shipping-label.png" alt="Step 3" className="h-20 object-contain" />
                  </div>
                  <p className="text-muted-foreground text-xs">Make sure the shipping label is clearly visible before uploading the image.</p>
                </div>
              </div>
            </div>

            {/* Comment */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="comment" className="text-base font-semibold">
                  Comment
                </label>
                <div className="text-muted-foreground text-xs">* Required</div>
              </div>
              <Textarea
                id="comment"
                placeholder="Add your comment here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* FAQ */}
            <div>
              <Alert className="border-yellow-200 bg-yellow-50">
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Know how to calculate charged weight?</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  The charged weight is the higher of the actual weight and the volumetric weight. Volumetric weight is calculated as (Length × Width × Height)
                  ÷ 5000.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4">
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !comment.trim()}>
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </div>
        </div>
      </div>
    </DrawerComponent>
  );
}
