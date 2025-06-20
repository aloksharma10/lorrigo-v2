'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  toast,
  Button,
  Input,
  Textarea,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Separator,
  Badge,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@lorrigo/ui/components';
import { Plus, Trash2, Loader2, Package, Truck } from 'lucide-react';
import { usePlanOperations } from '@/lib/apis/plans';
import { useCourierOperations } from '@/lib/apis/couriers';

interface Courier {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

const zonePricingSchema = z.object({
  base_price: z.coerce.number().min(0, 'Base price must be positive'),
  is_fw_applicable: z.boolean().optional(),
  increment_price: z.coerce.number().min(0, 'Increment price must be positive'),
  is_rto_same_as_fw: z.boolean(),
  rto_base_price: z.coerce.number().min(0, 'RTO base price must be positive'),
  rto_increment_price: z.coerce.number().min(0, 'RTO increment price must be positive'),
  flat_rto_charge: z.coerce.number().min(0, 'Flat RTO charge must be positive'),
});

const courierPricingSchema = z.object({
  courierId: z.string().min(1, 'Please select a courier'),
  cod_charge_hard: z.coerce.number().min(0, 'COD charge must be positive'),
  cod_charge_percent: z.coerce.number().min(0).max(100, 'COD percentage must be between 0-100'),
  is_fw_applicable: z.boolean(),
  is_rto_applicable: z.boolean(),
  is_cod_applicable: z.boolean(),
  is_cod_reversal_applicable: z.boolean(),
  weight_slab: z.coerce.number().min(0.1, 'Weight slab must be at least 0.1kg'),
  increment_weight: z.coerce.number().min(0.1, 'Increment weight must be at least 0.1kg'),
  increment_price: z.coerce.number().min(0, 'Increment price must be positive'),
  zonePricing: z.object({
    withinCity: zonePricingSchema,
    withinZone: zonePricingSchema,
    withinMetro: zonePricingSchema,
    withinRoi: zonePricingSchema,
    northEast: zonePricingSchema,
  }),
});

const formSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100, 'Plan name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  isDefault: z.boolean(),
  features: z
    .array(z.string().min(1, 'Feature cannot be empty'))
    .min(1, 'At least one feature is required'),
  courierPricing: z.array(courierPricingSchema).min(1, 'At least one courier pricing is required'),
});

type FormData = z.infer<typeof formSchema>;

interface CreatePlanModalProps {
  onClose: () => void;
}

const defaultZonePricing = {
  base_price: 0,
  is_fw_applicable: false,
  increment_price: 0,
  is_rto_same_as_fw: true,
  rto_base_price: 0,
  rto_increment_price: 0,
  flat_rto_charge: 0,
};

const defaultCourierPricing = {
  courierId: '',
  cod_charge_hard: 0,
  cod_charge_percent: 0,
  is_fw_applicable: true,
  is_rto_applicable: false,
  is_cod_applicable: true,
  is_cod_reversal_applicable: true,
  weight_slab: 0.5,
  increment_weight: 0.5,
  increment_price: 0,
  zonePricing: {
    withinCity: { ...defaultZonePricing },
    withinZone: { ...defaultZonePricing, is_rto_same_as_fw: false },
    withinMetro: { ...defaultZonePricing },
    withinRoi: { ...defaultZonePricing, is_rto_same_as_fw: false },
    northEast: { ...defaultZonePricing },
  },
};

