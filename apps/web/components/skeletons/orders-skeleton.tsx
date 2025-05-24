import { Skeleton } from "@lorrigo/ui/components"

export function OrdersSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`tab-${i}`} className="h-10 w-28 rounded-lg" />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Search and filters */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-x-2 sm:space-y-0">
        <Skeleton className="h-10 w-full sm:w-[400px]" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-4 border-b border-border pb-2">
        <Skeleton className="col-span-2 h-4 w-full" />
        <Skeleton className="col-span-2 h-4 w-full" />
        <Skeleton className="col-span-1 h-4 w-full" />
        <Skeleton className="col-span-2 h-4 w-full" />
        <Skeleton className="col-span-2 h-4 w-full" />
        <Skeleton className="col-span-2 h-4 w-full" />
        <Skeleton className="col-span-1 h-4 w-full" />
      </div>

      {/* Table rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={`row-${i}`} className="group grid grid-cols-12 gap-4 border-b border-border py-4">
          <div className="col-span-2 flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="col-span-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="col-span-1 flex items-center justify-end">
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}