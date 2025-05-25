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
import { phoneRegex } from '@lorrigo/utils';
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type DeliveryFormValues, deliveryDetailsSchema } from '../types';
import { ChevronUp } from 'lucide-react';

interface DeliveryDetailsFormProps {
  onSubmit: (values: DeliveryFormValues) => void;
  errors?: Record<string, any>;
}

export function DeliveryDetailsForm({ onSubmit, errors }: DeliveryDetailsFormProps) {
  const [billingIsSameAsDelivery, setBillingIsSameAsDelivery] = useState(true);
  const [billingOpen, setBillingOpen] = useState(false);

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryDetailsSchema),
    defaultValues: {
      isBusiness: false,
      mobileNumber: '',
      fullName: '',
      completeAddress: '',
      landmark: '',
      pincode: '',
      city: '',
      state: '',
      email: '',
      billingIsSameAsDelivery: true,
      billingMobileNumber: '',
      billingFullName: '',
      billingCompleteAddress: '',
      billingLandmark: '',
      billingPincode: '',
      billingCity: '',
      billingState: '',
    },
  });

  // Update form value when checkbox changes
  useEffect(() => {
    form.setValue('billingIsSameAsDelivery', billingIsSameAsDelivery);
    if (!billingIsSameAsDelivery) {
      setBillingOpen(true);
    }
  }, [billingIsSameAsDelivery, form]);

  // When delivery details change and billing is same as delivery, update billing fields
  const watchedFields = form.watch([
    'mobileNumber',
    'fullName',
    'completeAddress',
    'landmark',
    'pincode',
    'city',
    'state',
  ]);

  useEffect(() => {
    if (billingIsSameAsDelivery) {
      form.setValue('billingMobileNumber', form.getValues('mobileNumber'));
      form.setValue('billingFullName', form.getValues('fullName'));
      form.setValue('billingCompleteAddress', form.getValues('completeAddress'));
      form.setValue('billingLandmark', form.getValues('landmark') || '');
      form.setValue('billingPincode', form.getValues('pincode'));
      form.setValue('billingCity', form.getValues('city'));
      form.setValue('billingState', form.getValues('state'));
    }
  }, [billingIsSameAsDelivery, watchedFields, form]);

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      onSubmit(value as DeliveryFormValues);
    });
    return () => subscription.unsubscribe();
  }, [form, onSubmit]);

  // Add this effect to handle errors passed from parent
  useEffect(() => {
    if (errors) {
      Object.entries(errors).forEach(([key, value]) => {
        if (value && typeof value === 'object' && 'message' in value) {
          form.setError(key as any, {
            type: 'manual',
            message: value.message as string,
          });
        }
      });
    }
  }, [errors, form]);

  function handleSubmit(values: DeliveryFormValues) {
    onSubmit(values);
  }

  // Custom validation function
  const validateForm = (values: DeliveryFormValues) => {
    const errors: Record<string, any> = {};

    // Mobile number validation
    if (!values.mobileNumber) {
      errors.mobileNumber = 'Mobile number is required';
    } else if (!phoneRegex.test(values.mobileNumber)) {
      errors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    // Full name validation
    if (!values.fullName) {
      errors.fullName = 'Full name is required';
    }

    // Complete address validation
    if (!values.completeAddress) {
      errors.completeAddress = 'Address is required';
    }

    // Pincode validation
    if (!values.pincode) {
      errors.pincode = 'Pincode is required';
    }

    // City validation
    if (!values.city) {
      errors.city = 'City is required';
    }

    // State validation
    if (!values.state) {
      errors.state = 'State is required';
    }

    // Email validation
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Billing validations if billing is not same as delivery
    if (!values.billingIsSameAsDelivery) {
      if (!values.billingMobileNumber) {
        errors.billingMobileNumber = 'Mobile number is required';
      } else if (!phoneRegex.test(values.billingMobileNumber)) {
        errors.billingMobileNumber = 'Please enter a valid 10-digit mobile number';
      }

      if (!values.billingFullName) {
        errors.billingFullName = 'Full name is required';
      }

      if (!values.billingCompleteAddress) {
        errors.billingCompleteAddress = 'Address is required';
      }

      if (!values.billingPincode) {
        errors.billingPincode = 'Pincode is required';
      }

      if (!values.billingCity) {
        errors.billingCity = 'City is required';
      }

      if (!values.billingState) {
        errors.billingState = 'State is required';
      }
    }

    return errors;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="isBusiness"
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
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Mobile Number</FormLabel>
                <div className="flex">
                  <div className="bg-muted flex items-center justify-center rounded-l-md border px-2 text-xs">
                    +91
                  </div>
                  <FormControl>
                    <Input {...field} placeholder="Mobile" className="h-8 rounded-l-none text-sm" />
                  </FormControl>
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Full Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Full Name" className="h-8 text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="completeAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">Complete Address</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Full address" className="h-8 text-sm" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="landmark"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground text-xs font-medium">
                  Landmark (Optional)
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Landmark" className="h-8 text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pincode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Pincode</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Pincode" className="h-8 text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">City</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="City" className="h-8 text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">State</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="State" className="h-8 text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground text-xs font-medium">
                  Email (Optional)
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Email" className="h-8 text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
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
                  control={form.control}
                  name="billingMobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Mobile Number</FormLabel>
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
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingFullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full Name" className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="billingCompleteAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Complete Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full address" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="billingLandmark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs font-medium">
                        Landmark (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Landmark" className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingPincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Pincode</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Pincode" className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="City" className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="billingState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">State</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="State" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </form>
    </Form>
  );
}
