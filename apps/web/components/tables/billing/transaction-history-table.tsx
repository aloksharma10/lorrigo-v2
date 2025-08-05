'use client';

import React, { useState, useCallback } from 'react';
import { History, ArrowUpDown, FileText, CreditCard } from 'lucide-react';
import { DataTable, DataTableColumnHeader, type ColumnDef, type ColumnFiltersState, Badge, Alert, AlertDescription } from '@lorrigo/ui/components';
import { CopyBtn } from '@/components/copy-btn';
import { currencyFormatter } from '@lorrigo/utils';
import { useWalletOperations } from '@/lib/apis/wallet';

interface TransactionHistoryTableProps {
  className?: string;
  entityType?: 'SHIPMENT' | 'INVOICE' | 'WALLET';
  userId?: string;
}

export function TransactionHistoryTable({ className, entityType, userId }: TransactionHistoryTableProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  // Get filter values - handle both single values and arrays
  const transactionTypeFilter = filters.find((f) => f.id === 'type')?.value as string[] | string | undefined;
  const statusFilter = filters.find((f) => f.id === 'status')?.value as string[] | string | undefined;
  const entityTypeFilter = filters.find((f) => f.id === 'entity_type')?.value as string[] | string | undefined;

  // Fetch transaction history
  const { getTransactionHistory } = useWalletOperations();
  const { data, isLoading, isError, isFetching, refetch } = getTransactionHistory({
    page: pagination.pageIndex + 1, // API uses 1-based pagination
    limit: pagination.pageSize,
    userId: userId,
    search: globalFilter,
    type: entityTypeFilter || entityType,
    dateRange: dateRange,
    transactionType: transactionTypeFilter,
    status: statusFilter,
  });

  // Define filterable columns
  const filterableColumns = [
    {
      id: 'type',
      title: 'Transaction Type',
      options: [
        { label: 'Credit', value: 'CREDIT' },
        { label: 'Debit', value: 'DEBIT' },
        { label: 'Hold', value: 'HOLD' },
        { label: 'Hold Release', value: 'HOLD_RELEASE' },
      ],
    },
    {
      id: 'status',
      title: 'Status',
      options: [
        { label: 'Completed', value: 'COMPLETED' },
        { label: 'Pending', value: 'PENDING' },
        { label: 'Failed', value: 'FAILED' },
        { label: 'Refunded', value: 'REFUNDED' },
      ],
    },
    {
      id: 'entity_type',
      title: 'Entity Type',
      options: [
        { label: 'Shipment', value: 'SHIPMENT', icon: History },
        { label: 'Invoice', value: 'INVOICE', icon: FileText },
        { label: 'Wallet', value: 'WALLET', icon: CreditCard },
      ],
    },
  ];

  // Define columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Transaction" />,
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className="flex flex-col">
            <CopyBtn
              label={transaction.code}
              text={transaction.code}
              className="font-medium text-blue-600"
              labelClassName="text-blue-600 hover:underline"
              tooltipText="Copy Transaction ID"
            />
            <div className="text-muted-foreground text-xs">{new Date(transaction.created_at).toLocaleDateString()}</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className="max-w-xs">
            <span className="font-medium">{transaction.description}</span>
            {transaction.awb && <div className="text-muted-foreground mt-1 text-xs">AWB: {transaction.awb}</div>}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const transaction = row.original;
        const isCredit = transaction.type === 'CREDIT';

        return (
          <Badge
            className={`flex w-fit items-center gap-1 ${isCredit ? 'border-green-200 bg-green-100 text-green-800' : 'border-red-200 bg-red-100 text-red-800'}`}
          >
            <ArrowUpDown className={`h-3 w-3 ${isCredit ? 'rotate-180' : ''}`} />
            {transaction.type}
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const transaction = row.original;
        const isCredit = transaction.type === 'CREDIT';

        return (
          <div className={`font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
            {isCredit ? '+' : '-'}
            {currencyFormatter(transaction.amount)}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const transaction = row.original;

        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'COMPLETED':
              return {
                className: 'bg-green-100 text-green-800 border-green-200',
                label: 'Completed',
              };
            case 'PENDING':
              return {
                className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                label: 'Pending',
              };
            case 'FAILED':
              return {
                className: 'bg-red-100 text-red-800 border-red-200',
                label: 'Failed',
              };
            case 'REFUNDED':
              return {
                className: 'bg-blue-100 text-blue-800 border-blue-200',
                label: 'Refunded',
              };
            default:
              return {
                className: 'bg-gray-100 text-gray-800 border-gray-200',
                label: status,
              };
          }
        };

        const config = getStatusConfig(transaction.status);

        return <Badge className={`${config.className} w-fit`}>{config.label}</Badge>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'entity_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Entity" />,
      cell: ({ row }) => {
        const transaction = row.original;

        const getEntityIcon = (entityType: string) => {
          switch (entityType) {
            case 'SHIPMENT':
              return History;
            case 'INVOICE':
              return FileText;
            case 'WALLET':
              return CreditCard;
            default:
              return History;
          }
        };

        const Icon = getEntityIcon(transaction.entity_type);

        return (
          <div className="flex items-center gap-2">
            <Icon className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">{transaction.entity_type}</span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
  ];

  // Handle pagination change
  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination);
  }, []);

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: ColumnFiltersState) => {
    setFilters(newFilters);
  }, []);

  // Handle global filter change
  const handleGlobalFilterChange = useCallback((newGlobalFilter: string) => {
    setGlobalFilter(newGlobalFilter);
  }, []);

  // Handle date range change
  const handleDateRangeChange = useCallback((newDateRange: { from: Date; to: Date }) => {
    setDateRange(newDateRange);
  }, []);

  if (isError) {
    return (
      <Alert className="m-4">
        <AlertDescription>Error loading transaction history. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.transactions || []}
        count={data?.pagination?.total || 0}
        pageCount={data?.pagination?.totalPages || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
        filterableColumns={filterableColumns}
        searchableColumns={[
          {
            id: 'code',
            title: 'Transaction ID',
          },
          {
            id: 'description',
            title: 'Description',
          },
          {
            id: 'awb',
            title: 'AWB Number',
          },
        ]}
        searchPlaceholder="Search transactions by ID, description, or AWB..."
        isLoading={isLoading || isFetching}
        isError={isError}
        onPaginationChange={handlePaginationChange}
        onFiltersChange={handleFiltersChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        onDateRangeChange={handleDateRangeChange}
        dateRangeFilter={true}
        defaultDateRange={dateRange}
        manualPagination={true}
        manualSorting={false}
        manualFiltering={true}
      />
    </>
  );
}
