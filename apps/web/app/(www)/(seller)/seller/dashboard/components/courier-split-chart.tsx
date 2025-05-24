'use client';

import { ChartCard } from '@/components/charts/chart-card';
import { PieChart, type PieChartData } from '@/components/charts/pie-chart';

const data: PieChartData[] = [
  { name: 'Bluedart Surface 500g', value: 14809 },
  { name: 'Bluedart Surface 2Kg-5Kg', value: 388 },
  { name: 'Xpressbees Surface', value: 9 },
  { name: 'Others', value: 148 },
];

interface CourierSplitChartProps {
  isLoading?: boolean;
}

export function CourierSplitChart({ isLoading = false }: CourierSplitChartProps) {
  return (
    <ChartCard
      title="Couriers Split"
      badge="Last 30 days"
      helpText="Shows the distribution of shipments across couriers"
      isLoading={isLoading}
      onExternalLinkClick={() => console.log('External link clicked')}
    >
      <PieChart data={data} tooltipFormatter={(value) => [`${value}`, 'Shipments']} />
    </ChartCard>
  );
}
