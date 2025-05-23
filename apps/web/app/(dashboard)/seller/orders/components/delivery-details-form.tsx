"use client"

import { Checkbox, Input, Label, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@lorrigo/ui/components"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const phoneRegex = /^[0-9]{10}$/

const deliveryFormSchema = z.object({
  isBusiness: z.boolean().default(false),
  mobileNumber: z.string().regex(phoneRegex, { message: "Please enter a valid 10-digit mobile number" }),
  fullName: z.string().min(1, { message: "Full name is required" }),
  completeAddress: z.string().min(1, { message: "Address is required" }),
  landmark: z.string().optional(),
  pincode: z.string().min(1, { message: "Pincode is required" }),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().min(1, { message: "State is required" }),
  alternateMobile: z
    .string()
    .regex(phoneRegex, { message: "Please enter a valid 10-digit mobile number" })
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .or(z.literal(''))
    .optional(),
  billingIsSameAsDelivery: z.boolean().default(true),
  billingMobileNumber: z
    .string()
    .regex(phoneRegex, { message: "Please enter a valid 10-digit mobile number" })
    .optional(),
  billingFullName: z.string().optional(),
  billingCompleteAddress: z.string().optional(),
  billingLandmark: z.string().optional(),
  billingPincode: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
})

export function DeliveryDetailsForm() {
  const [billingIsSameAsDelivery, setBillingIsSameAsDelivery] = useState(true)
  const form = useForm<z.infer<typeof deliveryFormSchema>>({
    resolver: zodResolver(deliveryFormSchema),
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
      form.setValue("billingLandmark", form.getValues("landmark"))
      form.setValue("billingPincode", form.getValues("pincode"))
      form.setValue("billingCity", form.getValues("city"))
      form.setValue("billingState", form.getValues("state"))
    }
  }, [billingIsSameAsDelivery, watchedFields, form])

  function onSubmit(values: z.infer<typeof deliveryFormSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center space-x-2">
          <FormField
            control={form.control}
            name="isBusiness"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} id="is-business" />
                </FormControl>
                <FormLabel htmlFor="is-business" className="font-normal cursor-pointer">
                  This is a B2B Order
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Mobile Number</FormLabel>
                <div className="flex">
                  <div className="flex items-center justify-center h-10 px-3 border rounded-l-md bg-muted">+91</div>
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
                <FormLabel className="text-sm font-medium flex items-center gap-1">
                  Landmark
                  <span className="text-xs text-muted-foreground">(Optional)</span>
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
                <FormLabel className="text-sm font-medium flex items-center gap-1">
                  Alternate Mobile Number
                  <span className="text-xs text-muted-foreground">(Optional)</span>
                </FormLabel>
                <div className="flex">
                  <div className="flex items-center justify-center h-10 px-3 border rounded-l-md bg-muted">+91</div>
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
                <FormLabel className="text-sm font-medium flex items-center gap-1">
                  Email Id
                  <span className="text-xs text-muted-foreground">(Optional)</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter Email Address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center space-x-2 pt-4 border-t">
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
          <div className="space-y-6 pt-4 border-t">
            <h3 className="font-medium">Billing Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="billingMobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Mobile Number</FormLabel>
                    <div className="flex">
                      <div className="flex items-center justify-center h-10 px-3 border rounded-l-md bg-muted">+91</div>
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
                    <FormLabel className="text-sm font-medium flex items-center gap-1">
                      Landmark
                      <span className="text-xs text-muted-foreground">(Optional)</span>
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
