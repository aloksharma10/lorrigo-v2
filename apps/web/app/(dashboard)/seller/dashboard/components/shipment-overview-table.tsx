"use client"

import { Column, SimpleDataTable } from "@lorrigo/ui/components"

interface ShipmentData {
  courierName: string
  pickupUnscheduled: number
  pickupScheduled: number
  inTransit: number
  delivered: number
  rto: number
  lostDamaged: number
  totalShipment: number
}

const data: ShipmentData[] = [
  {
    courierName: "Bluedart Surface 500 g Surface",
    pickupUnscheduled: 0,
    pickupScheduled: 532,
    inTransit: 2141,
    delivered: 8605,
    rto: 2933,
    lostDamaged: 2,
    totalShipment: 14809,
  },
  {
    courierName: "Bluedart Surface 2Kg-5Kg",
    pickupUnscheduled: 0,
    pickupScheduled: 3,
    inTransit: 43,
    delivered: 337,
    rto: 5,
    lostDamaged: 0,
    totalShipment: 388,
  },
  {
    courierName: "Blue Dart Air",
    pickupUnscheduled: 0,
    pickupScheduled: 4,
    inTransit: 7,
    delivered: 104,
    rto: 1,
    lostDamaged: 0,
    totalShipment: 116,
  },
]

const columns = [
  { header: "Courier Name", accessorKey: "courierName" },
  { header: "Pickup Unscheduled", accessorKey: "pickupUnscheduled" },
  { header: "Pickup Scheduled", accessorKey: "pickupScheduled" },
  { header: "In-Transit", accessorKey: "inTransit" },
  { header: "Delivered", accessorKey: "delivered" },
  { header: "RTO", accessorKey: "rto" },
  { header: "Lost/Damaged", accessorKey: "lostDamaged" },
  { header: "Total Shipment", accessorKey: "totalShipment" },
]

interface ShipmentOverviewTableProps {
  isLoading?: boolean
}

export function ShipmentOverviewTable({ isLoading = false }: ShipmentOverviewTableProps) {
  return (
    <SimpleDataTable
      title="Shipment Overview by Courier"
      description="Last updated on 21 May 2025. There might be a slight mismatch in the data."
      columns={columns as Column<ShipmentData>[]}
      data={data}
      isLoading={isLoading}
      onExternalLinkClick={() => console.log("External link clicked")}
    />
  )
}