'use client';

import {
  RadioGroup,
  RadioGroupItem,
  Label,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  FormLabel,
} from '@lorrigo/ui/components';
import { Info } from 'lucide-react';
import { Control, useForm, UseFormWatch } from 'react-hook-form';
import { useEffect } from 'react';
import { OrderFormValues } from '../types';

// Create explicit interface for form values
interface PaymentFormValues {
  paymentMethod: 'cod' | 'prepaid';
}
// Payment Method Selector
interface PaymentMethodSelectorProps {
  control: Control<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
}

export function PaymentMethodSelector({ control, watch }: PaymentMethodSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <FormField
        control={control}
        name="paymentMethod.paymentMethod"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2 rounded-md border p-2">
                  <RadioGroupItem value="prepaid" id="prepaid" />
                  <Label htmlFor="prepaid" className="flex items-center gap-2">
                    Prepaid
                    <Info className="text-muted-foreground h-4 w-4" />
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border p-2">
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod" className="flex items-center gap-2">
                    Cash on Delivery
                    <Info className="text-muted-foreground h-4 w-4" />
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {watch('paymentMethod.paymentMethod') === 'cod' && <div className="flex flex-col gap-2">
        <FormField
          control={control}
          name="amountToCollect"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount to Collect</FormLabel>
              <div className="mt-1 flex items-center">
                <span className="bg-muted text-muted-foreground flex h-9 w-10 items-center justify-center rounded-l-md border border-r-0">
                  ₹
                </span>
                <FormControl>
                  <Input
                    id="amountToCollect"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                    className="rounded-l-none"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>}
    </div>
  );
}
