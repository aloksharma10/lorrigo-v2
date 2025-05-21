"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const data = [
  { name: "Bluedart Surface 500 g Surface", value: 14809, color: "#818cf8" },
  { name: "Bluedart Surface 2Kg-5Kg", value: 388, color: "#6366f1" },
  { name: "Xpressbees Surface", value: 9, color: "#4ade80" },
  { name: "Others", value: 148, color: "#facc15" },
]

export function CourierSplitChart() {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value}`, "Shipments"]}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
