'use client';

import * as React from 'react';
import { Checkbox } from '@lorrigo/ui/components';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { MoreHorizontal, Plus, Edit, Trash2, Package, DollarSign, Weight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@lorrigo/ui/components';
import { toast } from '@lorrigo/ui/components';
import type { ColumnDef } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useProductOperations, type Product } from '@/lib/apis/products';
import { currencyFormatter } from '@lorrigo/utils';
import { useSearchParams } from 'next/navigation';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const initialParams = {
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 0,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 15,
    search: searchParams.get('search') || '',
  };
  const [pagination, setPagination] = React.useState({
    pageIndex: initialParams.page || 0,
    pageSize: initialParams.limit || 15,
  });
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([]);
  const [filters, setFilters] = React.useState<{ id: string; value: any }[]>([]);
  const [globalFilter, setGlobalFilter] = React.useState(initialParams.search || '');
  const debouncedGlobalFilter = useDebounce(globalFilter, 500);

  // API hooks
  const { getProductsQuery } = useProductOperations();

  const productsQuery = getProductsQuery(pagination.pageIndex + 1, pagination.pageSize, debouncedGlobalFilter);

  const { data, isLoading, isError } = productsQuery;


  // Define the columns for the data table
  const columns: ColumnDef<Product>[] = [
    // {
    //   id: 'select',
    //   header: ({ table }) => (
    //     <Checkbox
    //       checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
    //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    //       aria-label="Select all"
    //       disabled={isLoading}
    //     />
    //   ),
    //   cell: ({ row }) => (
    //     <Checkbox
    //       checked={row.getIsSelected()}
    //       onCheckedChange={(value) => row.toggleSelected(!!value)}
    //       aria-label="Select row"
    //       onClick={(e) => e.stopPropagation()}
    //       disabled={isLoading}
    //     />
    //   ),
    //   enableSorting: false,
    //   enableHiding: false,
    // },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product Details" />,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex flex-col space-y-1">
              <div className="font-medium">{product.name}</div>
              <div className="text-muted-foreground text-sm">{product.id}</div>
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'selling_price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center space-x-2">
            <span className="font-medium">{currencyFormatter(product.selling_price || 0)}</span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'weight',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Weight" />,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center space-x-2">
            <Weight className="h-3 w-3 text-gray-500" />
            <span className="text-sm">{product.weight || 0} kg</span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'dimensions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dimensions (L×W×H)" />,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="text-sm">
            {product.dimensions}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'order_count',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Orders" />,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <Badge variant="outline" className="w-fit">
            {product.order_count}
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
      cell: ({ row }) => {
        const product = row.original;
        return <div className="text-muted-foreground text-sm">{product.created_at.split("T")[0]}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
  ];

  return (
    <div className="container mx-auto">
      <div className="mb-6">
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog and inventory</p>
      </div>

      <DataTable
        showDownload={false}
        advancedFilter={false}
        dateRangeFilter={false}
        columns={columns}
        data={data?.products || []}
        count={data?.total || 0}
        pageCount={data?.totalPages || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to fetch products. Please try again."
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
        onFiltersChange={setFilters}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  );
}
