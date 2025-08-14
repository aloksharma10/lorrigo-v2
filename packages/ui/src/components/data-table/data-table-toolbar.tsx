'use client';

import * as React from 'react';
import type { Table } from '@tanstack/react-table';
import { Button } from '../button';
import { Input } from '../input';
// import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import { DataTableDateRangePicker } from './data-table-date-range-picker';
import { Download, Filter, X, Loader2, Upload } from 'lucide-react';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
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
  dateRangeFilter?: boolean;
  dateRange: { from: Date; to: Date };
  setDateRange: (dateRange: { from: Date; to: Date }) => void;
  searchPlaceholder?: string;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  isLoading?: boolean;
  showDownload?: boolean;
  handleDownload?: () => void;
  isDownloading?: boolean;
  handleUpload?: () => void;
  isUploading?: boolean;
}

export function DataTableToolbar<TData>({
  table,
  filterableColumns = [],
  searchableColumns = [],
  advancedFilter = true,
  dateRangeFilter = true,
  dateRange,
  setDateRange,
  searchPlaceholder = 'Search...',
  globalFilter,
  setGlobalFilter,
  isLoading = false,
  showDownload = true,
  handleDownload,
  isDownloading = false,
  handleUpload,
  isUploading = false,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter !== '';
  const [showFilters, setShowFilters] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState(globalFilter);

  // Debounce search to avoid excessive API calls
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setGlobalFilter(searchValue);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchValue, setGlobalFilter]);

  // Sync external global filter with internal state
  React.useEffect(() => {
    setSearchValue(globalFilter);
  }, [globalFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 items-center space-y-2 lg:flex lg:space-x-2 lg:space-y-0">
          <div className="relative max-w-lg flex-1">
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              // isLoading={isLoading}
              // disabled={isLoading}
              type="search"
            />
          </div>

          <div className="flex items-center gap-2">
            {dateRangeFilter && (
              <DataTableDateRangePicker
                dateRange={dateRange}
                setDateRange={(dateRange) => setDateRange({ from: dateRange.from!, to: dateRange.to! })}
                disabled={isLoading}
              />
            )}

            {advancedFilter && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 items-center gap-1 lg:flex"
                onClick={() => setShowFilters(!showFilters)}
                disabled={isLoading}
                icon={Filter}
                {...(isFiltered && { iconProps: { className: 'text-primary', fill: 'currentColor' } })}
              >
                <span className="hidden sm:inline">More Filters</span>
              </Button>
            )}

            {showDownload && handleDownload && (
              <Button
                icon={Download}
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleDownload}
                isLoading={isDownloading}
                disabled={isLoading || isDownloading}
              />
            )}
          </div>

          {handleUpload && (
            <div className="flex items-center gap-2">
              <Button
                icon={Upload}
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleUpload}
                isLoading={isUploading}
                disabled={isLoading || isUploading}
              />
            </div>
          )}

          {isFiltered && (
            <Button
              variant="outline"
              onClick={() => {
                table.resetColumnFilters();
                setGlobalFilter('');
              }}
              // className="h-8 px-2 lg:px-3"
              disabled={isLoading}
              icon={X}
              iconProps={{ className: 'text-primary', fill: 'currentColor' }}
            >
              Reset
            </Button>
          )}
        </div>

        {/* <DataTableViewOptions table={table} disabled={isLoading} /> */}
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
              )
          )}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters();
                setGlobalFilter('');
              }}
              className="h-8 px-2 lg:px-3"
              disabled={isLoading}
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
          {isLoading && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading filters...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
