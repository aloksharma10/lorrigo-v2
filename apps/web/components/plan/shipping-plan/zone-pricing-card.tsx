import { Card, CardContent, CardHeader, Badge, Input, Switch, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@lorrigo/ui/components';
import type { UseFormReturn } from 'react-hook-form';
import type { ShippingPlanFormData } from '../schemas/shipping-plan-schema';
import { zoneLabels } from '../constants/shipping-plan-constants';

interface ZonePricingCardProps {
  zone: keyof typeof zoneLabels;
  courierIndex: number;
  form: UseFormReturn<ShippingPlanFormData>;
  originalPricing?: any[]; // Add this
}

export function ZonePricingCard({ zone, courierIndex, form, originalPricing }: ZonePricingCardProps) {
  const config = zoneLabels[zone];

  return (
    <Card className="border-l-primary/50 border-l-4 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <config.icon className="text-primary h-4 w-4" />
            </div>
            <span className="font-semibold">{config.name}</span>
          </div>
          <Badge variant="secondary">Zone</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name={`courierPricing.${courierIndex}.zonePricing.${zone}.base_price`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Base Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" className="border-primary/20 focus:border-primary border-2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`courierPricing.${courierIndex}.zonePricing.${zone}.increment_price`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Increment Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" className="border-primary/20 focus:border-primary border-2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name={`courierPricing.${courierIndex}.zonePricing.${zone}.is_rto_same_as_fw`}
          render={({ field }) => (
            <FormItem className="bg-card flex flex-row items-center justify-between space-y-0 rounded-lg border-2 p-3">
              <FormLabel className="font-semibold">RTO Same as Forward</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {!form.watch(`courierPricing.${courierIndex}.zonePricing.${zone}.is_rto_same_as_fw`) && (
          <div className="bg-muted/50 grid grid-cols-1 gap-4 rounded-lg border-2 p-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name={`courierPricing.${courierIndex}.zonePricing.${zone}.rto_base_price`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">RTO Base (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" className="bg-background border-2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`courierPricing.${courierIndex}.zonePricing.${zone}.rto_increment_price`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">RTO Increment (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" className="bg-background border-2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`courierPricing.${courierIndex}.zonePricing.${zone}.flat_rto_charge`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Flat RTO (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" className="bg-background border-2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
