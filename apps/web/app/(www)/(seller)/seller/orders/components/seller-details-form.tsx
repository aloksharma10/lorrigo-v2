"use client"

import { useEffect } from "react"
import {
  Input,
  Label,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lorrigo/ui/components"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { type SellerFormValues, sellerDetailsSchema } from "../types"

interface SellerDetailsFormProps {
  onSubmit: (values: SellerFormValues) => void
  errors?: Record<string, any>
}

export function SellerDetailsForm({ onSubmit, errors }: SellerDetailsFormProps) {
  const form = useForm<SellerFormValues>({
    resolver: zodResolver(sellerDetailsSchema),
    defaultValues: {
      sellerName: "",
      gstNo: "",
      address: "",
      contactNumber: "",
      pincode: "",
      city: "",
      state: "",
      country: "India",
    },
  })

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      onSubmit(value as SellerFormValues)
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

  function handleSubmit(values: SellerFormValues) {
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="sellerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center text-sm font-medium">
                  Seller Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter the seller name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gstNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">GST NO.</FormLabel>
                <FormControl>
                  <Input placeholder="Enter the GST No." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isAddressAvailable"
          render={({ field }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-seller-address"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked as boolean)}
              />
              <Label htmlFor="add-seller-address" className="font-medium">
                Add Seller Address
              </Label>
            </div>
          )}
        />

        {form.watch("isAddressAvailable") && (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the contact number" {...field} />
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
                      <Input placeholder="Enter the pincode" {...field} />
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
                      <Input placeholder="Enter the city" {...field} />
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
                      <Input placeholder="Enter the state" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Country</FormLabel>
                    <FormControl>
                      <Input disabled {...field} value="India" />
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
