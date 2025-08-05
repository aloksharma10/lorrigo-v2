'use client';

import { Button, DataTable, Badge, DataTableColumnHeader, type ColumnDef } from '@lorrigo/ui/components';

interface Invoice {
  id: string;
  invoiceId: string;
  invoiceDate: string;
  dueDate: string;
  total: string;
  status: string;
}

export default function InvoicesTab() {
  // Mock data for invoices
  const invoiceData: Invoice[] = [
    {
      id: '1',
      invoiceId: 'SRF26HR0001032',
      invoiceDate: '2025-05-14 20:50:34',
      dueDate: '2025-05-21',
      total: '€292676.78',
      status: 'Paid',
    },
    {
      id: '2',
      invoiceId: 'SRF26HR0000586',
      invoiceDate: '2025-04-29 21:50:03',
      dueDate: '2025-05-06',
      total: '€265521.82',
      status: 'Paid',
    },
    {
      id: '3',
      invoiceId: 'SRF26HR0000116',
      invoiceDate: '2025-04-14 20:38:17',
      dueDate: '2025-04-21',
      total: '€115542.21',
      status: 'Paid',
    },
    {
      id: '4',
      invoiceId: 'SRF25HR0010455',
      invoiceDate: '2025-03-29 22:31:05',
      dueDate: '2025-04-05',
      total: '€234579.21',
      status: 'Paid',
    },
    {
      id: '5',
      invoiceId: 'SRF25HR0010055',
      invoiceDate: '2025-03-15 22:19:03',
      dueDate: '2025-03-22',
      total: '€43653.61',
      status: 'Paid',
    },
    {
      id: '6',
      invoiceId: 'SRV25DL0003383',
      invoiceDate: '2025-03-07 23:56:30',
      dueDate: '2025-03-14',
      total: '€1505.42',
      status: 'Paid',
    },
    {
      id: '7',
      invoiceId: 'SRF25HR0009559',
      invoiceDate: '2025-02-27 23:41:56',
      dueDate: '2025-03-06',
      total: '€39928.05',
      status: 'Paid',
    },
    {
      id: '8',
      invoiceId: 'SRF25HR0009089',
      invoiceDate: '2025-02-14 21:43:39',
      dueDate: '2025-02-21',
      total: '€21432.02',
      status: 'Paid',
    },
    {
      id: '9',
      invoiceId: 'SRV25DL0003032',
      invoiceDate: '2025-02-12 20:07:31',
      dueDate: '2025-02-19',
      total: '€517.10',
      status: 'Paid',
    },
    {
      id: '10',
      invoiceId: 'SRF25HR0008661',
      invoiceDate: '2025-01-31 23:00:28',
      dueDate: '2025-02-07',
      total: '€35563.96',
      status: 'Paid',
    },
    {
      id: '11',
      invoiceId: 'SRF25HR0008159',
      invoiceDate: '2025-01-14 21:00:12',
      dueDate: '2025-01-21',
      total: '€18410.57',
      status: 'Paid',
    },
  ];

  // Define the columns for the data table
  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'invoiceId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice ID" />,
      cell: ({ row }) => {
        const invoiceId = row.getValue('invoiceId') as string;
        const parts = invoiceId.split('0');
        return (
          <div className="font-medium">
            <div>{parts[0]}</div>
            {parts[1] && <div className="text-sm text-gray-500">{parts[1]}</div>}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'invoiceDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice Date" />,
      cell: ({ row }) => {
        const date = row.getValue('invoiceDate') as string;
        return <div>{date}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'dueDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
      cell: ({ row }) => {
        const date = row.getValue('dueDate') as string;
        return <div>{date}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const total = row.getValue('total') as string;
        return <div className="font-medium">{total}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>;
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
      cell: ({ row }) => {
        return (
          <Button variant="link" className="p-0 text-blue-600">
            View Invoice
          </Button>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // Define filterable columns
  const filterableColumns = [
    {
      id: 'status',
      title: 'Status',
      options: [
        { label: 'Paid', value: 'Paid' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Overdue', value: 'Overdue' },
      ],
    },
  ];

  // Define bulk actions
  const bulkActions = [
    {
      label: 'Download Invoices',
      action: (selectedRows: Invoice[]) => {
        console.log('Download invoices for:', selectedRows);
      },
      isLoading: false,
    },
    {
      label: 'Export to PDF',
      action: (selectedRows: Invoice[]) => {
        console.log('Export to PDF:', selectedRows);
      },
      isLoading: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b">
        <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
          Freight Invoices Apr 2020 Onwards
        </Button>
        <Button variant="ghost">All Other Invoices</Button>
        <div className="ml-auto">
          <Button variant="link" className="text-blue-600">
            Need help with Invoice issues?
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={invoiceData}
        count={invoiceData.length}
        pageCount={1}
        page={0}
        pageSize={15}
        filterableColumns={filterableColumns}
        bulkActions={bulkActions}
        dateRangeFilter={true}
        searchableColumns={[
          {
            id: 'invoiceId',
            title: 'Invoice ID',
          },
        ]}
        searchPlaceholder="Search by Invoice ID"
        isLoading={false}
        isError={false}
        errorMessage="Failed to fetch invoices. Please try again."
        manualPagination={false}
        manualSorting={false}
        manualFiltering={false}
      />
    </div>
  );
}
