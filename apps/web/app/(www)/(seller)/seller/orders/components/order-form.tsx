'use client';

import { useState } from 'react';
import { ArrowLeft, ChevronDown, Info } from 'lucide-react';
import {
  Form,
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  toast,
  Badge,
  FormMessage,
  FormField,
  FormItem,
  FormLabel,
  Input,
  FormControl,
} from '@lorrigo/ui/components';

import { PickupAddressSelector } from './pickup-address-selector';
import { DeliveryDetailsForm } from './delivery-details-form';
import { ProductDetailsForm } from './product-details-form';
import { PaymentMethodSelector } from './payment-method-selector';
import { PackageDetailsForm } from './package-details-form';
import { SellerDetailsForm } from './seller-details-form';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type OrderFormValues, orderFormSchema } from '../types';
import { z } from 'zod';
import { ORDER_CHANNELS } from '@/lib/order-channels';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BackButton } from '@/components/back-btn';

export default function OrderForm() {
  const router = useRouter();
  const [orderType, setOrderType] = useState<'domestic' | 'international'>('domestic');
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [isAddressVerified, setIsAddressVerified] = useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      orderId: '',
      orderChannel: '',
      orderType: 'domestic',
      pickupAddressId: '',
      sellerDetails: {
        sellerName: '',
        gstNo: '',
        address: '',
        contactNumber: '',
        pincode: '',
        city: '',
        state: '',
        country: 'India',
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
      },
      paymentMethod: {
        paymentMethod: 'prepaid',
      },
      packageDetails: {
        deadWeight: '0.00',
        length: '',
        breadth: '',
        height: '',
        volumetricWeight: '0',
      },
    },
  });

  async function onSubmit(values: OrderFormValues) {
    try {
      const validatedData = orderFormSchema.parse(values);
      console.log('Complete Form Values:', validatedData);
      toast.success('Order created successfully');
    } catch (error) {
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
      console.error('Validation error:', error);
    }
  }

  // Safe handler for Tabs onValueChange
  // const handleOrderTypeChange = (value: string) => {
  //   const safeValue = value === 'international' ? 'international' : 'domestic';
  //   setOrderType(safeValue);
  //   form.setValue('orderType', safeValue);
  // };

  const handlePickupAddressSelect = (address: any) => {
    setSelectedAddress(address);
    setIsAddressVerified(address?.verified || false);
    form.setValue('pickupAddressId', address.id);
  };

  const handleSellerDetailsSubmit = (values: OrderFormValues['sellerDetails']) => {
    form.setValue('sellerDetails', values);
  };

  const handleDeliveryDetailsSubmit = (values: OrderFormValues['deliveryDetails']) => {
    form.setValue('deliveryDetails', values);
  };

  const handleProductDetailsSubmit = (values: OrderFormValues['productDetails']) => {
    form.setValue('productDetails', values);
  };

  const handlePaymentMethodSubmit = (values: OrderFormValues['paymentMethod']) => {
    form.setValue('paymentMethod', values);
  };

  const handlePackageDetailsSubmit = (values: OrderFormValues['packageDetails']) => {
    form.setValue('packageDetails', values);
  };

  return (
    <div className="w-full">
      <div className="sticky top-0 z-10 rounded-t-md border-b bg-white shadow-sm dark:bg-stone-900">
        <div className="container flex max-w-full items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <BackButton showLabel={false} />
            <h1 className="text-sm font-semibold lg:text-xl">Add Order</h1>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => console.log(form.getValues())}>
              Create Order
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Ship Now
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-full px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="relative flex max-w-28 items-center gap-2 py-2 text-center text-xs">
              <span className="pl-2">Domestic Order</span>
              {orderType === 'domestic' && (
                <div className="bg-primary absolute bottom-0 left-0 right-0 h-1 rounded-t-sm" />
              )}
            </div>
            {/* <Tabs defaultValue="domestic" onValueChange={handleOrderTypeChange}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="domestic" className="py-2 relative">
                  Domestic Order
                  {orderType === "domestic" && (
                    <div className="bg-primary absolute bottom-0 left-0 right-0 h-1 rounded-t-sm" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="international" className="relative" disabled={orderType === "domestic"}>
                  International Order <span className="text-xs text-muted-foreground">Coming Soon</span>
                  {orderType === "international" && (
                    <div className="bg-primary absolute bottom-0 left-0 right-0 h-1 rounded-t-sm" />
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs> */}

            <div className="inline-flex items-center gap-1 rounded-lg border p-1">
              <Link
                href="/seller/orders/new"
                className="rounded-md text-xs"
              >
                Single Order
              </Link>
              <Link
                href="/seller/orders/new/bulk"
                className="rounded-md text-xs"
              >
                Bulk Order
              </Link>
            </div>


            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-row items-center gap-2 text-sm">
                  <span> Order Channel</span>
                  <span className="text-muted-foreground text-xs">(Your order source)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ORDER_CHANNELS.map((channel) => (
                    <div
                      key={channel.name}
                      onClick={() => {
                        form.setValue('orderChannel', channel.name);
                      }}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Badge
                        variant={
                          form.watch('orderChannel') === channel.name ? 'default' : 'outline'
                        }
                      >
                        {channel.icon} {channel.name}
                      </Badge>
                    </div>
                  ))}
                </div>

                <FormField
                  control={form.control}
                  name="orderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center text-sm font-medium">
                        Order ID
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the order id" {...field} />
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
                />

                {selectedAddress && !isAddressVerified && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription className="flex items-center gap-2">
                      To ship an order, you will need to verify the unverified address with the
                      associated phone number.
                      <Button variant="link" className="text-destructive h-auto p-0 underline">
                        Verify Address
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seller Details</CardTitle>
              </CardHeader>
              <CardContent>
                <SellerDetailsForm
                  onSubmit={handleSellerDetailsSubmit}
                  errors={form.formState.errors.sellerDetails}
                />
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
                <DeliveryDetailsForm
                  onSubmit={handleDeliveryDetailsSubmit}
                  errors={form.formState.errors.deliveryDetails}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductDetailsForm
                  onSubmit={handleProductDetailsSubmit}
                  errors={form.formState.errors.productDetails}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Select the payment mode, chosen by the buyer for this order.
                </p>
              </CardHeader>
              <CardContent>
                <PaymentMethodSelector
                  onSubmit={handlePaymentMethodSubmit}
                  error={form.formState.errors.paymentMethod?.message}
                />
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
                <PackageDetailsForm
                  onSubmit={handlePackageDetailsSubmit}
                  errors={form.formState.errors.packageDetails}
                />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit">Create Order</Button>
              <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
                Ship Now
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
