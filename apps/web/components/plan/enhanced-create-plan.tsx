'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';
import {
  toast,
  Button,
  Input,
  Textarea,
  Switch,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Badge,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  FormDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Checkbox,
} from '@lorrigo/ui/components';
import { Trash2, Truck, RefreshCw, DollarSign, MapPin, CheckCircle, Info, Edit3, X, Plus, Settings, Target } from 'lucide-react';

// Import our modular components and utilities
import { FormHeader } from './shipping-plan/form-header';
import { BulkAdjustmentPanel } from './shipping-plan/bulk-adjustment-panel';
import { CourierSelector } from './shipping-plan/courier-selector';
import { ZonePricingCard } from './shipping-plan/zone-pricing-card';
import type { ShippingPlanFormData } from './schemas/shipping-plan-schema';
import { defaultCourierPricing, defaultZonePricing, zoneLabels } from './constants/shipping-plan-constants';
import { formatZonePricing } from './utils/shipping-plan-utils';
import type { EnhancedCreatePlanFormProps, Courier, CourierPricing } from './types/shipping-plan';
import { usePlanOperations } from '@/lib/apis/plans';
import { useCourierOperations } from '@/lib/apis/couriers';

export function EnhancedCreatePlanForm({ planData, isEditing = false }: EnhancedCreatePlanFormProps) {
  const { createPlan, updatePlan, getDefaultPlanCourierPricing } = usePlanOperations();
  const { getCouriersQuery } = useCourierOperations();

  const [isApplyingBulkAdjustment, setIsApplyingBulkAdjustment] = useState(false);
  const [showCourierSelector, setShowCourierSelector] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [originalPricing, setOriginalPricing] = useState<CourierPricing[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedCourierIndices, setSelectedCourierIndices] = useState<Set<number>>(new Set());
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([]);

  // Prepare default values for form based on whether we're editing or creating
  const getDefaultValues = (): ShippingPlanFormData => {
    if (isEditing && planData) {
      return {
        name: planData.name || '',
        description: planData.description || '',
        isDefault: planData.isDefault || false,
        features: planData.features?.length ? planData.features : [''],
        courierPricing: planData.plan_courier_pricings?.length
          ? planData.plan_courier_pricings.map((pricing: any) => ({
              courierId: pricing.courier_id,
              cod_charge_hard: pricing.cod_charge_hard || 0,
              cod_charge_percent: pricing.cod_charge_percent || 0,
              is_fw_applicable: pricing.is_fw_applicable,
              is_rto_applicable: pricing.is_rto_applicable,
              is_cod_applicable: pricing.is_cod_applicable,
              is_cod_reversal_applicable: pricing.is_cod_reversal_applicable,
              weight_slab: pricing.weight_slab || 0.5,
              increment_weight: pricing.increment_weight || 0.5,
              increment_price: pricing.increment_price || 0,
              zonePricing: formatZonePricing(pricing.zone_pricing),
            }))
          : [],
      };
    }

    return {
      name: '',
      description: '',
      isDefault: false,
      features: [''],
      courierPricing: [],
    };
  };

  const form = useForm<ShippingPlanFormData>({
    defaultValues: getDefaultValues(),
    mode: 'onChange' as const,
  });

  const {
    fields: courierFields,
    append: appendCourier,
    remove: removeCourier,
    update: updateCourier,
    replace: replaceCourierPricing,
  } = useFieldArray({
    control: form.control,
    name: 'courierPricing',
  });

  // Initialize form and original pricing
  useEffect(() => {
    if (isEditing && planData) {
      const defaultValues = getDefaultValues();
      form.reset(defaultValues);
      setOriginalPricing(JSON.parse(JSON.stringify(defaultValues.courierPricing)));
    }
  }, [planData, isEditing]);

  // Watch for form changes to detect unsaved changes
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change' && name?.startsWith('courierPricing')) {
        setHasUnsavedChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const couriersQuery = getCouriersQuery();
  const couriers = couriersQuery.data?.couriers || [];
  const isLoadingCouriers = couriersQuery.isLoading;
  const isSubmitting = isEditing ? updatePlan.isPending : createPlan.isPending;

  // Get selected couriers
  const selectedCouriers = courierFields
    .map((field, index) => {
      const courierId = form.watch(`courierPricing.${index}.courierId`);
      const courier = couriers.find((c) => c.id === courierId);
      return { ...field, courier, index };
    })
    .filter((item) => item.courier);

  // Get available couriers (not yet selected)
  const availableCouriers = couriers.filter((courier) => !courierFields.some((_, index) => form.watch(`courierPricing.${index}.courierId`) === courier.id));

  // Feature management functions
  const featureFields = form.watch('features') || [];

  const appendFeature = () => {
    const currentFeatures = form.getValues('features') || [];
    form.setValue('features', [...currentFeatures, ''], { shouldValidate: true });
  };

  const removeFeature = (index: number) => {
    const currentFeatures = form.getValues('features') || [];
    const newFeatures = [...currentFeatures];
    newFeatures.splice(index, 1);
    form.setValue('features', newFeatures, { shouldValidate: true });
  };

  // Selection handlers
  const toggleCourierSelection = (index: number) => {
    const newSelection = new Set(selectedCourierIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedCourierIndices(newSelection);
  };

  const selectAllCouriers = () => {
    const allIndices = selectedCouriers.map((_, index) => index);
    setSelectedCourierIndices(new Set(allIndices));
  };

  const deselectAllCouriers = () => {
    setSelectedCourierIndices(new Set());
  };

  // Accordion control functions
  const expandAllAccordions = () => {
    const allItems = selectedCouriers.map((_, index) => `item-${index}`);
    setExpandedAccordions(allItems);
  };

  const collapseAllAccordions = () => {
    setExpandedAccordions([]);
  };

  const loadDefaultPricing = async (courierId: string, index: number) => {
    try {
      const defaultPricing = await getDefaultPlanCourierPricing(courierId);
      if (defaultPricing) {
        // Update each field individually using form.setValue
        form.setValue(`courierPricing.${index}.cod_charge_hard`, defaultPricing.cod_charge_hard || 0);
        form.setValue(`courierPricing.${index}.cod_charge_percent`, defaultPricing.cod_charge_percent || 0);
        form.setValue(`courierPricing.${index}.is_fw_applicable`, defaultPricing.is_fw_applicable ?? true);
        form.setValue(`courierPricing.${index}.is_rto_applicable`, defaultPricing.is_rto_applicable ?? false);
        form.setValue(`courierPricing.${index}.is_cod_applicable`, defaultPricing.is_cod_applicable ?? true);
        form.setValue(`courierPricing.${index}.is_cod_reversal_applicable`, defaultPricing.is_cod_reversal_applicable ?? true);
        form.setValue(`courierPricing.${index}.weight_slab`, defaultPricing.weight_slab || 0.5);
        form.setValue(`courierPricing.${index}.increment_weight`, defaultPricing.increment_weight || 0.5);
        form.setValue(`courierPricing.${index}.increment_price`, defaultPricing.increment_price || 0);

        // Update zone pricing
        const zones = ['Z_A', 'Z_B', 'Z_C', 'Z_D', 'Z_E'] as const;
        zones.forEach((zone) => {
          const zonePricing = defaultPricing.zonePricing?.[zone];
          if (zonePricing) {
            form.setValue(`courierPricing.${index}.zonePricing.${zone}.base_price`, zonePricing.base_price || 0);
            form.setValue(`courierPricing.${index}.zonePricing.${zone}.increment_price`, zonePricing.increment_price || 0);
            form.setValue(`courierPricing.${index}.zonePricing.${zone}.is_rto_same_as_fw`, zonePricing.is_rto_same_as_fw ?? true);
            form.setValue(`courierPricing.${index}.zonePricing.${zone}.rto_base_price`, zonePricing.rto_base_price || 0);
            form.setValue(`courierPricing.${index}.zonePricing.${zone}.rto_increment_price`, zonePricing.rto_increment_price || 0);
            form.setValue(`courierPricing.${index}.zonePricing.${zone}.flat_rto_charge`, zonePricing.flat_rto_charge || 0);
          }
        });

        setHasUnsavedChanges(true);
        toast.success('Default pricing loaded successfully');
      } else {
        toast.warning('No default pricing found for this courier');
      }
    } catch (error) {
      toast.error('Failed to load default pricing');
    }
  };

  // Fixed bulk adjustment function with direct form field updates
  const applyBulkAdjustment = useCallback(
    (adjustmentPercent: number) => {
      if (adjustmentPercent === 0) {
        toast.warning('Please enter a percentage value');
        return;
      }

      if (selectedCourierIndices.size === 0) {
        toast.warning('Please select at least one courier to apply pricing changes');
        return;
      }

      setIsApplyingBulkAdjustment(true);

      try {
        const adjustmentFactor = 1 + adjustmentPercent / 100;
        const zones = ['Z_A', 'Z_B', 'Z_C', 'Z_D', 'Z_E'] as const;
        const priceFields = ['base_price', 'increment_price', 'rto_base_price', 'rto_increment_price', 'flat_rto_charge'] as const;

        // Apply adjustment to each selected courier
        selectedCourierIndices.forEach((courierIndex) => {
          zones.forEach((zone) => {
            priceFields.forEach((field) => {
              const currentValue = form.getValues(`courierPricing.${courierIndex}.zonePricing.${zone}.${field}`) || 0;
              const adjustedValue = Math.round(currentValue * adjustmentFactor * 100) / 100;

              form.setValue(`courierPricing.${courierIndex}.zonePricing.${zone}.${field}`, adjustedValue, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
              });
            });
          });
        });

        // Force form to re-render by triggering validation
        form.trigger('courierPricing');

        setHasUnsavedChanges(true);

        const selectedCourierNames = Array.from(selectedCourierIndices)
          .map((index) => selectedCouriers[index]?.courier?.name)
          .filter(Boolean);

        toast.success(
          `Applied ${adjustmentPercent}% adjustment to ${selectedCourierIndices.size} selected courier${
            selectedCourierIndices.size > 1 ? 's' : ''
          }: ${selectedCourierNames.join(', ')}`
        );
      } catch (error) {
        toast.error('Failed to apply bulk adjustment');
        console.error('Error applying bulk adjustment:', error);
      } finally {
        setIsApplyingBulkAdjustment(false);
      }
    },
    [form, selectedCourierIndices, selectedCouriers]
  );

  const resetPricing = useCallback(() => {
    if (originalPricing.length > 0) {
      replaceCourierPricing(JSON.parse(JSON.stringify(originalPricing)));
      setHasUnsavedChanges(false);
      setSelectedCourierIndices(new Set());
      toast.success('Pricing reset to original values');
    } else {
      toast.warning('No original pricing to reset to');
    }
  }, [originalPricing, replaceCourierPricing]);

  const handleSubmit = async (data: ShippingPlanFormData) => {
    try {
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

      if (isEditing && planData) {
        await updatePlan.mutateAsync({ id: planData.id, ...payload });
      } else {
        await createPlan.mutateAsync(payload);
      }

      setHasUnsavedChanges(false);
      setSelectedCourierIndices(new Set());
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(error?.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} plan`);
    }
  };

  // Add function to handle multiple courier selection
  const handleSelectMultipleCouriers = (courierIds: string[]) => {
    const newCouriers = courierIds.map((courierId) => {
      // Create a new courier with default pricing
      const newCourier = {
        ...defaultCourierPricing,
        courierId,
        zonePricing: {
          Z_A: { ...defaultZonePricing },
          Z_B: { ...defaultZonePricing },
          Z_C: { ...defaultZonePricing },
          Z_D: { ...defaultZonePricing },
          Z_E: { ...defaultZonePricing },
        },
      };
      return newCourier;
    });

    // Append all new couriers
    newCouriers.forEach((courier) => {
      appendCourier(courier);
    });

    toast.success(`Added ${courierIds.length} couriers to the plan`);
  };

  return (
    <div className="from-background to-muted/20 mx-auto min-h-screen min-w-full space-y-6 bg-gradient-to-br p-6">
      {/* Header */}
      <FormHeader
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={() => {
          const formData = form.getValues() as ShippingPlanFormData;
          handleSubmit(formData);
        }}
      />

      {/* Bulk Adjustment */}
      <BulkAdjustmentPanel
        selectedCourierIndices={selectedCourierIndices}
        selectedCouriers={selectedCouriers}
        hasUnsavedChanges={hasUnsavedChanges}
        onApplyBulkAdjustment={applyBulkAdjustment}
        onResetPricing={resetPricing}
        onSelectAll={selectAllCouriers}
        onDeselectAll={deselectAllCouriers}
        onExpandAll={expandAllAccordions}
        onCollapseAll={collapseAllAccordions}
        isApplying={isApplyingBulkAdjustment}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-card grid w-full grid-cols-3 shadow-md">
              <TabsTrigger value="basic" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center space-x-2">
                <Info className="h-4 w-4" />
                <span>Basic Info</span>
              </TabsTrigger>
              <TabsTrigger value="features" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Features</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Courier Pricing</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card className="border-0 shadow-lg">
                <CardHeader className="from-muted/50 to-muted/30 rounded-t-lg bg-gradient-to-r">
                  <CardTitle className="flex items-center space-x-2">
                    <Edit3 className="text-primary h-5 w-5" />
                    <span>Plan Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Plan Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter plan name" className="focus:border-primary border-2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isDefault"
                      render={({ field }) => (
                        <FormItem className="from-primary/5 to-primary/10 flex flex-row items-center justify-between rounded-lg border-2 bg-gradient-to-r p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-semibold">Default Plan</FormLabel>
                            <FormDescription className="text-sm">Set as default for new users</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                        <FormLabel className="text-sm font-semibold">Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the plan benefits and features" className="focus:border-primary min-h-[120px] border-2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <Card className="border-0 shadow-lg">
                <CardHeader className="rounded-t-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span>Plan Features</span>
                    </CardTitle>
                    <Button type="button" onClick={appendFeature} className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Feature
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {featureFields.map((field, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <FormField
                          control={form.control}
                          name={`features.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="Enter feature" className="border-2 focus:border-green-500" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFeature(index)}
                            className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              {/* Selected Couriers */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="rounded-t-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <span>Courier Pricing Configuration ({selectedCouriers.length})</span>
                    </CardTitle>
                    <CourierSelector
                      availableCouriers={availableCouriers}
                      onSelectCourier={(courierId) => {
                        const newCourier = {
                          ...defaultCourierPricing,
                          courierId,
                          zonePricing: {
                            Z_A: { ...defaultZonePricing },
                            Z_B: { ...defaultZonePricing },
                            Z_C: { ...defaultZonePricing },
                            Z_D: { ...defaultZonePricing },
                            Z_E: { ...defaultZonePricing },
                          },
                        };
                        appendCourier(newCourier);
                      }}
                      onSelectMultipleCouriers={handleSelectMultipleCouriers}
                      open={showCourierSelector}
                      onOpenChange={setShowCourierSelector}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedCouriers.length === 0 ? (
                    <div className="text-muted-foreground py-12 text-center">
                      <div className="bg-muted/50 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full p-4">
                        <Truck className="h-12 w-12 opacity-50" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold">No couriers selected</h3>
                      <p className="text-sm">Add a courier to configure pricing</p>
                    </div>
                  ) : (
                    <Accordion type="multiple" className="w-full space-y-4" value={expandedAccordions} onValueChange={setExpandedAccordions}>
                      {selectedCouriers.map(({ courier, index }) => (
                        <AccordionItem
                          key={`courier-${index}`}
                          value={`item-${index}`}
                          className={`rounded-lg border-2 shadow-sm transition-all duration-200 ${
                            selectedCourierIndices.has(index) ? 'border-orange-500 bg-orange-50 dark:border-orange-400 dark:bg-orange-950/20' : 'border-border'
                          }`}
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex w-full items-center justify-between pr-4">
                              <div className="flex items-center space-x-4">
                                <Checkbox
                                  checked={selectedCourierIndices.has(index)}
                                  onClick={(e) => e.stopPropagation()}
                                  onCheckedChange={() => toggleCourierSelection(index)}
                                />
                                <div
                                  className={`rounded-lg p-3 ${
                                    selectedCourierIndices.has(index)
                                      ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                      : 'from-primary to-primary/80 bg-gradient-to-r'
                                  }`}
                                >
                                  <Truck className="text-primary-foreground h-5 w-5" />
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center space-x-2 text-lg font-semibold">
                                    <span>{courier?.name}</span>
                                    {selectedCourierIndices.has(index) && (
                                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">Selected</Badge>
                                    )}
                                  </div>
                                  <div className="text-muted-foreground text-sm">Code: {courier?.code}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Badge
                                  variant={courier?.is_active ? 'default' : 'secondary'}
                                  className={courier?.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}
                                >
                                  {courier?.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                {selectedCouriers.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeCourier(index);
                                      // Remove from selection if it was selected
                                      const newSelection = new Set(selectedCourierIndices);
                                      newSelection.delete(index);
                                      setSelectedCourierIndices(newSelection);
                                    }}
                                    className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-6">
                            <div className="space-y-8">
                              {/* Quick Actions */}
                              <div className="flex items-center space-x-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => loadDefaultPricing(courier!.id, index)}
                                  className="border-primary/20 text-primary hover:bg-primary/10"
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Load Defaults
                                </Button>
                                {selectedCourierIndices.has(index) && <Badge variant="secondary">This courier will be affected by bulk adjustments</Badge>}
                              </div>

                              {/* Weight & Pricing Settings */}
                              <Card className="from-muted/30 to-muted/20 bg-gradient-to-r">
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center space-x-2 text-base">
                                    <Settings className="h-4 w-4" />
                                    <span>Weight & Pricing Configuration</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <FormField
                                      control={form.control}
                                      name={`courierPricing.${index}.weight_slab`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm font-semibold">Weight Slab (kg)</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="0.1" min="0.1" className="focus:border-primary border-2" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`courierPricing.${index}.increment_weight`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm font-semibold">Increment Weight (kg)</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="0.1" min="0.1" className="focus:border-primary border-2" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`courierPricing.${index}.increment_price`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm font-semibold">Increment Price (₹)</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="0.01" min="0" className="focus:border-primary border-2" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Service Settings */}
                              <Card className="from-primary/5 to-primary/10 bg-gradient-to-r">
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center space-x-2 text-base">
                                    <Target className="h-4 w-4" />
                                    <span>Service Configuration</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    <FormField
                                      control={form.control}
                                      name={`courierPricing.${index}.is_fw_applicable`}
                                      render={({ field }) => (
                                        <FormItem className="bg-card flex flex-row items-center justify-between space-y-0 rounded-lg border-2 p-3">
                                          <FormLabel className="text-sm font-semibold">Forward</FormLabel>
                                          <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`courierPricing.${index}.is_rto_applicable`}
                                      render={({ field }) => (
                                        <FormItem className="bg-card flex flex-row items-center justify-between space-y-0 rounded-lg border-2 p-3">
                                          <FormLabel className="text-sm font-semibold">RTO</FormLabel>
                                          <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`courierPricing.${index}.is_cod_applicable`}
                                      render={({ field }) => (
                                        <FormItem className="bg-card flex flex-row items-center justify-between space-y-0 rounded-lg border-2 p-3">
                                          <FormLabel className="text-sm font-semibold">COD</FormLabel>
                                          <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`courierPricing.${index}.is_cod_reversal_applicable`}
                                      render={({ field }) => (
                                        <FormItem className="bg-card flex flex-row items-center justify-between space-y-0 rounded-lg border-2 p-3">
                                          <FormLabel className="text-sm font-semibold">COD Reversal</FormLabel>
                                          <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </CardContent>
                              </Card>

                              {/* COD Charges */}
                              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center space-x-2 text-base">
                                    <DollarSign className="h-4 w-4" />
                                    <span>COD Charges</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <FormField
                                      control={form.control}
                                      name={`courierPricing.${index}.cod_charge_hard`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm font-semibold">COD Charge (₹)</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="0.01" min="0" className="border-2 focus:border-green-500" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`courierPricing.${index}.cod_charge_percent`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm font-semibold">COD Charge (%)</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="0.01" min="0" max="100" className="border-2 focus:border-green-500" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Zone Pricing */}
                              <div className="space-y-6">
                                <h4 className="flex items-center space-x-2 text-lg font-semibold">
                                  <MapPin className="text-primary h-5 w-5" />
                                  <span>Zone-wise Pricing Configuration</span>
                                </h4>
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                  {Object.entries(zoneLabels).map(([zone, config]) => (
                                    <ZonePricingCard
                                      key={zone}
                                      zone={zone as keyof typeof zoneLabels}
                                      courierIndex={index}
                                      form={form}
                                      originalPricing={originalPricing}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
