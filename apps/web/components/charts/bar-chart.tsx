'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const BarChartContainer = dynamic(
  () => import('recharts').then((mod) => ({
    default: React.memo(function BarChartComponent({ 
      data, 
      bars, 
      xAxisDataKey, 
      showGrid, 
      showLegend, 
      showTooltip 
    }: any) {
      const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = mod;
      
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisDataKey} />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {bars.map((bar: any, index: number) => (
              <Bar
                key={`bar-${index}`}
                dataKey={bar.dataKey}
                name={bar.name || bar.dataKey}
                fill={bar.color}
                stackId={bar.stackId}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    })
  })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
);

export interface BarChartData {
  name: string;
  [key: string]: any;
}

interface BarConfig {
  dataKey: string;
  name?: string;
  color: string;
  stackId?: string;
}

interface BarChartProps {
  data: BarChartData[];
  bars: BarConfig[];
  xAxisDataKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

export const BarChart = React.memo(function BarChart({
  data,
  bars,
  xAxisDataKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
}: BarChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <BarChartContainer
        data={data}
        bars={bars}
        xAxisDataKey={xAxisDataKey}
        showGrid={showGrid}
        showLegend={showLegend}
        showTooltip={showTooltip}
      />
    </div>
  );
});
