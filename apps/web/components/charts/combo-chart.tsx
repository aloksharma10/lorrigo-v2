'use client';

import dynamic from 'next/dynamic';
import React from 'react';

export interface ComboChartData {
  name: string;
  [key: string]: any;
}

interface BarConfig {
  dataKey: string;
  name?: string;
  color: string;
  stackId?: string;
}

interface LineConfig {
  dataKey: string;
  name?: string;
  color: string;
  yAxisId?: string;
  strokeWidth?: number;
}

interface ComboChartProps {
  data: ComboChartData[];
  bars: BarConfig[];
  lines: LineConfig[];
  xAxisDataKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

const ComboChartContainer = dynamic(
  () =>
    import('recharts').then((mod) => ({
      default: React.memo(function ComboChartComponent({ data, bars, lines, xAxisDataKey, showGrid, showLegend, showTooltip }: any) {
        const { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = mod;

        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxisDataKey} />
              <YAxis />
              {showTooltip && <Tooltip />}
              {showLegend && <Legend />}
              {bars.map((bar: any, index: number) => (
                <Bar key={`bar-${index}`} dataKey={bar.dataKey} name={bar.name || bar.dataKey} fill={bar.color} stackId={bar.stackId} />
              ))}
              {lines.map((line: any, index: number) => (
                <Line
                  key={`line-${index}`}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name || line.dataKey}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth || 2}
                  activeDot={{ r: 8 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        );
      }),
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    ),
  }
);

export const ComboChart = React.memo(function ComboChart({
  data,
  bars,
  lines,
  xAxisDataKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
}: ComboChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ComboChartContainer
        data={data}
        bars={bars}
        lines={lines}
        xAxisDataKey={xAxisDataKey}
        showGrid={showGrid}
        showLegend={showLegend}
        showTooltip={showTooltip}
      />
    </div>
  );
});
