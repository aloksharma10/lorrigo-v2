import {
  IconClockPause,
  IconDeviceIpadExclamation,
  IconTruck,
  IconTruckDelivery,
  IconTruckReturn,
} from '@tabler/icons-react';
import { SectionCards } from '@/components/section-cards';
import { CardItems } from '@/components/card-items';
import { Card, CardHeader, CardTitle, CardContent } from '@lorrigo/ui/components';
import { UpcomingPickups } from './components/upcoming-pickups';

const sampleItems = [
  {
    title: 'Delayed Pickups',
    value: '167',
    percentage: '12.5%',
    description: 'Trending up this month',
    icon: IconClockPause,
  },
  {
    title: 'New Orders to be Processed',
    value: '4480',
    percentage: '12.5%',
    description: 'Trending up this month',
    icon: IconTruckDelivery,
  },
  {
    title: 'NDR Action Required',
    value: '657',
    percentage: '12.5%',
    description: 'Trending up this month',
    icon: IconTruckReturn,
  },
  {
    title: 'Order Delayed for Delivery',
    value: '263',
    percentage: '12.5%',
    description: 'Trending up this month',
    icon: IconTruck,
  },
  {
    title: 'Order with Weight Discrepancy',
    value: '263',
    percentage: '12.5%',
    description: 'Trending up this month',
    icon: IconDeviceIpadExclamation,
  },
];
const summary = [
  {
    title: "Today's Orders",
    value: '167',
    description: 'Total orders placed on Lorrigo today',
    icon: IconTruck,
  },
  {
    title: "Yesterday's Orders",
    value: '167',
    description: 'Total orders placed on Lorrigo yesterday',
    icon: IconTruck,
  },
  {
    title: "Today's Revenue",
    value: '167',
    description: 'Total revenue generated on Lorrigo today',
    icon: IconTruck,
  },
  {
    title: "Yesterday's  Revenue",
    value: '167',
    description: 'Total revenue generated on Lorrigo yesterday',
    icon: IconTruck,
  },
];

export default function Home() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2 space-y-6 p-4 lg:gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="scroll-m-20 text-lg font-semibold tracking-tight md:text-xl">
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CardItems
              title="Complete your KYC"
              value="167"
              description="Complete your KYC to start selling on Lorrigo"
              icon={IconClockPause}
            />
            <CardItems
              title="Getting Started"
              value="167"
              description="Complete your KYC to start selling on Lorrigo"
              icon={IconClockPause}
            />
          </CardContent>
        </Card>
        <SectionCards items={summary} title="Summary" className="col-span-2 p-4" />
      </div>
      <SectionCards
        items={sampleItems}
        title="Actions Needing Your Attention Today"
        className="p-4"
      />
      <UpcomingPickups />
    </div>
  );
}
