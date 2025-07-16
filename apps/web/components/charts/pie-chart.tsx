'use client';

import {
  PieChart as RechartsChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Label,
  Sector,
} from 'recharts';
import { useState } from 'react';

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

const COLORS = [
  '#818cf8', // indigo-400
  '#6366f1', // indigo-500
  '#4ade80', // green-400
  '#fb923c', // orange-400
  '#f87171', // red-400
  '#facc15', // yellow-400
  '#a78bfa', // violet-400
  '#fb7185', // rose-400
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
];

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
  const [internalActiveIndex, setInternalActiveIndex] = useState<number | undefined>(undefined);

  const activeIndex = externalActiveIndex !== undefined ? externalActiveIndex : internalActiveIndex;
  const setActiveIndex = externalSetActiveIndex || setInternalActiveIndex;

  const colors = data?.map((item, index) => item.color || COLORS[index % COLORS.length]) || [];

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  return (
    <div className="w-full">
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsChart>
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
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {data?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
              {showDataLabels && (
                <Label
                  position="center"
                  value={data?.reduce((sum, item) => sum + item.value, 0)}
                  className="text-lg font-semibold"
                />
              )}
            </Pie>
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            />
          </RechartsChart>
        </ResponsiveContainer>
      </div>

      {showLegend && (
        <div
          className={`mt-4 grid ${legendPosition === 'bottom' ? 'grid-cols-2 gap-2 md:grid-cols-3' : 'grid-cols-1 gap-1'}`}
        >
          {data?.map((item, index) => (
            <div
              key={`legend-${index}`}
              className="flex items-center gap-2"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(-1)}
            >
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index] }} />
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
