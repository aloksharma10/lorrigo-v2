"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { Button } from "../button"
import { Input } from "../input"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { DataTableDateRangePicker } from "./data-table-date-range-picker"
import { Download, Filter, Search, X, Loader2 } from "lucide-react"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  filterableColumns?: {
    id: string
    title: string
    options: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
  }[]
  searchableColumns?: {
    id: string
    title: string
  }[]
  advancedFilter?: boolean
  dateRangeFilter?: boolean
  dateRange: { from: Date; to: Date }
  setDateRange: (dateRange: { from: Date; to: Date }) => void
  searchPlaceholder?: string
  globalFilter: string
  setGlobalFilter: (value: string) => void
  isLoading?: boolean
}

export function DataTableToolbar<TData>({
  table,
  filterableColumns = [],
  searchableColumns = [],
  advancedFilter = true,
  dateRangeFilter = true,
  dateRange,
  setDateRange,
  searchPlaceholder = "Search...",
  globalFilter,
  setGlobalFilter,
  isLoading = false,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter !== ""
  const [showFilters, setShowFilters] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState(globalFilter)

  // Debounce search to avoid excessive API calls
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setGlobalFilter(searchValue)
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [searchValue, setGlobalFilter])

  // Sync external global filter with internal state
  React.useEffect(() => {
    setSearchValue(globalFilter)
  }, [globalFilter])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full sm:max-w-xl">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full pl-8 sm:max-w-xl"
              disabled={isLoading}
            />
            {searchValue && (
              <Button
                variant="ghost"
                onClick={() => setSearchValue("")}
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                disabled={isLoading}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>

          {advancedFilter && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 lg:flex items-center gap-1"
              onClick={() => setShowFilters(!showFilters)}
              disabled={isLoading}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">More Filters</span>
            </Button>
          )}

          {dateRangeFilter && (
            <DataTableDateRangePicker
              dateRange={dateRange}
              setDateRange={(dateRange) => setDateRange({ from: dateRange.from!, to: dateRange.to! })}
              disabled={isLoading}
            />
          )}

          <Button variant="outline" size="sm" className="h-9 hidden sm:flex" disabled={isLoading}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <DataTableViewOptions table={table} disabled={isLoading} />
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filterableColumns.map(
            (column) =>
              table.getColumn(column.id) && (
                <DataTableFacetedFilter
                  key={column.id}
                  column={table.getColumn(column.id)}
                  title={column.title}
                  options={column.options}
                  disabled={isLoading}
                />
              ),
          )}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters()
                setGlobalFilter("")
              }}
              className="h-8 px-2 lg:px-3"
              disabled={isLoading}
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading filters...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
