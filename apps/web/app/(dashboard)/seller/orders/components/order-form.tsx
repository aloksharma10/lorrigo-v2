"use client"

import { useState } from "react"
import { ArrowLeft, Info } from "lucide-react"
import { Form, Alert, AlertDescription, Collapsible, CollapsibleContent, CollapsibleTrigger, Tabs, TabsList, TabsTrigger, Button, Card, CardContent, CardHeader, CardTitle } from "@lorrigo/ui/components"

import { PickupAddressSelector } from "./pickup-address-selector"
import { DeliveryDetailsForm } from "./delivery-details-form"
import { ProductDetailsForm } from "./product-details-form"
import { PaymentMethodSelector } from "./payment-method-selector"
import { PackageDetailsForm } from "./package-details-form"
import { SellerDetailsForm } from "./seller-details-form"

import { useForm } from "react-hook-form"

// Create explicit interface for form values
interface OrderFormValues {
   orderType: "domestic" | "international";
   orderMode: "single" | "bulk";
}

export default function OrderForm() {
   const [orderType, setOrderType] = useState<"domestic" | "international">("domestic")
   const [orderMode, setOrderMode] = useState<"single" | "bulk">("single")
   const [selectedAddress, setSelectedAddress] = useState<any>(null)
   const [isAddressVerified, setIsAddressVerified] = useState(false)

   const form = useForm<OrderFormValues>({
      defaultValues: {
         orderType: "domestic",
         orderMode: "single",
      },
   })

   function onSubmit(values: OrderFormValues) {
      console.log(values)
   }

   // Safe handler for Tabs onValueChange
   const handleOrderTypeChange = (value: string) => {
      const safeValue = value === "international" ? "international" : "domestic";
      setOrderType(safeValue);
      form.setValue("orderType", safeValue);
   };

   return (
      <div className="w-full">
         <div className="bg-white shadow-sm border-b sticky top-0 z-10">
            <div className="container max-w-full px-4 py-3 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                     <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="text-sm lg:text-xl font-semibold">Add Order</h1>
               </div>
               <div className="flex gap-4">
                  <Button variant="outline">Add Order</Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">Ship Now</Button>
               </div>
            </div>
         </div>

         <div className="container max-w-full px-4 py-6">
            <Form {...form}>
               <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Tabs defaultValue="domestic" onValueChange={handleOrderTypeChange}>
                     <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="domestic" className="relative">
                           Domestic Order
                           {orderType === "domestic" && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-sm" />
                           )}
                        </TabsTrigger>
                        <TabsTrigger value="international" className="relative">
                           International Order
                           {orderType === "international" && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-sm" />
                           )}
                        </TabsTrigger>
                     </TabsList>
                  </Tabs>

                  <div className="inline-flex items-center rounded-lg border p-1 gap-1">
                     <Button
                        variant={orderMode === "single" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                           setOrderMode("single")
                           form.setValue("orderMode", "single")
                        }}
                        className="rounded-md text-xs"
                     >
                        Single Order
                     </Button>
                     <Button
                        variant={orderMode === "bulk" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                           setOrderMode("bulk")
                           form.setValue("orderMode", "bulk")
                        }}
                        className="rounded-md text-xs"
                     >
                        Bulk Order
                     </Button>
                  </div>

                  <Card>
                     <CardHeader>
                        <CardTitle>Pickup Address</CardTitle>
                     </CardHeader>
                     <CardContent>
                        <PickupAddressSelector
                           onAddressSelect={(address) => {
                              setSelectedAddress(address)
                              setIsAddressVerified(address?.verified || false)
                           }}
                        />

                        {selectedAddress && !isAddressVerified && (
                           <Alert variant="destructive" className="mt-4">
                              <AlertDescription className="flex items-center gap-2">
                                 To ship an order, you will need to verify the unverified address with the associated phone number.
                                 <Button variant="link" className="h-auto p-0 text-destructive underline">
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
                        <SellerDetailsForm />
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader>
                        <CardTitle>Delivery Details</CardTitle>
                        <p className="text-sm text-muted-foreground">
                           Enter the Delivery Details of your buyer for whom you are making this order
                        </p>
                     </CardHeader>
                     <CardContent>
                        <DeliveryDetailsForm />
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader>
                        <CardTitle>Product Details</CardTitle>
                     </CardHeader>
                     <CardContent>
                        <ProductDetailsForm />
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader>
                        <CardTitle>Payment Method</CardTitle>
                        <p className="text-sm text-muted-foreground">
                           Select the payment mode, chosen by the buyer for this order.
                        </p>
                     </CardHeader>
                     <CardContent>
                        <PaymentMethodSelector />
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader>
                        <CardTitle>Package Details</CardTitle>
                        <p className="text-sm text-muted-foreground">
                           Provide the details of the final package that includes all the ordered items packed together.
                        </p>
                     </CardHeader>
                     <CardContent>
                        <PackageDetailsForm />
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Other Details</CardTitle>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                           <Info className="h-4 w-4" />
                        </Button>
                     </CardHeader>
                     <CardContent>
                        <Collapsible>
                           <CollapsibleTrigger asChild>
                              <Button variant="outline" className="w-full justify-between">
                                 <span>Other Details</span>
                                 <Info className="h-4 w-4" />
                              </Button>
                           </CollapsibleTrigger>
                           <CollapsibleContent className="pt-4">
                              <p>Additional details will appear here</p>
                           </CollapsibleContent>
                        </Collapsible>
                     </CardContent>
                  </Card>

                  <Button type="submit" className="w-full">
                     Create Order
                  </Button>
               </form>
            </Form>
         </div>
      </div>
   )
}
