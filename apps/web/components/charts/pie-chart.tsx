'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Import all recharts components in a single dynamic import
const DynamicPieChart = dynamic(
  () => import('recharts').then((mod) => {
    const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label, Sector } = mod;
    return {
      default: function Chart({ data, tooltipFormatter, innerRadius, outerRadius, paddingAngle, showDataLabels, activeIndex, setActiveIndex }: any) {
        const colors = data.map((item: any, i: number) => item.color || COLORS[i % COLORS.length]);

        const renderActiveShape = (props: any) => {
          const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
          return (
            <g>
              <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
              />
            </g>
          );
        };

        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={paddingAngle}
                dataKey="value"
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {data.map((_: any, i: number) => <Cell key={i} fill={colors[i]} />)}
                {showDataLabels && (
                  <Label
                    value={`Total: ${data.reduce((sum: number, item: any) => sum + item.value, 0)}`}
                    position="center"
                    fill="#111"
                  />
                )}
              </Pie>
              <Tooltip
                formatter={tooltipFormatter}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      }
    };
  }),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading chart...</div>
  }
);

const COLORS = ['#818cf8', '#6366f1', '#4ade80', '#fb923c', '#f87171', '#facc15', '#a78bfa', '#fb7185', '#60a5fa', '#34d399'];

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
  percentage?: string | number;
}

interface PieChartProps {
  data: PieChartData[];
  tooltipFormatter?: (value: number) => [string, string];
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  showDataLabels?: boolean;
  activeIndex?: number;
  setActiveIndex?: (index: number) => void;
  showLegend?: boolean;
  legendPosition?: 'bottom' | 'right';
}

export function PieChart({
  data = [],
  tooltipFormatter = (value) => [`${value}`, 'Value'],
  innerRadius = 60,
  outerRadius = 80,
  paddingAngle = 2,
  showDataLabels = false,
  activeIndex: externalActiveIndex,
  setActiveIndex: externalSetActiveIndex,
  showLegend = true,
  legendPosition = 'bottom',
}: PieChartProps) {
  const [mounted, setMounted] = useState(false);
  const [internalActiveIndex, setInternalActiveIndex] = useState<number | undefined>(undefined);

  const activeIndex = externalActiveIndex ?? internalActiveIndex;
  const setActiveIndex = externalSetActiveIndex ?? setInternalActiveIndex;

  const colors = data.map((item, i) => item.color || COLORS[i % COLORS.length]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="flex items-center justify-center h-[300px]">Loading...</div>;

  return (
    <div className="w-full">
      <div style={{ height: 300, width: '100%' }}>
        <DynamicPieChart
          data={data}
          tooltipFormatter={tooltipFormatter}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={paddingAngle}
          showDataLabels={showDataLabels}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
        />
      </div>

      {showLegend && (
        <div className={`mt-4 grid ${legendPosition === 'bottom' ? 'grid-cols-2 gap-2 md:grid-cols-3' : 'grid-cols-1 gap-1'}`}>
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-2" onMouseEnter={() => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(-1)}>
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[i] }} />
              <span className="truncate text-xs">
                {item.name} {item.percentage && `(${item.percentage})`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}