"use client"

import { useState } from "react"
import { Input, Label, Button, Checkbox, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@lorrigo/ui/components"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const sellerFormSchema = z.object({
  sellerName: z.string().min(1, { message: "Seller name is required" }),
  gstNo: z.string().optional(),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  pincode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("India"),
})

export function SellerDetailsForm() {
  const [addSellerAddress, setAddSellerAddress] = useState(false)

  const form = useForm<z.infer<typeof sellerFormSchema>>({
    resolver: zodResolver(sellerFormSchema),
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

  function onSubmit(values: z.infer<typeof sellerFormSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="sellerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium flex items-center">
                  SELLER NAME <span className="text-red-500 ml-1">*</span>
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

        <div className="flex items-center space-x-2">
          <Checkbox
            id="add-seller-address"
            checked={addSellerAddress}
            onCheckedChange={(checked) => setAddSellerAddress(checked as boolean)}
          />
          <Label htmlFor="add-seller-address" className="font-medium">
            Add Seller Address
          </Label>
        </div>

        {addSellerAddress && (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">ADDRESS</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">CONTACT NUMBER</FormLabel>
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
                    <FormLabel className="text-sm font-medium">PINCODE</FormLabel>
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
                    <FormLabel className="text-sm font-medium">CITY</FormLabel>
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
                    <FormLabel className="text-sm font-medium">STATE</FormLabel>
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
                    <FormLabel className="text-sm font-medium">COUNTRY</FormLabel>
                    <FormControl>
                      <Input value="India" disabled {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Reset
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                Add Seller
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  )
}
