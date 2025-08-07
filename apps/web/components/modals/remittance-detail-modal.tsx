import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Badge } from '@lorrigo/ui/components';
import { Calendar, CreditCard, Building2, User, FileText, Eye, DollarSign, X, XIcon, Download } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { fetchAdminRemittanceById, fetchSellerRemittanceById, exportAdminRemittanceDetail, exportSellerRemittanceDetail } from '@/lib/apis/remittance';
import { downloadBlob } from '@/lib/utils/downloadBlob';
import { useAuthToken } from '@/components/providers/token-provider';
import type { AxiosResponse } from 'axios';
import { currencyFormatter } from '@lorrigo/utils';
import { useModalStore } from '@/modal/modal-store';

export function RemittanceDetailModal() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUBADMIN';
  const { isTokenReady } = useAuthToken();

  const { modals, closeModal } = useModalStore();
  const modal_props = modals.filter((modal) => modal.type === 'remittance-detail')[0];
  const modal_id = modal_props!.id;
  const id = modal_props!.props.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: [isAdmin ? 'admin-remittance-detail' : 'seller-remittance-detail', id],
    queryFn: () => (isAdmin ? fetchAdminRemittanceById(id).then((res) => res) : fetchSellerRemittanceById(id).then((res) => res)),
    enabled: isTokenReady,
  });

  const handleExport = async (type: 'csv' | 'xlsx') => {
    const exportFn: (id: string, type: 'csv' | 'xlsx') => Promise<AxiosResponse<Blob>> = isAdmin ? exportAdminRemittanceDetail : exportSellerRemittanceDetail;
    const res = (await exportFn(id, type)) as AxiosResponse<Blob>;
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : `remittance-detail.${type}`;
    downloadBlob(res.data, filename);
  };

  useEffect(() => {
    if (!open) return;
    // Optionally refetch on open
  }, [open]);

  const remittance = data?.remittanceOrder || data?.remittance;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // if (!open) return null;

  return (
    <div className="rounded-lg bg-white shadow-xl">
      {/* Header */}
      <div className="rounded-t-lg border-b bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900 lg:text-xl">Remittance Details</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => closeModal(modal_id)} className="h-8 w-8 p-0 hover:bg-gray-200">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[calc(90vh-200px)] overflow-y-auto">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading remittance details...</p>
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <div className="mb-4 text-red-500">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <p className="font-medium text-red-600">Failed to load remittance details</p>
            <p className="mt-2 text-sm text-gray-500">Please try again later</p>
          </div>
        ) : remittance ? (
          <div className="space-y-6 p-6">
            {/* Header Information */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-blue-200">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Remittance ID</p>
                    <p className="text-sm font-semibold tracking-wide text-gray-900">{remittance.code}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-blue-200">
                  <div className="rounded-lg bg-green-100 p-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Remittance Date</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(remittance.remittance_date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-blue-200">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Eye className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <Badge className={`${getStatusColor(remittance.status)} rounded-full border px-3 py-1 text-xs font-medium`}>
                      {remittance.status?.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-blue-200">
                  <div className="rounded-lg bg-orange-100 p-2">
                    <Building2 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Bank Account</p>
                    <p className="text-sm font-semibold text-gray-900">{remittance.bank_account?.account_number || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{remittance.bank_account?.bank_name || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Information (Admin only) */}
            {isAdmin && remittance.user && (
              <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Seller Information</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-blue-100 bg-white p-3">
                    <p className="text-sm font-medium text-gray-600">Name</p>
                    <p className="text-sm font-semibold text-gray-900">{remittance.user.name}</p>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-white p-3">
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="text-sm font-semibold text-gray-900">{remittance.user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-green-100 bg-white p-4 text-center transition-shadow hover:shadow-md">
                  <div className="mb-2 text-xl font-bold text-green-600">
                    {/* ₹ {remittance.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'} */}
                    {currencyFormatter(remittance.amount || 0)}
                  </div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                </div>
                <div className="rounded-lg border border-orange-100 bg-white p-4 text-center transition-shadow hover:shadow-md">
                  <div className="mb-2 text-xl font-bold text-orange-600">{currencyFormatter(remittance.early_remittance_charge || 0)}</div>
                  <p className="text-sm font-medium text-gray-600">Early Remittance Charge</p>
                </div>
                <div className="rounded-lg border border-red-100 bg-white p-4 text-center transition-shadow hover:shadow-md">
                  <div className="mb-2 text-xl font-bold text-red-600">{currencyFormatter(remittance.wallet_transfer_amount || 0)}</div>
                  <p className="text-sm font-medium text-gray-600">Total Deductions</p>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    Orders in Remittance
                  </h3>
                  <Badge variant="outline" className="text-sm font-medium">
                    {remittance.orders?.length || 0} Orders
                  </Badge>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {remittance.orders?.length > 0 ? (
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr>
                        <th className="border-b px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order #</th>
                        <th className="border-b px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">AWB</th>
                        <th className="border-b px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                        <th className="border-b px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Payment Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {remittance.orders.map((order: any, index: number) => (
                        <tr key={order.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors hover:bg-blue-50`}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.order_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{order.shipment?.awb || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">{currencyFormatter(order.amount_to_collect || 0)}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant="outline" className="px-2 py-1 text-xs">
                              {order.payment_method || 'N/A'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-gray-500">
                    <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <p className="text-lg font-medium">No orders found</p>
                    <p className="text-sm">This remittance doesn't contain any orders</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No remittance data found</p>
            <p className="text-sm text-gray-500">Unable to load remittance details</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="rounded-b-lg border-t bg-gray-50 px-6 py-4">
        <div className="flex flex-col justify-end gap-3 lg:flex-row">
          <Button icon={XIcon} onClick={() => closeModal(modal_id)} variant="outline" className="px-6 hover:bg-gray-100">
            Close
          </Button>
          {remittance && (
              <div className='flex gap-3'>
                <Button 
                  onClick={() => handleExport('csv')} 
                  variant="outline"
                  className="px-6 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                >
                  <Download className="h-4 w-4 mr-2" /> 
                  Export CSV
                </Button>
                {/* <Button 
                  onClick={() => handleExport('xlsx')} 
                  className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" /> 
                  Export XLSX
                </Button> */}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
