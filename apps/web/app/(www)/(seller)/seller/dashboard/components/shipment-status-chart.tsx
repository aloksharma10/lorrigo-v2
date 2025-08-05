'use client';

import { ChartCard } from '@/components/charts/chart-card';
import { PieChart, type PieChartData } from '@/components/charts/pie-chart';

interface ShipmentStatusChartProps {
  data: PieChartData[];
  isLoading?: boolean;
}

export function ShipmentStatusChart({ data, isLoading = false }: ShipmentStatusChartProps) {
  return (
    <ChartCard title="Overall Shipment Status" badge="Last 30 days" helpText="Shows the distribution of shipment statuses" isLoading={isLoading}>
      <PieChart data={data} tooltipFormatter={(value) => [`${value}`, 'Shipments']} />
    </ChartCard>
  );
}
