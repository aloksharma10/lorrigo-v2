"use client"

import { PieChart as RechartsChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { getChartColors } from "@lorrigo/ui/lib/colors"

export interface PieChartData {
  name: string
  value: number
}

interface PieChartProps {
  data: PieChartData[]
  tooltipFormatter?: (value: number) => [string, string]
  innerRadius?: number
  outerRadius?: number
  paddingAngle?: number
}

export function PieChart({
  data,
  tooltipFormatter = (value) => [`${value}`, "Value"],
  innerRadius = 60,
  outerRadius = 80,
  paddingAngle = 2,
}: PieChartProps) {
  const colors = getChartColors(data.length)

  return (
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
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Pie>
          <Tooltip
            formatter={tooltipFormatter}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            }}
          />
        </RechartsChart>
      </ResponsiveContainer>
    </div>
  )
}