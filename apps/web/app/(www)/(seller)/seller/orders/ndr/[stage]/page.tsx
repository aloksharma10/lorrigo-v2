import NDRTable from "@/components/tables/ndr-table"
import { getInitialShipments } from "@/app/(seller)/seller/orders/action"
import { Badge, Button } from "@lorrigo/ui/components"
import ScrollableTabsProps from "@/components/client-tabs"
import { Plus, RefreshCw } from "lucide-react"
import { NDR_TAB_ROUTES } from "@/lib/routes/nested-shipments"

interface PageProps {
   params: Promise<{
      stage: string
   }>
   searchParams: Promise<{
      page?: string
      pageSize?: string
      sort?: string
      filters?: string
      search?: string
      dateFrom?: string
      dateTo?: string
   }>
}

// Force dynamic rendering with no caching
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function NDRPage({ params, searchParams }: PageProps) {
   const { stage } = await params
   const queryParams = await searchParams

   const { page = "0", pageSize = "15", sort, filters, search, dateFrom, dateTo } = queryParams

   // Parse parameters
   const parsedParams = {
      page: Number.parseInt(page),
      pageSize: Number.parseInt(pageSize),
      sort: sort ? JSON.parse(sort) : [],
      filters: filters ? JSON.parse(filters) : [],
      globalFilter: search || "",
      dateRange:
         dateFrom && dateTo
            ? {
               from: new Date(dateFrom),
               to: new Date(dateTo),
            }
            : {
               from: new Date(new Date().setDate(new Date().getDate() - 30)),
               to: new Date(),
            },
      status: stage,
   }

   // Get initial data on server - only for first load
   const initialData = await getInitialShipments(parsedParams)

   return (
      <div className="mx-auto w-full space-y-4 p-4">
         {/* Header */}
         <div className="flex items-center justify-between">
            <h1 className="text-base font-bold capitalize lg:text-2xl">
               NDR {stage?.replace("-", " ")} Orders
            </h1>
            <div className="flex items-center gap-2">
               <Badge variant="outline" className="px-3 py-1">
                  Domestic
               </Badge>
               <Button variant="outline" size="sm" className="gap-1">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
               </Button>
            </div>
         </div>

         {/* Tabs */}
         <ScrollableTabsProps menuItems={NDR_TAB_ROUTES} />

         {/* Table */}
         <NDRTable initialData={initialData} initialParams={parsedParams} />
      </div>
   )
}
