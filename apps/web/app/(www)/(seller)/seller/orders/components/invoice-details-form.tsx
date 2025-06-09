'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Calendar,
  Popover,
  PopoverTrigger,
  Button,
  PopoverContent,
} from '@lorrigo/ui/components';

import { Control, UseFormWatch } from 'react-hook-form';
import { OrderFormValues } from '../types';
import { cn } from '@lorrigo/ui/lib/utils';
import { formatDate } from '@lorrigo/utils';

interface InvoiceDetailsFormProps {
  control: Control<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
}

export function InvoiceDetailsForm({ control, watch }: InvoiceDetailsFormProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <FormField
        control={control}
        name="order_invoice_number"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Invoice Number</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter Invoice Number" className="h-8" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="order_invoice_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Invoice Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'p-0 text-left font-normal',
                      !field.value && 'text-muted-foreground'
                    )}
                  >
                    {field.value ? (
                      formatDate(field.value, { year: 'numeric', month: 'long', day: 'numeric' })
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={field.onChange}
                  disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="ewaybill"
        render={({ field }) => (
          <FormItem>
            <FormLabel>EWay Bill Number</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter EWay Bill Number" className="h-8" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
