"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Checkbox } from "@lorrigo/ui/components"
import { DataTable } from "@lorrigo/ui/components"
import { DataTableColumnHeader } from "@lorrigo/ui/components"
import { Badge } from "@lorrigo/ui/components"
import { Button } from "@lorrigo/ui/components"
// import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Package, AlertTriangle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@lorrigo/ui/components"
import { Tabs, TabsList, TabsTrigger } from "@lorrigo/ui/components"
// import { toast } from "@lorrigo/ui/components"

// Define the shipment data type
interface Shipment {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  amount: number
  paymentType: "Prepaid" | "COD"
  pickupAddress: string
  addressVerified: boolean
  shippingService: string
  awbNumber: string
  status: "New" | "Pickup Scheduled" | "In Transit" | "Delivered" | "RTO"
  pickupDate: string
  edd: string
  pickupId: string
  custom: boolean
  createdAt: Date
}

// API response type
interface ApiResponse {
  data: Shipment[]
  meta: {
    total: number
    pageCount: number
  }
}

// Fetch shipments from API
const fetchShipments = async ({
  page = 0,
  pageSize = 15,
  sort,
  filters,
  globalFilter,
  dateRange,
  status,
}: {
  page?: number
  pageSize?: number
  sort?: { id: string; desc: boolean }[]
  filters?: { id: string; value: any }[]
  globalFilter?: string
  dateRange?: { from: Date; to: Date }
  status?: string
}): Promise<ApiResponse> => {
  // In a real app, this would be an API call
  // For demo purposes, we'll simulate an API call with a delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Sample data
  const allShipments: Shipment[] = [
    {
      id: "11235-8",
      orderNumber: "11235-8",
      customerName: "Naveen J N",
      customerEmail: "noreply@orrigo.com",
      customerPhone: "9094982543",
      amount: 2796.0,
      paymentType: "Prepaid",
      pickupAddress: "Canine Cravin",
      addressVerified: false,
      shippingService: "BlueDart Surface 2Kg_Spl",
      awbNumber: "77514658082",
      status: "Pickup Scheduled",
      pickupDate: "23 May 2025",
      edd: "24 May 2025",
      pickupId: "SRPD-35836182",
      custom: true,
      createdAt: new Date("2025-05-22T01:11:00"),
    },
    {
      id: "LSRC0277_TC_SS_COD_8",
      orderNumber: "LSRC0277_TC_SS_COD_8",
      customerName: "Alok Sharma",
      customerEmail: "noreply@shiprocket.com",
      customerPhone: "7011609262",
      amount: 489.0,
      paymentType: "COD",
      pickupAddress: "Tristar",
      addressVerified: false,
      shippingService: "Bluedart brands 500 g Surface",
      awbNumber: "77860021466",
      status: "Pickup Scheduled",
      pickupDate: "23 May 2025",
      edd: "27 May 2025",
      pickupId: "SRPD-35844479",
      custom: true,
      createdAt: new Date("2025-05-22T01:10:00"),
    },
    {
      id: "#0010819-6",
      orderNumber: "#0010819-6",
      customerName: "TUTU SANGLIR",
      customerEmail: "noreply@orrigo.com",
      customerPhone: "9366117942",
      amount: 5997.0,
      paymentType: "Prepaid",
      pickupAddress: "Sukri Delhi",
      addressVerified: false,
      shippingService: "BlueDart Surface 2Kg_Spl",
      awbNumber: "77514658282",
      status: "Pickup Scheduled",
      pickupDate: "23 May 2025",
      edd: "28 May 2025",
      pickupId: "SRPD-36444668",
      custom: true,
      createdAt: new Date("2025-05-22T01:09:00"),
    },
    {
      id: "12439099-2",
      orderNumber: "12439099-2",
      customerName: "Praveen Dasari",
      customerEmail: "noreply@shiprocket.com",
      customerPhone: "8121440440",
      amount: 1299.0,
      paymentType: "Prepaid",
      pickupAddress: "Parcel084",
      addressVerified: false,
      shippingService: "Bluedart brands 500 g Surface",
      awbNumber: "77514738744",
      status: "New",
      pickupDate: "22 May 2025",
      edd: "29 May 2025",
      pickupId: "SRPD-35819352",
      custom: true,
      createdAt: new Date("2025-05-22T01:56:00"),
    },
    {
      id: "12439071-14",
      orderNumber: "12439071-14",
      customerName: "Arbaz Khan",
      customerEmail: "noreply@shiprocket.com",
      customerPhone: "8217350462",
      amount: 1453.0,
      paymentType: "Prepaid",
      pickupAddress: "Parcel084",
      addressVerified: false,
      shippingService: "Bluedart brands 500 g Surface",
      awbNumber: "77514732610",
      status: "In Transit",
      pickupDate: "22 May 2025",
      edd: "29 May 2025",
      pickupId: "SRPD-35819352",
      custom: true,
      createdAt: new Date("2025-05-22T01:53:00"),
    },
    {
      id: "12438936-6",
      orderNumber: "12438936-6",
      customerName: "Bhausheb Gadade",
      customerEmail: "noreply@shiprocket.com",
      customerPhone: "9561886193",
      amount: 1156.0,
      paymentType: "Prepaid",
      pickupAddress: "Parcel143",
      addressVerified: false,
      shippingService: "Bluedart brands 500 g Surface",
      awbNumber: "77514713334",
      status: "Delivered",
      pickupDate: "22 May 2025",
      edd: "29 May 2025",
      pickupId: "SRPD-35846042",
      custom: true,
      createdAt: new Date("2025-05-22T01:42:00"),
    },
    {
      id: "682956-13",
      orderNumber: "682956-13",
      customerName: "Testing User",
      customerEmail: "test@example.com",
      customerPhone: "9876543210",
      amount: 3000.0,
      paymentType: "COD",
      pickupAddress: "Vantage Pro Office",
      addressVerified: true,
      shippingService: "Bluedart brands 500 g Surface",
      awbNumber: "77514713335",
      status: "RTO",
      pickupDate: "22 May 2025",
      edd: "29 May 2025",
      pickupId: "SRPD-35846043",
      custom: true,
      createdAt: new Date("2025-05-22T01:40:00"),
    },
  ]

  // Filter by status if provided
  let filteredShipments = allShipments
  if (status && status !== "all") {
    const statusMap: Record<string, string> = {
      new: "New",
      ready: "Pickup Scheduled",
      transit: "In Transit",
      delivered: "Delivered",
      rto: "RTO",
    }

    if (statusMap[status]) {
      filteredShipments = filteredShipments.filter((shipment) => shipment.status === statusMap[status])
    }
  }

  // Apply filters
  if (filters && filters.length > 0) {
    filteredShipments = filteredShipments.filter((shipment) => {
      return filters.every((filter) => {
        if (filter.id === "status" && Array.isArray(filter.value)) {
          return filter.value.includes(shipment.status)
        }
        if (filter.id === "paymentType" && Array.isArray(filter.value)) {
          return filter.value.includes(shipment.paymentType)
        }
        return true
      })
    })
  }

  // Apply global filter
  if (globalFilter) {
    const searchTerm = globalFilter.toLowerCase()
    filteredShipments = filteredShipments.filter(
      (shipment) =>
        shipment.orderNumber.toLowerCase().includes(searchTerm) ||
        shipment.customerName.toLowerCase().includes(searchTerm) ||
        shipment.customerEmail.toLowerCase().includes(searchTerm) ||
        shipment.customerPhone.toLowerCase().includes(searchTerm) ||
        shipment.awbNumber.toLowerCase().includes(searchTerm) ||
        shipment.pickupId.toLowerCase().includes(searchTerm),
    )
  }

  // Apply date range filter
  if (dateRange?.from && dateRange?.to) {
    filteredShipments = filteredShipments.filter((shipment) => {
      const createdAt = new Date(shipment.createdAt)
      return createdAt >= dateRange.from && createdAt <= dateRange.to
    })
  }

  // Apply sorting
  if (sort && sort.length > 0) {
    const { id, desc } = sort[0]
    filteredShipments = [...filteredShipments].sort((a: any, b: any) => {
      if (a[id] < b[id]) return desc ? 1 : -1
      if (a[id] > b[id]) return desc ? -1 : 1
      return 0
    })
  }

  // Apply pagination
  const start = page * pageSize
  const end = start + pageSize
  const paginatedShipments = filteredShipments.slice(start, end)

  return {
    data: paginatedShipments,
    meta: {
      total: filteredShipments.length,
      pageCount: Math.ceil(filteredShipments.length / pageSize),
    },
  }
}

