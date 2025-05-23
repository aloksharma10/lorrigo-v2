'use client';

import { ChartCard } from '@/components/charts/chart-card';
import { PieChart, type PieChartData } from '@/components/charts/pie-chart';

const data: PieChartData[] = [
  { name: 'Delivered', value: 9300 },
  { name: 'Intransit', value: 2200 },
  { name: 'Undelivered', value: 800 },
  { name: 'RTO', value: 2900 },
  { name: 'Lost/Damaged', value: 200 },
];

interface ShipmentStatusChartProps {
  isLoading?: boolean;
}

export function ShipmentStatusChart({ isLoading = false }: ShipmentStatusChartProps) {
  return (
    <ChartCard
      title="Overall Shipment Status"
      badge="Last 30 days"
      helpText="Shows the distribution of shipment statuses"
      isLoading={isLoading}
      onExternalLinkClick={() => console.log('External link clicked')}
    >
      <PieChart data={data} tooltipFormatter={(value) => [`${value}`, 'Shipments']} />
    </ChartCard>
  );
}
