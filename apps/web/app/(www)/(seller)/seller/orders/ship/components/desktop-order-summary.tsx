import { CopyBtn } from "@/components/copy-btn"
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Collapsible, CollapsibleContent, CollapsibleTrigger, Separator } from "@lorrigo/ui/components"
import { currencyFormatter } from "@lorrigo/utils"
import { ChevronDown, ChevronUp, CreditCard, MapPin, Package, TrendingUp, Weight } from "lucide-react"

export const DesktopOrderDetails = ({
   order,
   isOpen,
   setIsOpen,
 }: {
   order: any
   isOpen: boolean
   setIsOpen: (open: boolean) => void
 }) => {
   return (
     <div className="hidden md:block w-80 h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
       <div className="p-6 space-y-6">
         <Collapsible open={isOpen} onOpenChange={setIsOpen}>
           <CollapsibleTrigger asChild>
             <Button variant="ghost" className="w-full justify-between p-0 h-auto">
               <h2 className="text-lg font-semibold">Order Details</h2>
               {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
             </Button>
           </CollapsibleTrigger>
 
           <CollapsibleContent className="space-y-4 mt-4">
             {/* Order ID */}
             <div className="p-3  rounded-lg">
               <div className="text-sm text-blue-600 dark:text-white font-medium">Order ID</div>
               <CopyBtn text={order.order_number} label={order.order_number} labelClassName="text-blue-900 dark:text-white" className="font-semibold" />
             </div>
 
             {/* Pickup Location */}
             <div className="space-y-2">
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 <MapPin className="h-4 w-4 text-green-600" />
                 Pickup From
               </div>
               <div className="pl-6 space-y-1">
                 <div className="font-medium">
                   {order.hub.address.pincode}, {order.hub.address.city}
                 </div>
                 <div className="text-sm text-muted-foreground">{order.hub.address.state}, India</div>
               </div>
             </div>
 
             <Separator />
 
             {/* Delivery Location */}
             <div className="space-y-2">
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 <MapPin className="h-4 w-4 text-red-600" />
                 Deliver To
               </div>
               <div className="pl-6 space-y-1">
                 <div className="font-medium">
                   {order.customer.address.pincode}, {order.customer.address.city}
                 </div>
                 <div className="text-sm text-muted-foreground">{order.customer.address.state}, India</div>
               </div>
             </div>
 
             <Separator />
 
             {/* Order Value */}
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 <CreditCard className="h-4 w-4" />
                 Order Value
               </div>
               <div className="text-lg font-semibold text-green-600">{currencyFormatter(order.total_amount)}</div>
             </div>
 
             {/* Amount to collect */}
             {order.amount_to_collect > 0 && order.payment_mode === "COD" && (
               <>
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                     <CreditCard className="h-4 w-4" />
                     Amount to Collect
                   </div>
                   <div className="text-lg font-semibold text-orange-600">
                     {currencyFormatter(order.amount_to_collect)}
                   </div>
                 </div>
                 <Separator />
               </>
             )}
 
             {/* Payment Mode */}
             <div className="flex items-center justify-between">
               <div className="text-sm text-muted-foreground">Payment Mode</div>
               <Badge variant={order.payment_mode === "COD" ? "destructive" : "default"}>{order.payment_mode}</Badge>
             </div>
 
             <Separator />
 
             {/* Weight */}
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 <Weight className="h-4 w-4" />
                 Applicable Weight
               </div>
               <div className="font-medium">{order.applicable_weight} Kg</div>
             </div>
 
             {/* Package Dimensions */}
             <div className="space-y-2">
               <div className="text-sm text-muted-foreground">Package Dimensions</div>
               <div className="text-sm font-medium">
                 {order.package.length} × {order.package.breadth} × {order.package.height} cm
               </div>
             </div>
           </CollapsibleContent>
         </Collapsible>
 
         {/* Buyer Insights */}
         <Card>
           <CardHeader className="pb-3">
             <CardTitle className="text-base flex items-center gap-2">
               <TrendingUp className="h-4 w-4" />
               Buyer Insights
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-3">
               <div className="text-sm text-muted-foreground">Customer Details:</div>
               <div className="space-y-2">
                 <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-800">
                   <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                     <Package className="h-4 w-4 text-blue-600 dark:text-white" />
                   </div>
                   <div className="flex-1">
                     <div className="text-sm font-medium">{order.customer.name}</div>
                     <div className="text-xs text-muted-foreground">{order.customer.phone}</div>
                   </div>
                 </div>
               </div>
             </div>
             <Button variant="outline" size="sm" className="w-full">
               View All Details
             </Button>
           </CardContent>
         </Card>
       </div>
     </div>
   )
 }