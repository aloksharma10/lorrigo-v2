"use client"

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export interface BarChartData {
  name: string
  [key: string]: any
}

interface BarConfig {
  dataKey: string
  name?: string
  color: string
  stackId?: string
}

interface BarChartProps {
  data: BarChartData[]
  bars: BarConfig[]
  xAxisDataKey?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
}

export function BarChart({
  data,
  bars,
  xAxisDataKey = "name",
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
}: BarChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
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
          {bars.map((bar, index) => (
            <Bar
              key={index}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color}
              stackId={bar.stackId}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
