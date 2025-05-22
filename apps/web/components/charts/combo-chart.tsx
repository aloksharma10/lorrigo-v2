"use client"

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export interface ComboChartData {
  name: string
  [key: string]: any
}

interface BarConfig {
  dataKey: string
  name?: string
  color: string
  stackId?: string
}

interface LineConfig {
  dataKey: string
  name?: string
  color: string
  yAxisId?: string
  strokeWidth?: number
}

interface ComboChartProps {
  data: ComboChartData[]
  bars: BarConfig[]
  lines: LineConfig[]
  xAxisDataKey?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
}

export function ComboChart({
  data,
  bars,
  lines,
  xAxisDataKey = "name",
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
}: ComboChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
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
              key={`bar-${index}`}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color}
              stackId={bar.stackId}
            />
          ))}
          {lines.map((line, index) => (
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
    </div>
  )
}
