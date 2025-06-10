"use client"

import { Skeleton } from "@lorrigo/ui/components"
import { Loader2, Menu } from "lucide-react"
import { Button } from "@lorrigo/ui/components"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@lorrigo/ui/components"

export default function ShipOrderPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row">
        {/* Desktop Order Details Skeleton */}
        <div className="hidden md:block w-80 h-screen sticky top-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Order Details Header */}
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            {/* Order ID */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-5 w-40" />
            </div>
            {/* Pickup Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="pl-6 space-y-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            {/* Delivery Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="pl-6 space-y-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            {/* Order Value */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-px w-full" />
            {/* Payment Mode */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-px w-full" />
            {/* Weight */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
            {/* Package Dimensions */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
            {/* Buyer Insights */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            {/* Mobile Header with Order Details Sheet */}
            <div className="md:hidden flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" disabled>
                    <Menu className="h-4 w-4 mr-2" />
                    <Skeleton className="h-4 w-20" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>
                      <Skeleton className="h-6 w-32" />
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="pl-6 h-5 w-48" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="pl-6 h-5 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-px w-full" />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-28 mt-1" />
                      </div>
                      <div>
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-16 mt-1" />
                      </div>
                      <div>
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-16 mt-1" />
                      </div>
                      <div>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-24 mt-1" />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between">
              <div>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>

            {/* Mobile Order Summary */}
            <div className="md:hidden">
              <div className="p-4 space-y-3 border rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-28 mt-1" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-16 mt-1" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-24 mt-1" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-24 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-px w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>

            {/* Filters and Controls */}
            <div className="space-y-4">
              {/* Search and Primary Filters */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Skeleton className="h-10 w-full rounded" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-36 flex-shrink-0" />
                  <Skeleton className="h-9 w-32 flex-shrink-0" />
                </div>
              </div>
              {/* Tabs and Sort */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="grid w-full grid-cols-3 sm:w-fit gap-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <Skeleton className="h-9 w-full sm:w-64" />
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Couriers Table - Desktop */}
            <div className="hidden md:block border rounded-lg">
              <div className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="p-4 text-left">
                          <Skeleton className="h-4 w-24" />
                        </th>
                        <th className="p-4 text-left">
                          <Skeleton className="h-4 w-20" />
                        </th>
                        <th className="p-4 text-left">
                          <Skeleton className="h-4 w-16" />
                        </th>
                        <th className="p-4 text-left">
                          <Skeleton className="h-4 w-16" />
                        </th>
                        <th className="p-4 text-left">
                          <Skeleton className="h-4 w-16" />
                        </th>
                        <th className="p-4 text-left">
                          <Skeleton className="h-4 w-12" />
                        </th>
                        <th className="p-4 text-left">
                          <Skeleton className="h-4 w-16" />
                        </th>
                        <th className="p-4 text-left">
                          <Skeleton className="h-4 w-16" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(3)].map((_, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-5 w-24" />
                              <Skeleton className="h-10 w-10 rounded-lg" />
                              <div className="space-y-1">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-20" />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-16" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-4 w-4 rounded-full" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-4 rounded-full" />
                                <Skeleton className="h-4 w-24" />
                              </div>
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </td>
                          <td className="p-4">
                            <Skeleton className="h-5 w-16" />
                          </td>
                          <td className="p-4">
                            <Skeleton className="h-5 w-12" />
                          </td>
                          <td className="p-4">
                            <div className="text-right space-y-1">
                              <Skeleton className="h-6 w-20 ml-auto" />
                              <Skeleton className="h-4 w-24 ml-auto" />
                            </div>
                          </td>
                          <td className="p-4">
                            <Skeleton className="h-9 w-24" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Couriers Cards - Mobile */}
            <div className="md:hidden space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="border rounded-lg">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div>
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-full rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Auto-Scheduled Pickup Info */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}