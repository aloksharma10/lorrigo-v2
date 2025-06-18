'use client';

import { useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Form,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  FormMessage,
  FormField,
  FormItem,
  FormLabel,
  Input,
  FormControl,
  toast,
} from '@lorrigo/ui/components';

import { PickupAddressSelector } from './pickup-address-selector';
import { DeliveryDetailsForm } from './delivery-details-form';
import { ProductDetailsForm } from './product-details-form';
import { PaymentMethodSelector } from './payment-method-selector';
import { PackageDetailsForm } from './package-details-form';
import { SellerDetailsForm } from './seller-details-form';
import { InvoiceDetailsForm } from './invoice-details-form';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type OrderFormValues, orderFormSchema } from '@lorrigo/utils/validations';
import { z } from 'zod';
import { ORDER_CHANNELS } from '@/lib/order-channels';
import useFetchCityState from '@/lib/hooks/use-fetch-city-state';

export type OrderFormMode = 'create' | 'edit' | 'clone';

interface OrderFormProps {
  initialValues?: any;
  onSubmit: (values: z.infer<typeof orderFormSchema>) => Promise<void>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  mode?: OrderFormMode;
}

export interface OrderFormRef {
  submitForm: () => void;
  getFormValues: () => OrderFormValues;
}

export const OrderForm = forwardRef<OrderFormRef, OrderFormProps>(({
  initialValues,
  onSubmit,
  isSubmitting = false,
  submitButtonText = 'Create Order',
  mode = 'create',
}, ref) => {
  const isEditMode = mode === 'edit';
  const isCloneMode = mode === 'clone';

  // Initialize the form with default values or provided initialValues
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      orderId: '',
      orderChannel: ORDER_CHANNELS[0]?.name ?? 'Custom',
      orderType: 'domestic',
      pickupAddressId: '',
      sellerDetails: {
        name: '',
        gstNo: '',
        address: '',
        contactNumber: '',
        pincode: '',
        city: '',
        state: '',
        country: 'India',
        isAddressAvailable: false,
      },
      deliveryDetails: {
        isBusiness: false,
        mobileNumber: '',
        fullName: '',
        completeAddress: '',
        landmark: '',
        pincode: '',
        city: '',
        state: '',
        email: '',
        billingIsSameAsDelivery: true,
        billingMobileNumber: '',
        billingFullName: '',
        billingCompleteAddress: '',
        billingLandmark: '',
        billingPincode: '',
        billingCity: '',
        billingState: '',
      },
      productDetails: {
        products: [
          {
            id: '',
            name: '',
            price: 0,
            quantity: 1,
            taxRate: 0,
            hsnCode: '',
          },
        ],
        taxableValue: 0,
      },
      paymentMethod: {
        paymentMethod: 'prepaid',
      },
      amountToCollect: 0,
      order_invoice_date: new Date(),
      order_invoice_number: '',
      ewaybill: '',
      packageDetails: {
        deadWeight: '0.00',
        length: '',
        breadth: '',
        height: '',
        volumetricWeight: '0',
      },
    },
  });

  // Expose form methods to parent component
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      form.handleSubmit(handleSubmit)();
    },
    getFormValues: () => form.getValues(),
  }));

  const { cityState, isTyping, loading: isPincodeLoading } = useFetchCityState(form.watch('deliveryDetails.pincode'))
  const { cityState: sellerCityState, isTyping: isSellerTyping, loading: isSellerPincodeLoading } = useFetchCityState(form.watch('sellerDetails.pincode'))
  const loading = isPincodeLoading || isTyping || isSellerPincodeLoading || isSellerTyping

  // Set form values when initialValues change
  useEffect(() => {
    if (initialValues) {
      // Map the initialValues to the form structure
      const mappedValues: Partial<OrderFormValues> = {
        orderId: initialValues.orderNumber || initialValues.orderId || '',
        orderChannel: initialValues.orderChannel || ORDER_CHANNELS[0]?.name || 'Custom',
        orderType: initialValues.orderType || 'domestic',
        pickupAddressId: initialValues.pickupAddressId || initialValues.hub?.id || '',

        // Map other fields as needed based on your data structure
        sellerDetails: initialValues.sellerDetails,

        deliveryDetails: initialValues.deliveryDetails || {
          isBusiness: initialValues.customer?.isBusiness || false,
          mobileNumber: initialValues.customer?.phone || '',
          fullName: initialValues.customer?.name || '',
          completeAddress: initialValues.customer?.address || '',
          landmark: initialValues.customer?.landmark || '',
          pincode: initialValues.customer?.pincode || '',
          city: initialValues.customer?.city || '',
          state: initialValues.customer?.state || '',
          email: initialValues.customer?.email || '',
          billingIsSameAsDelivery: true,
          billingMobileNumber: '',
          billingFullName: '',
          billingCompleteAddress: '',
          billingLandmark: '',
          billingPincode: '',
          billingCity: '',
          billingState: '',
        },

        productDetails: {
          products: initialValues.productDetails?.products || [],
          taxableValue: initialValues.productDetails?.taxableValue || 0,
        },

        paymentMethod: {
          paymentMethod: initialValues.paymentType?.toLowerCase() || 'prepaid',
        },

        order_invoice_number: initialValues.orderInvoiceNumber || '',
        order_invoice_date: initialValues.orderInvoiceDate || '',
        ewaybill: initialValues.ewaybill || '',

        amountToCollect: initialValues.amountToCollect || 0,

        packageDetails: {
          deadWeight: initialValues.packageDetails?.deadWeight?.toString() || '0.00',
          length: initialValues.packageDetails?.length?.toString() || '',
          breadth: initialValues.packageDetails?.breadth?.toString() || '',
          height: initialValues.packageDetails?.height?.toString() || '',
          volumetricWeight: initialValues.packageDetails?.volumetricWeight?.toString() || '0',
        },
      };

      // Set values in the form
      Object.entries(mappedValues).forEach(([key, value]) => {
        if (value !== undefined) {
          form.setValue(key as any, value);
        }
      });
    }
  }, [initialValues, form]);

  useEffect(() => {
    if (cityState) {
      form.setValue('deliveryDetails.city', cityState.city)
      form.setValue('deliveryDetails.state', cityState.state)
    }
    return () => {
      form.setValue('deliveryDetails.city', '')
      form.setValue('deliveryDetails.state', '')
    }
  }, [cityState])

  useEffect(() => {
    if (sellerCityState) {
      form.setValue('sellerDetails.city', sellerCityState.city)
      form.setValue('sellerDetails.state', sellerCityState.state)
    }
    return () => {
      form.setValue('sellerDetails.city', '')
      form.setValue('sellerDetails.state', '')
    }
  }, [sellerCityState])

  async function handleSubmit(values: OrderFormValues) {
    try {
      const validatedData = orderFormSchema.parse(values);
      await onSubmit(validatedData);
    } catch (error: any) {
      toast.error(
        error.response.data.message ||
        'Failed to create order, Please Report us at support@lorrigo.in'
      );
      if (error instanceof z.ZodError) {
        // Set form errors
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          form.setError(path as any, {
            type: 'manual',
            message: err.message,
          });
        });

        // Show error toast
        toast.error('Please check all fields and try again');
      }
    }
  }

  const handlePickupAddressSelect = (address: any) => {
    form.setValue('pickupAddressId', address.id);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="orderChannel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-black">Order Channel</span>
                    <span className="text-muted-foreground text-xs">(Your order source)</span>
                  </FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {ORDER_CHANNELS.map((channel) => (
                      <div
                        key={channel.name}
                        onClick={() => field.onChange(channel.name)}
                        className="flex cursor-pointer items-center gap-2 capitalize"
                      >
                        <Badge variant={field.value === channel.name ? 'default' : 'outline'}>
                          {channel.icon} {channel.name.toLocaleLowerCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-sm font-medium">
                    Order ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter the order id"
                      {...field}
                      disabled={isEditMode} // Disable in edit mode
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pickup Address</CardTitle>
          </CardHeader>
          <CardContent>
            <PickupAddressSelector
              onAddressSelect={handlePickupAddressSelect}
              error={form.formState.errors.pickupAddressId?.message}
              initialAddressId={form.getValues('pickupAddressId')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seller Details</CardTitle>
          </CardHeader>
          <CardContent>
            <SellerDetailsForm control={form.control} watch={form.watch} isLoading={loading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Details</CardTitle>
            <p className="text-muted-foreground text-sm">
              Enter the Delivery Details of your buyer for whom you are making this order
            </p>
          </CardHeader>
          <CardContent>
            <DeliveryDetailsForm control={form.control} watch={form.watch} isLoading={loading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductDetailsForm control={form.control} watch={form.watch} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <p className="text-muted-foreground text-sm">
              Select and enter the payment details, chosen by the buyer for this order.
            </p>
          </CardHeader>
          <CardContent>
            <PaymentMethodSelector control={form.control} watch={form.watch} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <p className="text-muted-foreground text-sm">
              Provide the details of the invoice that includes all the ordered items
            </p>
          </CardHeader>
          <CardContent>
            <InvoiceDetailsForm control={form.control} watch={form.watch} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Package Details</CardTitle>
            <p className="text-muted-foreground text-sm">
              Provide the details of the final package that includes all the ordered items
              packed together.
            </p>
          </CardHeader>
          <CardContent>
            <PackageDetailsForm control={form.control} watch={form.watch} />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 flex lg:py-3 justify-end backdrop-blur-xs border-t border-neutral-200 dark:border-neutral-800">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
});

OrderForm.displayName = 'OrderForm';