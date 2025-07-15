'use client';
import {
  Button,
  DataTable,
  Badge,
  DataTableColumnHeader,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@lorrigo/ui/components';
import { Info, Download } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  useAdminRemittances,
  useSellerRemittances,
  exportAdminRemittances,
  exportSellerRemittances,
} from '@/lib/apis/remittance';
import { downloadBlob } from '@/lib/utils/downloadBlob';
import { useAuthToken } from '@/components/providers/token-provider';
import type { AxiosResponse } from 'axios';
import { useModalStore } from '@/modal/modal-store';

export default function CODRemittanceTab() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUBADMIN';
  const { isTokenReady } = useAuthToken();
  const openModal = useModalStore((state) => state.openModal);

  // Table state
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: '',
    remittanceMethod: '',
    from: '',
    to: '',
    // Add more filters as needed
  });

  // Advanced filters state
  const [search, setSearch] = useState('');
  const [remittanceId, setRemittanceId] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  // Update params when filters change
  useEffect(() => {
    setParams((prev) => ({
      ...prev,
      search,
      remittanceId,
      name,
      amount,
      status,
      from: dateRange.from,
      to: dateRange.to,
      page: 1, // Reset to first page on filter change
    }));
  }, [search, remittanceId, name, amount, status, dateRange]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRemittanceId, setSelectedRemittanceId] = useState<string | null>(null);

  // Fetch data
  const {
    data,
    isLoading,
    isError,
  } = isAdmin
    ? useAdminRemittances(params)
    : useSellerRemittances(params);

  // Export handler
  const handleExport = async (type: 'csv' | 'xlsx') => {
    const exportFn: (params: any) => Promise<import('axios').AxiosResponse<Blob>> = isAdmin ? exportAdminRemittances : exportSellerRemittances;
    const res = await exportFn({ ...params, type });
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : `remittances.${type}`;
    downloadBlob(res.data, filename);
  };

  // Columns definition (add tooltips for charges/amounts)
  const columns = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }: any) => (
          <DataTableColumnHeader column={column} title="Remittance ID" />
        ),
        cell: ({ row }: any) => row.getValue('code'),
      },
      {
        accessorKey: 'remittance_date',
        header: ({ column }: any) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }: any) => new Date(row.getValue('remittance_date')).toLocaleDateString(),
      },
      {
        accessorKey: 'amount',
        header: ({ column }: any) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <DataTableColumnHeader column={column} title="Remittance Amount" />
                <Info className="inline h-4 w-4 text-gray-400 ml-1" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Total remittance amount after all deductions.</TooltipContent>
          </Tooltip>
        ),
        cell: ({ row }: any) => `₹ ${row.getValue('amount')?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      },
      {
        accessorKey: 'early_remittance_charge',
        header: ({ column }: any) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <DataTableColumnHeader column={column} title="Early COD Charges" />
                <Info className="inline h-4 w-4 text-gray-400 ml-1" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Fee for early remittance before standard cycle.</TooltipContent>
          </Tooltip>
        ),
        cell: ({ row }: any) => `₹ ${row.getValue('early_remittance_charge')?.toFixed(2)}`,
      },
      {
        accessorKey: 'wallet_transfer_amount',
        header: ({ column }: any) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <DataTableColumnHeader column={column} title="Total Deductions" />
                <Info className="inline h-4 w-4 text-gray-400 ml-1" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Total deductions from COD (FW, RTO, etc.)</TooltipContent>
          </Tooltip>
        ),
        cell: ({ row }: any) => `₹ ${row.getValue('wallet_transfer_amount')?.toFixed(2)}`,
      },
      {
        accessorKey: 'status',
        header: ({ column }: any) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }: any) => (
          <Badge variant="outline" className={row.getValue('status') === 'COMPLETED' ? 'border-green-600 text-green-600' : 'border-blue-600 text-blue-600'}>
            {row.getValue('status')}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Action',
        cell: ({ row }: any) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedRemittanceId(row.original.id);
              setModalOpen(true);
              openModal('remittance-detail', { id: row.original.id });
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [isAdmin]
  );

  // Type guards for data
  const remittanceOrders = Array.isArray(data?.remittanceOrders) ? data.remittanceOrders : [];
  const pagination = data?.pagination || { total: 0, page: 0, pages: 1 };

  // Pagination handler for DataTable
  const handlePaginationChange = ({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
    setParams((prev) => ({ ...prev, page: pageIndex + 1, limit: pageSize }));
  };

  // Filters, search, and table handlers
  // ... implement filter/search UI and handlers here

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Search</label>
          <input
            type="text"
            className="input input-bordered"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="AWB, Remittance ID, Name, etc."
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Remittance ID</label>
          <input
            type="text"
            className="input input-bordered"
            value={remittanceId}
            onChange={(e) => setRemittanceId(e.target.value)}
            placeholder="Remittance ID"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Name</label>
          <input
            type="text"
            className="input input-bordered"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Amount</label>
          <input
            type="number"
            className="input input-bordered"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Status</label>
          <select
            className="input input-bordered"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">From</label>
          <input
            type="date"
            className="input input-bordered"
            value={dateRange.from}
            onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">To</label>
          <input
            type="date"
            className="input input-bordered"
            value={dateRange.to}
            onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>
      {/* Export buttons */}
      <div className="flex gap-2 mb-4">
        <Button onClick={() => handleExport('csv')} variant="outline">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
        <Button onClick={() => handleExport('xlsx')} variant="outline">
          <Download className="h-4 w-4 mr-2" /> Export XLSX
        </Button>
      </div>
      {/* Data Table */}
      <DataTable
        columns={columns}
        data={remittanceOrders}
        count={pagination.total}
        page={params.page - 1}
        pageSize={params.limit}
        pageCount={pagination.pages}
        onPaginationChange={handlePaginationChange}
        isLoading={isLoading}
        isError={isError}
      />
      {/* Modal for remittance detail, registered via modal provider */}
      {/* The modal is now opened via openModal('remittance-detail', { id }) */}
    </div>
  );
}