export function CreatePlanForm() {
  const { createPlan } = usePlanOperations();
  const { getCouriersQuery } = useCourierOperations();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      isDefault: false,
      features: [''],
      courierPricing: [defaultCourierPricing],
    },
  });

  const {
    fields: featureFields,
    append: appendFeature,
    remove: removeFeature,
  } = useFieldArray({
    control: form.control,
    // @ts-ignore
    name: 'features',
  });

  const {
    fields: courierFields,
    append: appendCourier,
    remove: removeCourier,
  } = useFieldArray({
    control: form.control,
    name: 'courierPricing',
  });

  const couriers: Courier[] = getCouriersQuery.data || [];
  const isLoadingCouriers = getCouriersQuery.isLoading;
  const isCreating = createPlan.isPending;

  const handleSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      features: data.features.filter((feature) => feature.trim() !== ''),
      courierPricing: data.courierPricing.map((courier) => ({
        ...courier,
        cod_charge_hard: Number(courier.cod_charge_hard),
        cod_charge_percent: Number(courier.cod_charge_percent),
        weight_slab: Number(courier.weight_slab),
        increment_weight: Number(courier.increment_weight),
        increment_price: Number(courier.increment_price),
        zonePricing: Object.fromEntries(
          Object.entries(courier.zonePricing).map(([zone, pricing]) => [
            zone,
            {
              ...pricing,
              base_price: Number(pricing.base_price),
              increment_price: Number(pricing.increment_price),
              rto_base_price: Number(pricing.rto_base_price),
              rto_increment_price: Number(pricing.rto_increment_price),
              flat_rto_charge: Number(pricing.flat_rto_charge),
            },
          ])
        ),
      })),
    };

    try {
      await createPlan.mutateAsync(payload);
      toast.success('Plan created successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create plan');
    }
  };

  const zoneLabels = {
    withinCity: 'Within City',
    withinZone: 'Within Zone',
    withinMetro: 'Within Metro',
    withinRoi: 'Within ROI',
    northEast: 'North East',
  };

  const PlanSubmitBtn = () => {
    return (
      <div className="flex gap-4">
        <Button
          isLoading={isCreating}
          variant="default"
          type="submit"
          onClick={() => {
            form.handleSubmit(handleSubmit)();
          }}
        >
          Create Plan
        </Button>
      </div>
    );
  };

  return (
    <Card className="mx-auto flex w-full flex-col">
      {/* Fixed Header */}
      <CardHeader className="bg-background sticky top-0 z-10 flex items-center justify-between gap-4 border-b p-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create New Plan
          </CardTitle>
          <CardDescription>Configure a new shipping plan with courier pricing</CardDescription>
        </div>
        <PlanSubmitBtn />
      </CardHeader>

      {/* Scrollable Content */}
      <CardContent className="flex-1 overflow-y-auto p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* Basic Plan Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Plan Information</h3>
                <Badge variant="outline">Required</Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter plan name" disabled={isCreating} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Default Plan</FormLabel>
                        <div className="text-muted-foreground text-sm">
                          Set this as the default plan for new users
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isCreating}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter plan description"
                        className="min-h-[80px]"
                        disabled={isCreating}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Features Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Plan Features</h3>
                  <Badge variant="outline">{featureFields.length} features</Badge>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  // @ts-ignore
                  onClick={() => appendFeature('Limited Time Offer')}
                  disabled={isCreating}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feature
                </Button>
              </div>

              <div className="space-y-2">
                {featureFields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`features.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input placeholder="Enter feature" disabled={isCreating} {...field} />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeFeature(index)}
                            disabled={featureFields.length === 1 || isCreating}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Courier Pricing Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Courier Pricing</h3>
                  <Badge variant="outline">{courierFields.length} couriers</Badge>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendCourier(defaultCourierPricing)}
                  disabled={isCreating}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Courier
                </Button>
              </div>

              <Accordion type="multiple" className="space-y-4">
                {courierFields.map((field, courierIndex) => {
                  const selectedCourier = couriers.find(
                    (c) => c.id === form.watch(`courierPricing.${courierIndex}.courierId`)
                  );

                  return (
                    <AccordionItem
                      key={field.id}
                      value={`courier-${courierIndex}`}
                      className="rounded-lg border"
                    >
                      <>
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="mr-4 flex w-full items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              <span className="font-medium">
                                {selectedCourier
                                  ? `${selectedCourier.name}`
                                  : `Courier ${courierIndex + 1}`}
                              </span>
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (courierFields.length > 1 && !isCreating) {
                                  removeCourier(courierIndex);
                                }
                              }}
                              className={`hover:bg-destructive/10 text-destructive cursor-pointer rounded p-1 ${
                                courierFields.length === 1 || isCreating
                                  ? 'cursor-not-allowed opacity-50'
                                  : ''
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-6">
                            {/* Courier Selection */}
                            <FormField
                              control={form.control}
                              name={`courierPricing.${courierIndex}.courierId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Select Courier</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    disabled={isLoadingCouriers || isCreating}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue
                                          placeholder={
                                            isLoadingCouriers
                                              ? 'Loading couriers...'
                                              : 'Choose a courier'
                                          }
                                        />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {couriers.map((courier) => (
                                        <SelectItem key={courier.id} value={courier.id}>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{courier.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Basic Pricing */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                              <FormField
                                control={form.control}
                                name={`courierPricing.${courierIndex}.cod_charge_hard`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>COD Charge (Fixed)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        disabled={isCreating}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`courierPricing.${courierIndex}.cod_charge_percent`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>COD Charge (%)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        max="100"
                                        disabled={isCreating}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`courierPricing.${courierIndex}.weight_slab`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Weight Slab (kg)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        disabled={isCreating}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`courierPricing.${courierIndex}.increment_weight`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Increment Weight (kg)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        disabled={isCreating}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`courierPricing.${courierIndex}.increment_price`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Increment Price</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        disabled={isCreating}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Service Options */}
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                              {[
                                { name: 'is_fw_applicable', label: 'Forward Applicable' },
                                { name: 'is_rto_applicable', label: 'RTO Applicable' },
                                { name: 'is_cod_applicable', label: 'COD Applicable' },
                                { name: 'is_cod_reversal_applicable', label: 'COD Reversal' },
                              ].map((option) => (
                                <FormField
                                  key={option.name}
                                  control={form.control}
                                  name={`courierPricing.${courierIndex}.${option.name}` as any}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                      <div className="space-y-0.5">
                                        <FormLabel className="text-sm">{option.label}</FormLabel>
                                      </div>
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          disabled={isCreating}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>

                            {/* Zone Pricing */}
                            <div className="space-y-4">
                              <h4 className="text-md font-semibold">Zone Pricing</h4>
                              <div className="grid grid-cols-1 gap-4 space-y-4 md:grid-cols-3">
                                {Object.entries(zoneLabels).map(([zoneKey, zoneLabel]) => (
                                  <div key={zoneKey} className="space-y-4 rounded-lg border p-4">
                                    <h5 className="text-sm font-medium">{zoneLabel}</h5>
                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                                      <FormField
                                        control={form.control}
                                        name={
                                          `courierPricing.${courierIndex}.zonePricing.${zoneKey}.base_price` as any
                                        }
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">Base Price</FormLabel>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                disabled={isCreating}
                                                {...field}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name={
                                          `courierPricing.${courierIndex}.zonePricing.${zoneKey}.increment_price` as any
                                        }
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">
                                              Increment Price
                                            </FormLabel>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                disabled={isCreating}
                                                {...field}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name={
                                          `courierPricing.${courierIndex}.zonePricing.${zoneKey}.rto_base_price` as any
                                        }
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">
                                              RTO Base Price
                                            </FormLabel>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                disabled={isCreating}
                                                {...field}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name={
                                          `courierPricing.${courierIndex}.zonePricing.${zoneKey}.rto_increment_price` as any
                                        }
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">RTO Increment</FormLabel>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                disabled={isCreating}
                                                {...field}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name={
                                          `courierPricing.${courierIndex}.zonePricing.${zoneKey}.flat_rto_charge` as any
                                        }
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">
                                              Flat RTO Charge
                                            </FormLabel>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                disabled={isCreating}
                                                {...field}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name={
                                          `courierPricing.${courierIndex}.zonePricing.${zoneKey}.is_rto_same_as_fw` as any
                                        }
                                        render={({ field }) => (
                                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                                            <div className="space-y-0.5">
                                              <FormLabel className="text-xs">
                                                RTO Same as FW
                                              </FormLabel>
                                            </div>
                                            <FormControl>
                                              <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isCreating}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Fixed Footer */}
      <CardFooter className="bg-muted/20 flex-shrink-0 border-t p-6">
        <PlanSubmitBtn />
      </CardFooter>
    </Card>
  );
}
