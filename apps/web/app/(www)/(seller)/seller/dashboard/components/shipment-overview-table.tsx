'use client';

import { Column, SimpleDataTable } from '@lorrigo/ui/components';

interface ShipmentData {
  courierName: string;
  pickupUnscheduled: number;
  pickupScheduled: number;
  inTransit: number;
  delivered: number;
  rto: number;
  lostDamaged: number;
  totalShipment: number;
}

const columns = [
  { header: 'Courier Name', accessorKey: 'courierName' },
  { header: 'Pickup Unscheduled', accessorKey: 'pickupUnscheduled' },
  { header: 'Pickup Scheduled', accessorKey: 'pickupScheduled' },
  { header: 'In-Transit', accessorKey: 'inTransit' },
  { header: 'Delivered', accessorKey: 'delivered' },
  { header: 'RTO', accessorKey: 'rto' },
  { header: 'Lost/Damaged', accessorKey: 'lostDamaged' },
  { header: 'Total Shipment', accessorKey: 'totalShipment' },
];

interface ShipmentOverviewTableProps {
  data: ShipmentData[];
  isLoading?: boolean;
}

export function ShipmentOverviewTable({ data, isLoading = false }: ShipmentOverviewTableProps) {
  return (
    <SimpleDataTable
      title="Shipment Overview by Courier"
      description="Last updated on 21 May 2025. There might be a slight mismatch in the data."
      columns={columns as Column<ShipmentData>[]}
      data={data}
      isLoading={isLoading}
      // onExternalLinkClick={() => console.log('External link clicked')}
    />
  );
}
