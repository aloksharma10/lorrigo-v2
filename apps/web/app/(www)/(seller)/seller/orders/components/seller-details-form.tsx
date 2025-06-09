'use client';

import {
  Input,
  Label,
  Checkbox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@lorrigo/ui/components';
import { Control, UseFormWatch } from 'react-hook-form';
import { type OrderFormValues } from '../types';

interface SellerDetailsFormProps {
  control: Control<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
}

export function SellerDetailsForm({ control, watch }: SellerDetailsFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField
          control={control}
          name="sellerDetails.sellerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center text-sm font-medium">Seller Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter the seller name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="sellerDetails.gstNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">GST NO.</FormLabel>
              <FormControl>
                <Input placeholder="Enter the GST No." maxLength={15} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="sellerDetails.isAddressAvailable"
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

      {watch('sellerDetails.isAddressAvailable') && (
        <div className="space-y-6">
          <FormField
            control={control}
            name="sellerDetails.address"
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
              control={control}
              name="sellerDetails.contactNumber"
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
              control={control}
              name="sellerDetails.pincode"
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
              control={control}
              name="sellerDetails.city"
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
              control={control}
              name="sellerDetails.state"
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
              control={control}
              name="sellerDetails.country"
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
    </div>
  );
}
