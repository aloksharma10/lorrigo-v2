'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface LineChartData {
  name: string;
  [key: string]: any;
}

interface LineConfig {
  dataKey: string;
  name?: string;
  color: string;
  type?:
    | 'monotone'
    | 'linear'
    | 'step'
    | 'stepBefore'
    | 'stepAfter'
    | 'basis'
    | 'basisOpen'
    | 'basisClosed'
    | 'natural';
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

export function LineChart({
  data,
  lines,
  xAxisDataKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
}: LineChartProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xAxisDataKey} />
          <YAxis />
          {showTooltip && <Tooltip />}
          {showLegend && <Legend />}
          {lines.map((line, index) => (
            <Line
              key={index}
              type={line.type || 'monotone'}
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color}
              strokeWidth={line.strokeWidth || 2}
              activeDot={{ r: 8 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
