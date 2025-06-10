import { Badge, Card, CardContent } from "@lorrigo/ui/components"
import { currencyFormatter } from "@lorrigo/utils"

// Mobile Order Summary Component
export const MobileOrderSummary = ({ order }: { order: any }) => {
   return (
      <Card className="md:hidden mb-4">
         <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <div className="text-xs text-muted-foreground">Order Value</div>
                  <div className="font-semibold text-green-600">{currencyFormatter(order.total_amount)}</div>
               </div>
               <div>
                  <div className="text-xs text-muted-foreground">Weight</div>
                  <div className="font-medium">{order.applicable_weight} Kg</div>
               </div>
               <div>
                  <div className="text-xs text-muted-foreground">From</div>
                  <div className="text-sm font-medium">{order.hub.address.city}</div>
               </div>
               <div>
                  <div className="text-xs text-muted-foreground">To</div>
                  <div className="text-sm font-medium">{order.customer.address.city}</div>
               </div>
            </div>
            <div className="mt-3 pt-3 border-t">
               <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Payment</div>
                  <Badge variant={order.payment_mode === "COD" ? "destructive" : "default"} className="text-xs">
                     {order.payment_mode}
                  </Badge>
               </div>
            </div>
         </CardContent>
      </Card>
   )
}