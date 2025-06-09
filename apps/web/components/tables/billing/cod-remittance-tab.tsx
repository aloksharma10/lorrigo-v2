'use client';
import {
  Button,
  DataTable,
  Badge,
  DataTableColumnHeader,
  Card,
  CardContent,
  type ColumnDef,
} from '@lorrigo/ui/components';

import { Info, Plus, Download } from 'lucide-react';

interface CODRemittance {
  id: string;
  date: string;
  crfId: string;
  utr: string;
  codAvailable: number;
  amountCredited: number;
  earlyCodCharges: number;
  rtoReversal: number;
  adjustedAmount: string;
  remittanceAmount: number;
  remittanceMethod: string;
  status: string;
  remarks: string;
}

export default function CODRemittanceTab() {
  // Mock data for COD remittance
  const summaryCards = [
    {
      title: 'COD To Be Remitted',
      amount: '₹ 7,418,819.05',
      bgColor: 'bg-blue-600',
      hasInfo: true,
    },
    {
      title: 'Last COD Remitted',
      amount: '₹ 243,612.95',
      bgColor: 'bg-blue-600',
    },
    {
      title: 'Total COD Remitted',
      amount: '₹ 7,819,776.52',
      bgColor: 'bg-blue-600',
    },
    {
      title: 'Total deduction from COD',
      amount: '₹ 1,572,996.19',
      bgColor: 'bg-blue-600',
      hasInfo: true,
    },
    {
      title: 'Remittance Initiated',
      amount: '₹ 0.00',
      bgColor: 'bg-blue-600',
    },
  ];

  const codData: CODRemittance[] = [
    {
      id: '1',
      date: 'Fri, May 23, 2025',
      crfId: '10943791',
      utr: 'ICICN220250523481 66094',
      codAvailable: 251401.05,
      amountCredited: 7788.1,
      earlyCodCharges: 0.0,
      rtoReversal: 0.0,
      adjustedAmount: 'N/A',
      remittanceAmount: 243612.95,
      remittanceMethod: 'Postpaid',
      status: 'Remittance success',
      remarks: 'Remitted',
    },
    {
      id: '2',
      date: 'Thu, May 22, 2025',
      crfId: '10932775',
      utr: 'ICICN220250522474 03015',
      codAvailable: 96764.55,
      amountCredited: 42519.41,
      earlyCodCharges: 0.0,
      rtoReversal: 999.0,
      adjustedAmount: 'N/A',
      remittanceAmount: 53246.14,
      remittanceMethod: 'Postpaid',
      status: 'Remittance success',
      remarks: 'Remitted',
    },
    {
      id: '3',
      date: 'Wed, May 21, 2025',
      crfId: '10924319',
      utr: 'ICICN220250521464 76285',
      codAvailable: 221934.35,
      amountCredited: 44732.6,
      earlyCodCharges: 0.0,
      rtoReversal: 0.0,
      adjustedAmount: 'N/A',
      remittanceAmount: 177201.75,
      remittanceMethod: 'Postpaid',
      status: 'Remittance success',
      remarks: 'Remitted',
    },
    {
      id: '4',
      date: 'Tue, May 20, 2025',
      crfId: '10916456',
      utr: 'ICICN220250520456 41927',
      codAvailable: 250310.6,
      amountCredited: 66282.97,
      earlyCodCharges: 0.0,
      rtoReversal: 0.0,
      adjustedAmount: 'N/A',
      remittanceAmount: 184027.63,
      remittanceMethod: 'Postpaid',
      status: 'Remittance success',
      remarks: 'Remitted',
    },
    {
      id: '5',
      date: 'Mon, May 19, 2025',
      crfId: '10907378',
      utr: 'ICICN220250519448 92060',
      codAvailable: 579889.0,
      amountCredited: 88024.36,
      earlyCodCharges: 0.0,
      rtoReversal: 0.0,
      adjustedAmount: 'N/A',
      remittanceAmount: 491864.64,
      remittanceMethod: 'Postpaid',
      status: 'Remittance success',
      remarks: 'Remitted',
    },
  ];

  // Define the columns for the data table
  const columns: ColumnDef<CODRemittance>[] = [
    {
      accessorKey: 'date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => {
        const date = row.getValue('date') as string;
        return <div className="text-blue-600">{date}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'crfId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="CRF ID" />,
      cell: ({ row }) => {
        const crfId = row.getValue('crfId') as string;
        return <div className="text-blue-600">{crfId}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'utr',
      header: ({ column }) => <DataTableColumnHeader column={column} title="UTR" />,
      cell: ({ row }) => {
        const utr = row.getValue('utr') as string;
        return <div className="text-sm">{utr}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'codAvailable',
      header: ({ column }) => <DataTableColumnHeader column={column} title="COD Available" />,
      cell: ({ row }) => {
        const amount = row.getValue('codAvailable') as number;
        return (
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-400" />₹{' '}
            {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'amountCredited',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount Credited To Wallet" />
      ),
      cell: ({ row }) => {
        const amount = row.getValue('amountCredited') as number;
        return <div>₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'earlyCodCharges',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Early COD Charges" />,
      cell: ({ row }) => {
        const charges = row.getValue('earlyCodCharges') as number;
        return <div>₹{charges.toFixed(2)}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'rtoReversal',
      header: ({ column }) => <DataTableColumnHeader column={column} title="RTO Reversal Amount" />,
      cell: ({ row }) => {
        const amount = row.getValue('rtoReversal') as number;
        return (
          <div className="flex items-center gap-2">
            ₹ {amount.toFixed(2)}
            {amount > 0 && <Plus className="h-4 w-4 text-green-600" />}
            <Info className="h-4 w-4 text-gray-400" />
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'adjustedAmount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Adjusted Amount" />,
      cell: ({ row }) => {
        const amount = row.getValue('adjustedAmount') as string;
        return <div>{amount}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'remittanceAmount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Remittance Amount" />,
      cell: ({ row }) => {
        const amount = row.getValue('remittanceAmount') as number;
        return (
          <div className="flex items-center gap-2">
            ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            <Info className="h-4 w-4 text-gray-400" />
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'remittanceMethod',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Remittance Method" />,
      cell: ({ row }) => {
        const method = row.getValue('remittanceMethod') as string;
        return (
          <Badge variant="outline" className="border-blue-600 text-blue-600">
            {method}
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant="outline" className="border-green-600 text-green-600">
            {status}
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'remarks',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Remarks" />,
      cell: ({ row }) => {
        const remarks = row.getValue('remarks') as string;
        return <div>{remarks}</div>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
      cell: ({ row }) => {
        return (
          <Button size="sm" variant="ghost">
            <Download className="h-4 w-4" />
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
        { label: 'Remittance success', value: 'Remittance success' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Failed', value: 'Failed' },
      ],
    },
    {
      id: 'remittanceMethod',
      title: 'Remittance Method',
      options: [
        { label: 'Postpaid', value: 'Postpaid' },
        { label: 'Prepaid', value: 'Prepaid' },
      ],
    },
  ];

  // Define bulk actions
  const bulkActions = [
    {
      label: 'Download Reports',
      action: (selectedRows: CODRemittance[]) => {
        console.log('Download reports for:', selectedRows);
      },
      isLoading: false,
    },
    {
      label: 'Export to CSV',
      action: (selectedRows: CODRemittance[]) => {
        console.log('Export to CSV:', selectedRows);
      },
      isLoading: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b">
        <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
          COD Reconciliation
        </Button>
        <Button variant="ghost">Future COD</Button>
        <div className="ml-auto">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            COD Reconciliation
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card, index) => (
          <Card key={index} className={`${card.bgColor} text-white`}>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                {card.title}
                {card.hasInfo && <Info className="h-4 w-4" />}
              </div>
              <div className="text-lg font-bold">{card.amount}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={codData}
        count={codData.length}
        pageCount={1}
        page={0}
        pageSize={15}
        filterableColumns={filterableColumns}
        bulkActions={bulkActions}
        dateRangeFilter={true}
        searchableColumns={[
          {
            id: 'crfId',
            title: 'CRF ID',
          },
          {
            id: 'utr',
            title: 'UTR',
          },
        ]}
        searchPlaceholder="Search by AWB No."
        isLoading={false}
        isError={false}
        errorMessage="Failed to fetch COD remittance data. Please try again."
        manualPagination={false}
        manualSorting={false}
        manualFiltering={false}
      />
    </div>
  );
}
