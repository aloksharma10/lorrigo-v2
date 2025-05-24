'use client';

import { useState, useEffect } from 'react';
import { Info, LightbulbIcon } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Alert,
  AlertDescription,
  Badge,
} from '@lorrigo/ui/components';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const packageDetailsSchema = z.object({
  deadWeight: z.string().min(1, 'Dead weight is required'),
  length: z.string().min(1, 'Length is required'),
  breadth: z.string().min(1, 'Breadth is required'),
  height: z.string().min(1, 'Height is required'),
  volumetricWeight: z.string(),
});

type PackageFormValues = z.infer<typeof packageDetailsSchema>;

interface PackageDetailsFormProps {
  onSubmit: (values: PackageFormValues) => void;
  errors?: Record<string, any>;
}

export function PackageDetailsForm({ onSubmit, errors }: PackageDetailsFormProps) {
  const [applicableWeight, setApplicableWeight] = useState('0');

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageDetailsSchema),
    defaultValues: {
      deadWeight: '0.00',
      length: '',
      breadth: '',
      height: '',
      volumetricWeight: '0',
    },
  });

  // Calculate volumetric weight when dimensions change
  const watchedDimensions = form.watch(['length', 'breadth', 'height', 'deadWeight']);

  useEffect(() => {
    const [length, breadth, height, deadWeight] = watchedDimensions;

    if (length && breadth && height) {
      const l = Number.parseFloat(length);
      const b = Number.parseFloat(breadth);
      const h = Number.parseFloat(height);
      if (l > 0 && b > 0 && h > 0) {
        const volumetric = (l * b * h) / 5000;
        form.setValue('volumetricWeight', volumetric.toFixed(2));

        // Update applicable weight (higher of dead weight and volumetric)
        const dead = Number.parseFloat(deadWeight) || 0;
        setApplicableWeight(Math.max(dead, volumetric).toFixed(2));
      }
    }
  }, [watchedDimensions, form]);

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      onSubmit(value as PackageFormValues);
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

  function handleSubmit(values: PackageFormValues) {
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        <Alert className="border-blue-200 bg-blue-50 py-2 dark:bg-blue-900">
          <LightbulbIcon className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
            Add correct values to avoid weight discrepancy
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="deadWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  Dead Weight (kg)
                  <p className="text-muted-foreground text-[10px]">Min: 0.5 kg</p>
                </FormLabel>
                <div className="flex">
                  <FormControl>
                    <Input {...field} className="h-8 rounded-r-none text-sm" />
                  </FormControl>
                  <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-2 text-xs">
                    kg
                  </div>
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="volumetricWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1 text-xs font-medium">
                  Volumetric Weight
                  <Info className="text-muted-foreground h-3 w-3" />
                </FormLabel>
                <div className="flex">
                  <FormControl>
                    <Input {...field} readOnly className="bg-muted h-8 rounded-r-none text-sm" />
                  </FormControl>
                  <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-2 text-xs">
                    kg
                  </div>
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <div>
          <Label className="text-xs font-medium">Package Dimensions (L×B×H)</Label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            <FormField
              control={form.control}
              name="length"
              render={({ field }) => (
                <FormItem>
                  <div className="flex">
                    <FormControl>
                      <Input placeholder="L" {...field} className="h-8 rounded-r-none text-sm" />
                    </FormControl>
                    <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-1 text-xs">
                      cm
                    </div>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="breadth"
              render={({ field }) => (
                <FormItem>
                  <div className="flex">
                    <FormControl>
                      <Input placeholder="B" {...field} className="h-8 rounded-r-none text-sm" />
                    </FormControl>
                    <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-1 text-xs">
                      cm
                    </div>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <div className="flex">
                    <FormControl>
                      <Input placeholder="H" {...field} className="h-8 rounded-r-none text-sm" />
                    </FormControl>
                    <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-1 text-xs">
                      cm
                    </div>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          <p className="text-muted-foreground mt-1 text-[10px]">Min: 0.50 cm each</p>
        </div>

        <div className="rounded-md border border-green-200 bg-green-50 p-2 dark:bg-green-800">
          <Badge
            variant="outline"
            className="border-green-300 bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-400"
          >
            Applicable Weight: {applicableWeight} kg
          </Badge>
          <p className="mt-1 text-xs text-green-700 dark:text-green-400">
            Higher of dead weight or volumetric weight
          </p>
        </div>
      </form>
    </Form>
  );
}
