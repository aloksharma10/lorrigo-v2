"use client"
import type { Table } from "@tanstack/react-table"
import { Button } from "../button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu"
import { ChevronDown, X, Loader2 } from "lucide-react"

interface DataTableSelectedActionsProps<TData> {
  table: Table<TData>
  bulkActions?: {
    label: string
    action: (selectedRows: TData[]) => void | Promise<void>
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    isLoading?: boolean
  }[]
}

export function DataTableSelectedActions<TData>({ table, bulkActions = [] }: DataTableSelectedActionsProps<TData>) {
  const selectedRowIds = Object.keys(table.getState().rowSelection)
  const selectedCount = selectedRowIds.length

  if (selectedCount === 0) return null

  // Get selected rows data
  const selectedRows = selectedRowIds
    .map((id) => {
      const row = table.getRowModel().rowsById[id]
      return row?.original as TData
    })
    .filter(Boolean)

  const isAnyActionLoading = bulkActions.some((action) => action.isLoading)

  return (
    <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => table.resetRowSelection()}
        className="h-8 px-2"
        disabled={isAnyActionLoading}
      >
        <X className="h-4 w-4 mr-2" />
        Clear selection
      </Button>
      {/* <div className="text-sm text-muted-foreground">
        {selectedCount} {selectedCount === 1 ? "row" : "rows"} selected
      </div> */}
      <div className="ml-auto flex items-center gap-2">
        {bulkActions.length === 1 ? (
          <Button
            size="sm"
            onClick={() => bulkActions?.[0]?.action?.(selectedRows)}
            variant={bulkActions?.[0]?.variant || "default"}
            className="h-8"
            disabled={bulkActions?.[0]?.isLoading}
          >
            {bulkActions?.[0]?.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {bulkActions?.[0]?.label}
          </Button>
        ) : bulkActions.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8" disabled={isAnyActionLoading}>
                {isAnyActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Bulk Actions ({selectedCount})
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {bulkActions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => action.action(selectedRows)}
                  disabled={action.isLoading}
                  className="flex items-center"
                >
                  {action.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  )
}
