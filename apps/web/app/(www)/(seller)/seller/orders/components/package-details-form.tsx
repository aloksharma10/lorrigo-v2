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

import { Control, UseFormWatch } from 'react-hook-form';
import { OrderFormValues } from '../types';

interface PackageDetailsFormProps {
  control: Control<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
}

export function PackageDetailsForm({ control, watch }: PackageDetailsFormProps) {
  const [applicableWeight, setApplicableWeight] = useState('0');
  const [volumetricWeight, setVolumetricWeight] = useState('0');

  const watchedDimensions = watch([
    'packageDetails.length',
    'packageDetails.breadth',
    'packageDetails.height',
    'packageDetails.deadWeight',
  ]);

  useEffect(() => {
    const [length, breadth, height, deadWeight] = watchedDimensions;
    if (length && breadth && height) {
      const l = Number.parseFloat(length);
      const b = Number.parseFloat(breadth);
      const h = Number.parseFloat(height);
      if (l > 0 && b > 0 && h > 0) {
        const volumetric = (l * b * h) / 5000;
        setVolumetricWeight(volumetric.toFixed(2));
        // control._formValues.packageDetails.volumetricWeight = volumetric.toFixed(2);
        const dead = Number.parseFloat(deadWeight) || 0;
        setApplicableWeight(Math.max(dead, volumetric).toFixed(2));
      }
    }
  }, [watchedDimensions, control]);

  return (
    <div className="space-y-3">
      <Alert className="border-blue-200 bg-blue-50 py-2 dark:bg-blue-900">
        <LightbulbIcon className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
          Add correct values to avoid weight discrepancy
        </AlertDescription>
      </Alert>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="packageDetails.deadWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Dead Weight (kg)
                <p className="text-muted-foreground text-[10px]">Min: 0.5 kg</p>
              </FormLabel>
              <div className="flex">
                <FormControl>
                  <Input {...field} className="h-8 rounded-r-none" />
                </FormControl>
                <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-2 text-xs">
                  kg
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="packageDetails.volumetricWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1 text-xs font-medium">
                Volumetric Weight
                <Info className="text-muted-foreground h-3 w-3" />
              </FormLabel>
              <div className="flex">
                <FormControl>
                  <Input
                    {...field}
                    value={volumetricWeight}
                    readOnly
                    className="bg-muted h-8 rounded-r-none"
                  />
                </FormControl>
                <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-2 text-xs">
                  kg
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div>
        <Label className="text-xs font-medium">Package Dimensions (L×B×H)</Label>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <FormField
            control={control}
            name="packageDetails.length"
            render={({ field }) => (
              <FormItem>
                <div className="flex">
                  <FormControl>
                    <Input placeholder="L" {...field} className="h-8 rounded-r-none" />
                  </FormControl>
                  <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-1 text-xs">
                    cm
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="packageDetails.breadth"
            render={({ field }) => (
              <FormItem>
                <div className="flex">
                  <FormControl>
                    <Input placeholder="B" {...field} className="h-8 rounded-r-none" />
                  </FormControl>
                  <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-1 text-xs">
                    cm
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="packageDetails.height"
            render={({ field }) => (
              <FormItem>
                <div className="flex">
                  <FormControl>
                    <Input placeholder="H" {...field} className="h-8 rounded-r-none" />
                  </FormControl>
                  <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-1 text-xs">
                    cm
                  </div>
                </div>
                <FormMessage />
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
    </div>
  );
}
