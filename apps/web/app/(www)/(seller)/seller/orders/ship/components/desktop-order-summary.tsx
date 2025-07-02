import { CopyBtn } from '@/components/copy-btn';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
} from '@lorrigo/ui/components';
import { currencyFormatter } from '@lorrigo/utils';
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  MapPin,
  Package,
  TrendingUp,
  Weight,
} from 'lucide-react';

export const DesktopOrderDetails = ({
  order,
  isOpen,
  setIsOpen,
}: {
  order: any;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  return (
    <div className="scrollbar-hide sticky top-0 hidden h-screen w-80 overflow-y-auto border-r border-gray-200 md:block dark:border-gray-800">
      <div className="space-y-6 p-6 lg:p-4 lg:pt-1">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-between p-0">
              <h2 className="text-lg font-semibold lg:text-xl">Order Details</h2>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4">
            {/* Order ID */}
            <div className="rounded-lg p-3">
              <div className="text-sm font-medium text-blue-600 dark:text-white">Order ID</div>
              <CopyBtn
                text={order.order_number}
                label={order.order_number}
                labelClassName="text-blue-900 dark:text-white"
                className="font-semibold"
              />
            </div>

            {/* Pickup Location */}
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-green-600" />
                Pickup From
              </div>
              <div className="space-y-1 pl-6">
                <div className="font-medium">
                  {order.hub.address.pincode}, {order.hub.address.city}
                </div>
                <div className="text-muted-foreground text-sm">
                  {order.hub.address.state}, India
                </div>
              </div>
            </div>

            <Separator />

            {/* Delivery Location */}
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-red-600" />
                Deliver To
              </div>
              <div className="space-y-1 pl-6">
                <div className="font-medium">
                  {order.customer.address.pincode}, {order.customer.address.city}
                </div>
                <div className="text-muted-foreground text-sm">
                  {order.customer.address.state}, India
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Value */}
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4" />
                Order Value
              </div>
              <div className="text-lg font-semibold text-green-600">
                {currencyFormatter(order.total_amount)}
              </div>
            </div>

            {/* Amount to collect */}
            {order.amount_to_collect > 0 && order.payment_mode === 'COD' && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
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
              <div className="text-muted-foreground text-sm">Payment Mode</div>
              <Badge variant={order.payment_mode === 'COD' ? 'destructive' : 'default'}>
                {order.payment_mode}
              </Badge>
            </div>

            <Separator />

            {/* Weight */}
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Weight className="h-4 w-4" />
                Applicable Weight
              </div>
              <div className="font-medium">{order.applicable_weight} Kg</div>
            </div>

            {/* Package Dimensions */}
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">Package Dimensions</div>
              <div className="text-sm font-medium">
                {order.package.length} × {order.package.breadth} × {order.package.height} cm
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Buyer Insights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Buyer Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="text-muted-foreground text-sm">Customer Details:</div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-2 dark:bg-blue-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <Package className="h-4 w-4 text-blue-600 dark:text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{order.customer.name}</div>
                    <div className="text-muted-foreground text-xs">{order.customer.phone}</div>
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
  );
};
