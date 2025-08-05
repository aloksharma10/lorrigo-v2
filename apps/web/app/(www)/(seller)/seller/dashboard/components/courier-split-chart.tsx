'use client';

import { ChartCard } from '@/components/charts/chart-card';
import { PieChart, type PieChartData } from '@/components/charts/pie-chart';

interface CourierSplitChartProps {
  data: PieChartData[];
  isLoading?: boolean;
}

export function CourierSplitChart({ data, isLoading = false }: CourierSplitChartProps) {
  return (
    <ChartCard title="Couriers Split" badge="Last 30 days" helpText="Shows the distribution of shipments across couriers" isLoading={isLoading}>
      <PieChart data={data} tooltipFormatter={(value) => [`${value}`, 'Shipments']} />
    </ChartCard>
  );
}