// Bulk action mutations
const useDownloadManifestMutation = () => {
  return useMutation({
    mutationFn: async (shipments: Shipment[]) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return { success: true, count: shipments.length }
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: `Downloaded manifest for ${result.count} shipments`,
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download manifest",
        variant: "destructive",
      })
    },
  })
}

const useGenerateLabelsMutation = () => {
  return useMutation({
    mutationFn: async (shipments: Shipment[]) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return { success: true, count: shipments.length }
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: `Generated labels for ${result.count} shipments`,
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate labels",
        variant: "destructive",
      })
    },
  })
}

const useCancelOrdersMutation = () => {
  return useMutation({
    mutationFn: async (shipments: Shipment[]) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return { success: true, count: shipments.length }
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: `Cancelled ${result.count} orders`,
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel orders",
        variant: "destructive",
      })
    },
  })
}

export default function ShipmentsPage() {
  const [activeTab, setActiveTab] = React.useState("all")
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 15 })
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([])
  const [filters, setFilters] = React.useState<{ id: string; value: any }[]>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })

  const queryClient = useQueryClient()

  // Mutations for bulk actions
  const downloadManifestMutation = useDownloadManifestMutation()
  const generateLabelsMutation = useGenerateLabelsMutation()
  const cancelOrdersMutation = useCancelOrdersMutation()

  // Fetch shipments
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "shipments",
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      filters,
      globalFilter,
      dateRange,
      activeTab,
    ],
    queryFn: () =>
      fetchShipments({
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sort: sorting,
        filters,
        globalFilter,
        dateRange,
        status: activeTab,
      }),
    keepPreviousData: true,
  })

  // Define the columns for the data table
  const columns: ColumnDef<Shipment>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          disabled={isLoading}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
          disabled={isLoading}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "orderNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order Details" />,
      cell: ({ row }) => {
        const shipment = row.original
        return (
          <div className="flex flex-col">
            <div className="font-medium text-blue-600">{shipment.orderNumber}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(shipment.createdAt).toLocaleDateString()} |{" "}
              {new Date(shipment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="flex items-center mt-1">
              <Package className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="text-xs uppercase font-medium">CUSTOM</span>
            </div>
            <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-blue-600 justify-start">
              Package Details
            </Button>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer Details" />,
      cell: ({ row }) => {
        const shipment = row.original
        return (
          <div className="flex flex-col">
            <div className="font-medium">{shipment.customerName}</div>
            <div className="text-sm text-muted-foreground">{shipment.customerEmail}</div>
            <div className="text-sm text-muted-foreground">{shipment.customerPhone}</div>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Payment" />,
      cell: ({ row }) => {
        const shipment = row.original
        const amount = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: 2,
        }).format(shipment.amount)
        return (
          <div className="flex flex-col">
            <div className="font-medium">{amount}</div>
            <Badge variant="outline" className="mt-1 w-fit">
              {shipment.paymentType}
            </Badge>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "pickupAddress",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pickup / RTO Addresses" />,
      cell: ({ row }) => {
        const shipment = row.original
        return (
          <div className="flex flex-col">
            <div className="font-medium text-muted-foreground border-b border-dashed pb-1 mb-1">
              {shipment.pickupAddress}
            </div>
            {!shipment.addressVerified && (
              <div className="flex items-center text-red-500 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>Unverified</span>
              </div>
            )}
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "shippingService",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Shipping Details" />,
      cell: ({ row }) => {
        const shipment = row.original
        return (
          <div className="flex flex-col">
            <div className="font-medium">{shipment.shippingService}</div>
            <div className="text-sm">
              AWB # <span className="text-blue-600">{shipment.awbNumber}</span>
            </div>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const shipment = row.original

        // Status badge color mapping
        const statusColorMap: Record<string, string> = {
          New: "bg-blue-100 text-blue-800 hover:bg-blue-100",
          "Pickup Scheduled": "bg-green-100 text-green-800 hover:bg-green-100",
          "In Transit": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
          Delivered: "bg-green-100 text-green-800 hover:bg-green-100",
          RTO: "bg-red-100 text-red-800 hover:bg-red-100",
        }

        return (
          <div className="flex flex-col">
            <Badge className={`${statusColorMap[shipment.status]} w-fit`}>{shipment.status.toUpperCase()}</Badge>
            <div className="text-xs mt-1">For May {shipment.pickupDate.split(" ")[1]}, 2025</div>
            <div className="text-xs mt-1">EDD: {shipment.edd}</div>
            <div className="text-xs mt-1">Pickup ID: {shipment.pickupId}</div>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: "actions",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
      cell: ({ row }) => {
        return (
          <div className="flex flex-col items-center gap-2">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Download Manifest</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View details</DropdownMenuItem>
                <DropdownMenuItem>Track shipment</DropdownMenuItem>
                <DropdownMenuItem>Cancel order</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  // Define bulk actions
  const bulkActions = [
    {
      label: "Download Manifest",
      action: (selectedRows: Shipment[]) => {
        downloadManifestMutation.mutate(selectedRows)
      },
      isLoading: downloadManifestMutation.isLoading,
    },
    {
      label: "Generate Labels",
      action: (selectedRows: Shipment[]) => {
        generateLabelsMutation.mutate(selectedRows)
      },
      isLoading: generateLabelsMutation.isLoading,
    },
    {
      label: "Cancel Orders",
      action: (selectedRows: Shipment[]) => {
        cancelOrdersMutation.mutate(selectedRows)
      },
      variant: "destructive" as const,
      isLoading: cancelOrdersMutation.isLoading,
    },
  ]

  // Define filterable columns
  const filterableColumns = [
    {
      id: "status",
      title: "Status",
      options: [
        { label: "New", value: "New" },
        { label: "Pickup Scheduled", value: "Pickup Scheduled" },
        { label: "In Transit", value: "In Transit" },
        { label: "Delivered", value: "Delivered" },
        { label: "RTO", value: "RTO" },
      ],
    },
    {
      id: "paymentType",
      title: "Payment Type",
      options: [
        { label: "Prepaid", value: "Prepaid" },
        { label: "COD", value: "COD" },
      ],
    },
  ]

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setPagination({ ...pagination, pageIndex: 0 }) // Reset to first page on tab change
  }

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <span className="mr-2">Domestic</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex-1">
          <Tabs defaultValue="all" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-7 w-fit">
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="ready">Ready To Ship</TabsTrigger>
              <TabsTrigger value="pickups">Pickups & Manifests</TabsTrigger>
              <TabsTrigger value="transit">In Transit</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
              <TabsTrigger value="rto">RTO</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span>Ask Copilot</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            <span>Add Order</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9-9v18" />
            </svg>
            <span>Sync Orders</span>
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        count={data?.meta.total || 0}
        pageCount={data?.meta.pageCount || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        filterableColumns={filterableColumns}
        bulkActions={bulkActions}
        dateRangeFilter={true}
        searchableColumns={[
          {
            id: "orderNumber",
            title: "Order Number",
          },
          {
            id: "customerName",
            title: "Customer Name",
          },
          {
            id: "awbNumber",
            title: "AWB Number",
          },
        ]}
        searchPlaceholder="Search for AWB, Order ID, Buyer Mobile Number, Email, SKU, Pickup ID"
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to fetch shipments. Please try again."
        onPaginationChange={setPagination}
        onSortingChange={(newSorting) => {
          setSorting(newSorting.map((sort) => ({ id: sort.id, desc: sort.desc })))
        }}
        onFiltersChange={setFilters}
        onGlobalFilterChange={setGlobalFilter}
        onDateRangeChange={setDateRange}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
      />
    </div>
  )
}
