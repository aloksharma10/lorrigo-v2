'use client';

import { ChartCard } from '@/components/charts/chart-card';
import { PieChart, type PieChartData } from '@/components/charts/pie-chart';

interface DeliveryPerformanceChartProps {
  data: PieChartData[];
  isLoading?: boolean;
}

export function DeliveryPerformanceChart({ data, isLoading = false }: DeliveryPerformanceChartProps) {
  return (
    <ChartCard
      title="Delivery Performance"
      badge="Last 30 days"
      helpText="Shows the distribution of delivery performance"
      isLoading={isLoading}
      onExternalLinkClick={() => console.log('External link clicked')}
    >
      <PieChart data={data} tooltipFormatter={(value) => [`${value}`, 'Shipments']} />
    </ChartCard>
  );
}
