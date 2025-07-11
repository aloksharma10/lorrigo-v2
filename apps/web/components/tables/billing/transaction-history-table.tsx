'use client';

import React, { useState } from 'react';
import { History, ArrowUpDown, FileText, CreditCard } from 'lucide-react';
import {
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
  Badge,
  Alert,
  AlertDescription,
} from '@lorrigo/ui/components';
import { useTransactionHistory, type Transaction } from '@/lib/apis/billing';
import { CopyBtn } from '@/components/copy-btn';
import { currencyFormatter } from '@lorrigo/utils';

interface TransactionHistoryTableProps {
  className?: string;
  entityType?: 'SHIPMENT' | 'INVOICE' | 'WALLET';
}

export function TransactionHistoryTable({ 
  className, 
  entityType 
}: TransactionHistoryTableProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });

  // Fetch transaction history
  const { data, isLoading, isError, isFetching, refetch } = useTransactionHistory({
    page: pagination.pageIndex + 1, // API uses 1-based pagination
    limit: pagination.pageSize,
    type: entityType,
  });

  // Define columns
  const columns: ColumnDef<Transaction>[] = [
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
              className="text-blue-600 font-medium"
              labelClassName="text-blue-600 hover:underline"
              tooltipText="Copy Transaction ID"
            />
            <div className="text-xs text-muted-foreground">
              {new Date(transaction.created_at).toLocaleDateString()}
            </div>
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
            {transaction.awb && (
              <div className="text-xs text-muted-foreground mt-1">
                AWB: {transaction.awb}
              </div>
            )}
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
            className={`flex items-center gap-1 w-fit ${
              isCredit 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-red-100 text-red-800 border-red-200'
            }`}
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
          <div className={`font-bold ${
            isCredit ? 'text-green-600' : 'text-red-600'
          }`}>
            {isCredit ? '+' : '-'}{currencyFormatter(transaction.amount)}
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
                label: 'Completed'
              };
            case 'PENDING':
              return {
                className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                label: 'Pending'
              };
            case 'FAILED':
              return {
                className: 'bg-red-100 text-red-800 border-red-200',
                label: 'Failed'
              };
            case 'REFUNDED':
              return {
                className: 'bg-blue-100 text-blue-800 border-blue-200',
                label: 'Refunded'
              };
            default:
              return {
                className: 'bg-gray-100 text-gray-800 border-gray-200',
                label: status
              };
          }
        };

        const config = getStatusConfig(transaction.status);
        
        return (
          <Badge className={`${config.className} w-fit`}>
            {config.label}
          </Badge>
        );
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
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{transaction.entity_type}</span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
  ];

  // Handle pagination change
  const handlePaginationChange = React.useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      setPagination(newPagination);
    },
    []
  );

  if (isError) {
    return (
      <Alert className="m-4">
        <AlertDescription>
          Error loading transaction history. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      <DataTable
        columns={columns}
        data={data?.transactions || []}
        count={data?.pagination?.total || 0}
        pageCount={data?.pagination?.totalPages || 0}
        page={pagination.pageIndex}
        pageSize={pagination.pageSize}
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
        manualPagination={true}
        manualSorting={false}
        manualFiltering={false}
      />
    </div>
  );
} 