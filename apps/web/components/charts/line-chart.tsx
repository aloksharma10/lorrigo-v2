'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const LineChartContainer = dynamic(
  () => import('recharts').then((mod) => ({
    default: React.memo(function LineChartComponent({ 
      data, 
      lines, 
      xAxisDataKey, 
      showGrid, 
      showLegend, 
      showTooltip 
    }: any) {
      const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = mod;
      
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisDataKey} />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {lines.map((line: any, index: number) => (
              <Line
                key={`line-${index}`}
                type={line.type || 'monotone'}
                dataKey={line.dataKey}
                name={line.name || line.dataKey}
                stroke={line.color}
                strokeWidth={line.strokeWidth || 2}
                activeDot={{ r: 8 }}
              />
            ))}
          </LineChart>
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

export interface LineChartData {
  name: string;
  [key: string]: any;
}

interface LineConfig {
  dataKey: string;
  name?: string;
  color: string;
  type?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter' | 'basis' | 'basisOpen' | 'basisClosed' | 'natural';
  strokeWidth?: number;
}

interface LineChartProps {
  data: LineChartData[];
  lines: LineConfig[];
  xAxisDataKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

export const LineChart = React.memo(function LineChart({
  data,
  lines,
  xAxisDataKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
}: LineChartProps) {
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
      <LineChartContainer
        data={data}
        lines={lines}
        xAxisDataKey={xAxisDataKey}
        showGrid={showGrid}
        showLegend={showLegend}
        showTooltip={showTooltip}
      />
    </div>
  );
});