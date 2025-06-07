'use client';

import {
  Checkbox,
  Input,
  Label,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Collapsible,
  CollapsibleTrigger,
  Button,
  CollapsibleContent,
} from '@lorrigo/ui/components';
import { OrderFormValues, phoneRegex } from '@lorrigo/utils';
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Control, useForm, UseFormWatch } from 'react-hook-form';
import { type DeliveryFormValues, deliveryDetailsSchema } from '../types';
import { ChevronUp } from 'lucide-react';

interface DeliveryDetailsFormProps {
  control: Control<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
}

export function DeliveryDetailsForm({ control, watch }: DeliveryDetailsFormProps) {
  const [billingIsSameAsDelivery, setBillingIsSameAsDelivery] = useState(true);
  const [billingOpen, setBillingOpen] = useState(false);

  useEffect(() => {
    control._formValues.billingIsSameAsDelivery = billingIsSameAsDelivery;
    if (!billingIsSameAsDelivery) {
      setBillingOpen(true);
    }
  }, [billingIsSameAsDelivery, control]);

  const watchedFields = watch([
    'deliveryDetails.mobileNumber',
    'deliveryDetails.fullName',
    'deliveryDetails.completeAddress',
    'deliveryDetails.landmark',
    'deliveryDetails.pincode',
    'deliveryDetails.city',
    'deliveryDetails.state',
  ]);

  useEffect(() => {
    if (billingIsSameAsDelivery) {
      control._formValues.deliveryDetails.billingMobileNumber = control._formValues.deliveryDetails.mobileNumber;
      control._formValues.deliveryDetails.billingFullName = control._formValues.deliveryDetails.fullName;
      control._formValues.deliveryDetails.billingCompleteAddress = control._formValues.deliveryDetails.completeAddress;
      control._formValues.deliveryDetails.billingLandmark = control._formValues.deliveryDetails.landmark || '';
      control._formValues.deliveryDetails.billingPincode = control._formValues.deliveryDetails.pincode;
      control._formValues.deliveryDetails.billingCity = control._formValues.deliveryDetails.city;
      control._formValues.deliveryDetails.billingState = control._formValues.deliveryDetails.state;
    }
  }, [billingIsSameAsDelivery, watchedFields, control]);

  return (
    <div className="space-y-3">
      <FormField
        control={control}
        name="deliveryDetails.isBusiness"
        render={({ field }) => (
          <FormItem className="flex items-center space-x-2">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} id="is-business" />
            </FormControl>
            <FormLabel htmlFor="is-business" className="cursor-pointer text-sm font-normal">
              This is a B2B Order
            </FormLabel>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="deliveryDetails.mobileNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile Number</FormLabel>
              <div className="flex">
                <div className="bg-muted flex items-center justify-center rounded-l-md border px-2 text-xs">
                  +91
                </div>
                <FormControl>
                  <Input {...field} placeholder="Mobile" maxLength={10} className="h-8 rounded-l-none text-sm" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="deliveryDetails.fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Full Name" className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="deliveryDetails.completeAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Complete Address</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Full address" className="h-8" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={control}
          name="deliveryDetails.landmark"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">
                <span className="text-black">Landmark</span>(Optional)
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="Landmark" className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="deliveryDetails.pincode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pincode</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Pincode" className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="deliveryDetails.city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input {...field} placeholder="City" className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={control}
          name="deliveryDetails.state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <FormControl>
                <Input {...field} placeholder="State" className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="deliveryDetails.email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">
                <span className="text-black">Email</span> (Optional)
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="Email" className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="billing-same"
          checked={billingIsSameAsDelivery}
          onCheckedChange={(checked) => setBillingIsSameAsDelivery(!!checked)}
        />
        <Label htmlFor="billing-same" className="cursor-pointer text-sm">
          Billing same as delivery
        </Label>
      </div>
      {!billingIsSameAsDelivery && (
        <Collapsible open={billingOpen} onOpenChange={setBillingOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex h-auto items-center gap-2 p-0 text-sm">
              Billing Details
              {billingOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={control}
                name="deliveryDetails.billingMobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <div className="flex">
                      <div className="bg-muted flex items-center justify-center rounded-l-md border px-2 text-xs">
                        +91
                      </div>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Mobile"
                          className="h-8 rounded-l-none text-sm"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="deliveryDetails.billingFullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full Name" className="h-8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={control}
              name="deliveryDetails.billingCompleteAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complete Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Full address" className="h-8" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={control}
                name="deliveryDetails.billingLandmark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs font-medium">
                      Landmark (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Landmark" className="h-8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="deliveryDetails.billingPincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Pincode" className="h-8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="deliveryDetails.billingCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City" className="h-8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={control}
              name="deliveryDetails.billingState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="State" className="h-8" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
