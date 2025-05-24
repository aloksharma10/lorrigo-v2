"use client"

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
} from "@lorrigo/ui/components"
import { phoneRegex } from "@lorrigo/utils/validations"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { type DeliveryFormValues, deliveryDetailsSchema } from "../types"

interface DeliveryDetailsFormProps {
  onSubmit: (values: DeliveryFormValues) => void
  errors?: Record<string, any>
}

export function DeliveryDetailsForm({ onSubmit, errors }: DeliveryDetailsFormProps) {
  const [billingIsSameAsDelivery, setBillingIsSameAsDelivery] = useState(true)

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryDetailsSchema),
    defaultValues: {
      isBusiness: false,
      mobileNumber: "",
      fullName: "",
      completeAddress: "",
      landmark: "",
      pincode: "",
      city: "",
      state: "",
      alternateMobile: "",
      email: "",
      billingIsSameAsDelivery: true,
      billingMobileNumber: "",
      billingFullName: "",
      billingCompleteAddress: "",
      billingLandmark: "",
      billingPincode: "",
      billingCity: "",
      billingState: "",
    },
  })

  // Update form value when checkbox changes
  useEffect(() => {
    form.setValue("billingIsSameAsDelivery", billingIsSameAsDelivery)
  }, [billingIsSameAsDelivery, form])

  // When delivery details change and billing is same as delivery, update billing fields
  const watchedFields = form.watch([
    "mobileNumber",
    "fullName",
    "completeAddress",
    "landmark",
    "pincode",
    "city",
    "state",
  ])

  useEffect(() => {
    if (billingIsSameAsDelivery) {
      form.setValue("billingMobileNumber", form.getValues("mobileNumber"))
      form.setValue("billingFullName", form.getValues("fullName"))
      form.setValue("billingCompleteAddress", form.getValues("completeAddress"))
      form.setValue("billingLandmark", form.getValues("landmark") || "")
      form.setValue("billingPincode", form.getValues("pincode"))
      form.setValue("billingCity", form.getValues("city"))
      form.setValue("billingState", form.getValues("state"))
    }
  }, [billingIsSameAsDelivery, watchedFields, form])

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      onSubmit(value as DeliveryFormValues)
    })
    return () => subscription.unsubscribe()
  }, [form, onSubmit])

  // Add this effect to handle errors passed from parent
  useEffect(() => {
    if (errors) {
      Object.entries(errors).forEach(([key, value]) => {
        if (value && typeof value === "object" && "message" in value) {
          form.setError(key as any, {
            type: "manual",
            message: value.message as string,
          })
        }
      })
    }
  }, [errors, form])

  function handleSubmit(values: DeliveryFormValues) {
    onSubmit(values)
  }

  // Custom validation function
  const validateForm = (values: DeliveryFormValues) => {
    const errors: Record<string, any> = {}

    // Mobile number validation
    if (!values.mobileNumber) {
      errors.mobileNumber = "Mobile number is required"
    } else if (!phoneRegex.test(values.mobileNumber)) {
      errors.mobileNumber = "Please enter a valid 10-digit mobile number"
    }

    // Full name validation
    if (!values.fullName) {
      errors.fullName = "Full name is required"
    }

    // Complete address validation
    if (!values.completeAddress) {
      errors.completeAddress = "Address is required"
    }

    // Pincode validation
    if (!values.pincode) {
      errors.pincode = "Pincode is required"
    }

    // City validation
    if (!values.city) {
      errors.city = "City is required"
    }

    // State validation
    if (!values.state) {
      errors.state = "State is required"
    }

    // Alternate mobile validation
    if (values.alternateMobile && !phoneRegex.test(values.alternateMobile)) {
      errors.alternateMobile = "Please enter a valid 10-digit mobile number"
    }

    // Email validation
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = "Please enter a valid email address"
    }

    // Billing validations if billing is not same as delivery
    if (!values.billingIsSameAsDelivery) {
      if (!values.billingMobileNumber) {
        errors.billingMobileNumber = "Mobile number is required"
      } else if (!phoneRegex.test(values.billingMobileNumber)) {
        errors.billingMobileNumber = "Please enter a valid 10-digit mobile number"
      }

      if (!values.billingFullName) {
        errors.billingFullName = "Full name is required"
      }

      if (!values.billingCompleteAddress) {
        errors.billingCompleteAddress = "Address is required"
      }

      if (!values.billingPincode) {
        errors.billingPincode = "Pincode is required"
      }

      if (!values.billingCity) {
        errors.billingCity = "City is required"
      }

      if (!values.billingState) {
        errors.billingState = "State is required"
      }
    }

    return errors
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex items-center space-x-2">
          <FormField
            control={form.control}
            name="isBusiness"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} id="is-business" />
                </FormControl>
                <FormLabel htmlFor="is-business" className="cursor-pointer font-normal">
                  This is a B2B Order
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FormField
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Mobile Number</FormLabel>
                <div className="flex">
                  <div className="bg-muted flex items-center justify-center rounded-l-md border px-3">+91</div>
                  <FormControl>
                    <Input {...field} placeholder="Enter mobile number" className="rounded-l-none" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter Full Name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="completeAddress"
            render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel className="text-sm font-medium">Complete Address</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter Buyer's full address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="landmark"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1 text-sm font-medium">
                  Landmark
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter any near by landmark" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pincode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Pincode</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter pincode" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">City</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="City" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">State</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="State" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="alternateMobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1 text-sm font-medium">
                  Alternate Mobile Number
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </FormLabel>
                <div className="flex">
                  <div className="bg-muted flex items-center justify-center rounded-l-md border px-3">+91</div>
                  <FormControl>
                    <Input {...field} placeholder="Enter mobile number" className="rounded-l-none" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1 text-sm font-medium">
                  Email Id
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter Email Address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="billing-same"
            checked={billingIsSameAsDelivery}
            onCheckedChange={(checked) => setBillingIsSameAsDelivery(!!checked)}
          />
          <Label htmlFor="billing-same" className="cursor-pointer">
            Billing Details are same as Delivery Details
          </Label>
        </div>

        {!billingIsSameAsDelivery && (
          <div className="space-y-6 border-t pt-4">
            <h3 className="font-medium">Billing Details</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="billingMobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Mobile Number</FormLabel>
                    <div className="flex">
                      <div className="bg-muted flex items-center justify-center rounded-l-md border px-3">+91</div>
                      <FormControl>
                        <Input {...field} placeholder="Enter mobile number" className="rounded-l-none" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingFullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter Full Name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingCompleteAddress"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel className="text-sm font-medium">Complete Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter Buyer's full address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingLandmark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 text-sm font-medium">
                      Landmark
                      <span className="text-muted-foreground text-xs">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter any near by landmark" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingPincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Pincode</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter pincode" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">State</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="State" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
      </form>
    </Form>
  )
}
