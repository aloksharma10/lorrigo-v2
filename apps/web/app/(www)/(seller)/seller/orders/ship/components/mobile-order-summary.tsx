import { Badge, Card, CardContent } from '@lorrigo/ui/components';
import { currencyFormatter } from '@lorrigo/utils';

// Mobile Order Summary Component
export const MobileOrderSummary = ({ order }: { order: any }) => {
  return (
    <Card className="mb-4 md:hidden">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-muted-foreground text-xs">Order Value</div>
            <div className="font-semibold text-green-600">{currencyFormatter(order.total_amount)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Weight</div>
            <div className="font-medium">{order.applicable_weight} Kg</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">From</div>
            <div className="text-sm font-medium">{order.hub.address.city}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">To</div>
            <div className="text-sm font-medium">{order.customer.address.city}</div>
          </div>
        </div>
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground text-xs">Payment</div>
            <Badge variant={order.payment_method === 'COD' ? 'destructive' : 'default'} className="text-xs">
              {order.payment_method}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
