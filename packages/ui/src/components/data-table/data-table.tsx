'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  OnChangeFn,
} from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table';

import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import { DataTableSelectedActions } from './data-table-selected-actions';

import { Skeleton } from '../skeleton';
import { Alert, AlertDescription, AlertTitle } from '../alert';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../card';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  count: number;
  filterableColumns?: {
    id: string;
    title: string;
    options: {
      label: string;
      value: string;
      icon?: React.ComponentType<{ className?: string }>;
    }[];
  }[];
  searchableColumns?: {
    id: string;
    title: string;
  }[];
  advancedFilter?: boolean;
  bulkActions?: {
    label: string;
    action: (selectedRows: TData[]) => void | Promise<void>;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    isLoading?: boolean;
  }[];
  dateRangeFilter?: boolean;
  defaultVisibility?: VisibilityState;
  defaultDateRange?: {
    from: Date;
    to: Date;
  };
  defaultSort?: SortingState;
  pageCount: number;
  pageSize: number;
  page: number;
  pageSizeOptions?: number[];
  searchPlaceholder?: string;
  selectable?: boolean;
  onRowClick?: (row: TData) => void;
  onSelectionChange?: (selectedRows: TData[]) => void;
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onFiltersChange?: (filters: ColumnFiltersState) => void;
  onGlobalFilterChange?: (value: string) => void;
  onDateRangeChange?: (dateRange: { from: Date; to: Date }) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  className?: string;
  showToolbar?: boolean;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  showDownload?: boolean;
  handleDownload?: () => void;
  isDownloading?: boolean;
  handleUpload?: () => void;
  isUploading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  count,
  filterableColumns = [],
  searchableColumns = [],
  advancedFilter = true,
  bulkActions = [],
  dateRangeFilter = true,
  defaultVisibility = {},
  defaultDateRange = {
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  },
  defaultSort = [],
  pageCount,
  pageSize = 15,
  page = 0,
  pageSizeOptions = [15, 25, 50, 100],
  searchPlaceholder = 'Search for AWB, Order ID, Buyer Mobile Number, Email, SKU, Pickup ID',
  selectable = true,
  onRowClick,
  onSelectionChange,
  onPaginationChange,
  onSortingChange,
  onFiltersChange,
  onGlobalFilterChange,
  onDateRangeChange,
  isLoading = false,
  isError = false,
  errorMessage = 'An error occurred while fetching data.',
  className,
  showToolbar = true,
  manualPagination = true,
  manualSorting = true,
  manualFiltering = true,
  showDownload = true,
  handleDownload,
  isDownloading = false,
  handleUpload,
  isUploading = false,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultVisibility);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>(defaultSort);
  const [globalFilter, setGlobalFilter] = React.useState<string>('');
  const [dateRange, setDateRange] = React.useState(defaultDateRange);
  const [{ pageIndex, pageSize: currentPageSize }, setPagination] = React.useState<PaginationState>(
    {
      pageIndex: page,
      pageSize: pageSize,
    }
  );

  // Reset row selection when data changes
  React.useEffect(() => {
    setRowSelection({});
  }, [data]);

  // Handle pagination state changes
  const handlePaginationChange = React.useCallback(
    (updater: (state: PaginationState) => PaginationState) => {
      setPagination((prev) => {
        const next = updater(prev);
        if (onPaginationChange) {
          onPaginationChange(next);
        }
        return next;
      });
    },
    [onPaginationChange]
  );

  // Handle sorting state changes
  const handleSortingChange = React.useCallback(
    (updater: (state: SortingState) => SortingState) => {
      setSorting((prev) => {
        const next = updater(prev);
        if (onSortingChange) {
          onSortingChange(next);
        }
        return next;
      });
    },
    [onSortingChange]
  );

  // Handle column filters state changes
  const handleFiltersChange = React.useCallback(
    (updater: (state: ColumnFiltersState) => ColumnFiltersState) => {
      setColumnFilters((prev) => {
        const next = updater(prev);
        if (onFiltersChange) {
          onFiltersChange(next);
        }
        return next;
      });
    },
    [onFiltersChange]
  );

  // Handle global filter state changes
  const handleGlobalFilterChange = React.useCallback(
    (value: string) => {
      setGlobalFilter(value);
      if (onGlobalFilterChange) {
        onGlobalFilterChange(value);
      }
    },
    [onGlobalFilterChange]
  );

  // Handle date range changes
  const handleDateRangeChange = React.useCallback(
    (value: { from: Date; to: Date }) => {
      setDateRange(value);
      if (onDateRangeChange) {
        onDateRangeChange(value);
      }
    },
    [onDateRangeChange]
  );

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      pagination: {
        pageIndex,
        pageSize: currentPageSize,
      },
    },
    enableRowSelection: selectable,
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange as OnChangeFn<SortingState>,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: handleFiltersChange as OnChangeFn<ColumnFiltersState>,
    onGlobalFilterChange: handleGlobalFilterChange,
    onPaginationChange: handlePaginationChange as OnChangeFn<PaginationState>,
    getCoreRowModel: getCoreRowModel(),
    manualPagination,
    manualSorting,
    manualFiltering,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row: any) => row.id?.toString() || Math.random().toString(),
  });

  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = Object.keys(rowSelection)
        .map((key) => {
          const row = data.find((item: any) => item.id?.toString() === key || '');
          return row as TData;
        })
        .filter(Boolean);
      onSelectionChange(selectedRows);
    }
  }, [data, rowSelection, onSelectionChange]);

  // Sync external pagination state with table state
  React.useEffect(() => {
    setPagination({
      pageIndex: page,
      pageSize: pageSize,
    });
  }, [page, pageSize]);

  if (isError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {showToolbar && (
          <DataTableToolbar
            table={table}
            filterableColumns={filterableColumns}
            searchableColumns={searchableColumns}
            advancedFilter={advancedFilter}
            dateRangeFilter={dateRangeFilter}
            dateRange={dateRange}
            setDateRange={handleDateRangeChange}
            searchPlaceholder={searchPlaceholder}
            globalFilter={globalFilter}
            setGlobalFilter={handleGlobalFilterChange}
            isLoading={isLoading}
            showDownload={showDownload}
            handleDownload={handleDownload}
            isDownloading={isDownloading}
            handleUpload={handleUpload}
            isUploading={isUploading}
            />
        )}

        {selectable && Object.keys(rowSelection).length > 0 && (
          <DataTableSelectedActions table={table} bulkActions={bulkActions} />
        )}

        <Card className="rounded-lg border-none">
          <CardContent className="rounded-sm border-none p-0 w-full overflow-x-auto">
            <Table className={className}>
              <TableHeader className="border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: currentPageSize }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((column, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      onClick={() => onRowClick && onRowClick(row.original)}
                      className={onRowClick ? 'cursor-pointer' : ''}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DataTablePagination
          table={table}
          pageSizeOptions={pageSizeOptions}
          totalCount={count}
          isLoading={isLoading}
          showToolbar={showToolbar}
        />
      </CardContent>
    </Card>
  );
}
