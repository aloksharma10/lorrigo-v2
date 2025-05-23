'use client';

import { useState } from 'react';
import {
  Input,
  Label,
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@lorrigo/ui/components';
import { useForm } from 'react-hook-form';

interface SellerFormValues {
  sellerName: string;
  gstNo?: string;
  address?: string;
  contactNumber?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country: string;
}

export function SellerDetailsForm() {
  const [addSellerAddress, setAddSellerAddress] = useState(false);

  const form = useForm<SellerFormValues>({
    defaultValues: {
      sellerName: '',
      gstNo: '',
      address: '',
      contactNumber: '',
      pincode: '',
      city: '',
      state: '',
      country: 'India',
    },
  });

  function onSubmit(values: SellerFormValues) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="sellerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center text-sm font-medium">
                  Seller Name <span className="ml-1 text-red-500">*</span>
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

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                      <Input disabled {...field} value="India" />
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
              <Button type="submit" className="bg-red-600 text-white hover:bg-red-700">
                Add Seller
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
