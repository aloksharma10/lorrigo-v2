'use client';

import * as React from 'react';
import { Checkbox } from '@lorrigo/ui/components';
import { DataTable } from '@lorrigo/ui/components';
import { DataTableColumnHeader } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { MoreHorizontal, Plus, Edit, Trash2, User, Mail, Phone, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@lorrigo/ui/components';
import { toast } from '@lorrigo/ui/components';
import type { ColumnDef } from '@lorrigo/ui/components';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useCustomerOperations, type Customer } from '@/lib/apis/customers';
import HoverCardToolTip from '@/components/hover-card-tooltip';
import { useSearchParams } from 'next/navigation';

interface CustomersTableProps {
  initialParams?: {
    page?: number;
    limit?: number;
    search?: string;
  };
}

export default function CustomersPage() {
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
  const { getCustomersQuery, createCustomer, updateCustomer, deleteCustomer } = useCustomerOperations();

  const customersQuery = getCustomersQuery(
    pagination.pageIndex + 1,
    pagination.pageSize,
    debouncedGlobalFilter
  );

  const { data, isLoading, isError } = customersQuery;

  // Handle create customer
  const handleCreateCustomer = () => {
    // TODO: Open create customer modal
    toast.info('Create customer functionality coming soon');
  };

  // Handle edit customer
  const handleEditCustomer = (customer: Customer) => {
    // TODO: Open edit customer modal
    toast.info('Edit customer functionality coming soon');
  };

  // Handle delete customer
  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await deleteCustomer.mutateAsync(customerId);
      toast.success('Customer deleted successfully');
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  // Define the columns for the data table
  const columns: ColumnDef<Customer>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
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
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer Details" />,
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-full">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex flex-col space-y-1">
              <div className="font-medium">{customer.name}</div>
              <div className="text-sm text-muted-foreground">{customer.id}</div>
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contact Information" />,
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex flex-col space-y-2">
            {customer.email && (
              <div className="flex items-center space-x-2">
                <Mail className="w-3 h-3 text-gray-500" />
                <span className="text-sm">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-3 h-3 text-gray-500" />
                <span className="text-sm">{customer.phone}</span>
              </div>
            )}
            {!customer.email && !customer.phone && (
              <span className="text-sm text-muted-foreground">No contact info</span>
            )}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'address',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Address" />,
      cell: ({ row }) => {
        const customer = row.original;
        const address = customer.address;
        
        if (!address) {
          return <span className="text-sm text-muted-foreground">No address</span>;
        }

        const fullAddress = `${address.address}, ${address.city}, ${address.state} - ${address.pincode}`;
        
        return (
          <div className="flex items-start space-x-2 max-w-xs">
            <MapPin className="w-3 h-3 text-gray-500 mt-1 flex-shrink-0" />
            <HoverCardToolTip label="Customer Address">
              <span className="text-sm truncate">{fullAddress}</span>
            </HoverCardToolTip>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => {
        // Note: The Customer interface doesn't have created_at, this is for future enhancement
        return (
          <div className="text-sm text-muted-foreground">
            N/A
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actions" />,
      cell: ({ row }) => {
        const customer = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Customer
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                View Orders
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDeleteCustomer(customer.id)}
                className="text-red-600 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database and contact information
          </p>
        </div>
        <Button onClick={handleCreateCustomer} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.customers || []}
        count={data?.total || 0}
        pageCount={data?.totalPages || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to fetch customers. Please try again."
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