'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { Button, Input, Badge } from '@lorrigo/ui/components';
import { DataTable, DataTableColumnHeader } from '@lorrigo/ui/components';
import { Search, UserPlus, CreditCard, Package, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { currencyFormatter } from '@lorrigo/utils/functions';
import Link from 'next/link';
import { useUserOperations } from '@/lib/apis/users';
import { useDebounce } from '@/lib/hooks/use-debounce';

// Types
export interface UserDisplay {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  profile: {
    company_name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  _count: {
    orders: number;
    shipments: number;
    transactions: number;
  };
  wallet_balance: number;
  plan?: {
    name: string;
    type: string;
  };
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const router = useRouter();

  // Use the new users API hook
  const { usersQuery } = useUserOperations({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch || undefined,
  });

  const { data: usersResponse, isLoading } = usersQuery;
  const users = usersResponse?.data || [];
  const pagination = usersResponse?.pagination;

  const columns = [
    {
      accessorKey: 'name',
      header: ({ column }: any) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }: any) => {
        const user = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="text-xs text-muted-foreground">{user.profile?.company_name}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: ({ column }: any) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }: any) => {
        const role = row.getValue('role') as string;
        return (
          <Badge
            variant={role === 'ADMIN' ? 'default' : role === 'SELLER' ? 'secondary' : 'outline'}
          >
            {role}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'orders',
      header: ({ column }: any) => <DataTableColumnHeader column={column} title="Orders" />,
      cell: ({ row }: any) => {
        const count = row.original._count?.orders || 0;
        return <div className="font-medium">{count}</div>;
      },
    },
    {
      accessorKey: 'wallet_balance',
      header: ({ column }: any) => <DataTableColumnHeader column={column} title="Wallet Balance" />,
      cell: ({ row }: any) => {
        const balance = row.getValue('wallet_balance') as number;
        return <div className="font-medium">{currencyFormatter(balance || 0)}</div>;
      },
    },
    {
      accessorKey: 'plan',
      header: ({ column }: any) => <DataTableColumnHeader column={column} title="Plan" />,
      cell: ({ row }: any) => {
        const plan = row.original.plan;
        return (
          <div>
            {plan ? (
              <Badge variant="outline" className="font-normal">
                {plan.name}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                No Plan
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }: any) => <DataTableColumnHeader column={column} title="Joined" />,
      cell: ({ row }: any) => {
        const date = row.getValue('created_at') as string;
        return <div className="text-sm">{format(new Date(date), 'MMM dd, yyyy')}</div>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <Link href={`/admin/users/${user.id}`}>
                View Profile
              </Link>
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage users and their configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push('/admin/users/new')}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.reduce((sum: number, user) => sum + (user._count?.orders || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all users</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyFormatter(
                users.reduce((sum: number, user) => sum + (user.wallet_balance || 0), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total balance</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((user) => {
                const date = new Date(user.created_at);
                const now = new Date();
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(now.getDate() - 30);
                return date > thirtyDaysAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={users}
            count={pagination?.total || 0}
            pageCount={pagination?.totalPages || 0}
            page={currentPage - 1} // DataTable uses 0-based indexing
            pageSize={pageSize}
            onPaginationChange={(updater: any) => {
              if (typeof updater === 'function') {
                const newState = updater({
                  pageIndex: currentPage - 1,
                  pageSize,
                });
                setCurrentPage(newState.pageIndex + 1);
                setPageSize(newState.pageSize);
              }
            }}
            isLoading={isLoading}
            manualPagination={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
