'use client';
import { format } from 'date-fns';
import { useState } from 'react';

import {
  Button,
  Calendar,
  Card,
  CardContent,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Badge,
  CardHeader,
  CardTitle,
} from '@lorrigo/ui/components';
import { PickupCard } from './pickup-card';
import { DateRange } from 'react-day-picker';
import { UpcomingPickupItem } from '@/lib/type/shipment-analysis';

export const mockPickupData = [
  {
    id: 'p1',
    customerName: 'Surya Paricha',
    address: 'Flat no 405, B block Sadagiri Maharshi Gokulum, Bandlaguda Off, Old Madras Rd',
    phone: '8655366779',
    date: 'May 21, 2025',
    items: [
      {
        id: 'i1',
        brand: 'BLUE DART',
        description: 'Bluedart brands 500g Surface',
        quantity: 2,
        brandLogo:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Ctext x='10' y='35' font-family='Arial' font-size='22' font-weight='bold'%3E%3Ctspan fill='%230052cc'%3EBLUE %3C/tspan%3E%3Ctspan fill='%2300a651'%3EDART%3C/tspan%3E%3C/text%3E%3C/svg%3E",
      },
    ],
  },
  {
    id: 'p2',
    customerName: 'Sukrt Delhi',
    address: 'Khasra No 391/392 Mehrauli-Gurgaon Road, 1st Floor, Near Ghitorni Metro Station',
    phone: '8010948586',
    date: 'May 21, 2025',
    items: [
      {
        id: 'i2',
        brand: 'DELHIVERY',
        description: 'Delivery Air',
        quantity: 1,
        brandLogo:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Ctext x='10' y='35' font-family='Arial' font-size='20' font-weight='bold'%3EDELHIVERY%3C/text%3E%3C/svg%3E",
      },
      {
        id: 'i3',
        brand: 'BLUE DART',
        description: 'BlueDart Surface 2kg Sol',
        quantity: 1,
        brandLogo:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Ctext x='10' y='35' font-family='Arial' font-size='22' font-weight='bold'%3E%3Ctspan fill='%230052cc'%3EBLUE %3C/tspan%3E%3Ctspan fill='%2300a651'%3EDART%3C/tspan%3E%3C/text%3E%3C/svg%3E",
      },
    ],
  },
  {
    id: 'p3',
    customerName: 'Sukrt Kolkata',
    address: '7A Short Street, First Floor Near Bhagirathi Neotia Hospital',
    phone: '9832419971',
    date: 'May 22, 2025',
    items: [
      {
        id: 'i4',
        brand: 'BLUE DART',
        description: 'Blue Dart Air',
        quantity: 3,
        brandLogo:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Ctext x='10' y='35' font-family='Arial' font-size='22' font-weight='bold'%3E%3Ctspan fill='%230052cc'%3EBLUE %3C/tspan%3E%3Ctspan fill='%2300a651'%3EDART%3C/tspan%3E%3C/text%3E%3C/svg%3E",
      },
      {
        id: 'i5',
        brand: 'DTDC',
        description: 'DTDC Air 500gm',
        quantity: 1,
        brandLogo:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Ctext x='30' y='35' font-family='Arial' font-size='24' font-weight='bold' fill='%23233e99'%3EDTDC%3C/text%3E%3C/svg%3E",
      },
    ],
  },
];

interface UpcomingPickupsProps {
  data?: UpcomingPickupItem[];
}

export const UpcomingPickups = ({ data }: UpcomingPickupsProps) => {
  const [selectedDate, setSelectedDate] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });

  const handleDateSelect = (date: DateRange) => {
    setSelectedDate(date);
  };

  // Convert API data to the format expected by PickupCard
  const convertToPickupFormat = (apiData: UpcomingPickupItem[]) => {
    return apiData.map(item => ({
      id: item.id,
      customerName: item.customerName,
      address: item.pickupAddress,
      phone: 'N/A', // API doesn't provide phone
      date: item.scheduledDate,
      items: [
        {
          id: item.orderId,
          brand: item.courierName,
          description: `Pickup from ${item.customerName}`,
          quantity: 1,
          brandLogo: undefined,
        }
      ]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Your Upcoming Pickups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex space-x-2">
            <span className="py-2 text-gray-600">Date</span>
          </div>

          <div className="mb-4">
            <div className="flex items-center">
              <h2 className="mr-2 font-medium text-blue-700">Pickups Scheduled</h2>
              <Badge variant="outline" className="bg-green-100 font-medium text-green-800">
                {data?.length || 0}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {data && data.length > 0 ? (
              convertToPickupFormat(data).map((pickup) => <PickupCard key={pickup.id} pickup={pickup} />)
            ) : (
              <Card>
                <CardContent className="flex h-40 items-center justify-center">
                  <p className="text-gray-500">
                    No pickups scheduled for{' '}
                    {format(selectedDate.from || new Date(), 'MMM d, yyyy')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
