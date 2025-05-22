"use client"

import { ChartCard } from "@/components/charts/chart-card"
import { PieChart, type PieChartData } from "@/components/charts/pie-chart"

const data = [
  { name: "Ontime Deliveries", value: 8500, color: "#818cf8" },
  { name: "Late Deliveries", value: 1500, color: "#fb923c" },
]

interface DeliveryPerformanceChartProps {
  isLoading?: boolean
}

export function DeliveryPerformanceChart({ isLoading = false }: DeliveryPerformanceChartProps) {
  return (
    <ChartCard
      title="Delivery Performance"
      badge="Last 30 days"
      helpText="Shows the distribution of delivery performance"
      isLoading={isLoading}
      onExternalLinkClick={() => console.log("External link clicked")}
    >
      <PieChart
        data={data}
        tooltipFormatter={(value) => [`${value}`, "Shipments"]}
      />
    </ChartCard>
  )
}
