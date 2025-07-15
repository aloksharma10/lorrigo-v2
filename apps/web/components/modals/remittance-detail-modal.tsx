import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@lorrigo/ui/components';
import { Button, Badge } from '@lorrigo/ui/components';
import { Download, Calendar, CreditCard, Building2, User, FileText, Eye, DollarSign, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { fetchAdminRemittanceById, fetchSellerRemittanceById, exportAdminRemittanceDetail, exportSellerRemittanceDetail } from '@/lib/apis/remittance';
import { downloadBlob } from '@/lib/utils/downloadBlob';
import { useAuthToken } from '@/components/providers/token-provider';
import type { AxiosResponse } from 'axios';

interface RemittanceDetailModalProps {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemittanceDetailModal({ id, open, onOpenChange }: RemittanceDetailModalProps) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUBADMIN';
  const { isTokenReady } = useAuthToken();

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [isAdmin ? 'admin-remittance-detail' : 'seller-remittance-detail', id],
    queryFn: () =>
      isAdmin
        ? fetchAdminRemittanceById(id).then((res) => res)
        : fetchSellerRemittanceById(id).then((res) => res),
    enabled: open && isTokenReady,
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
    // <Modal showModal={open} setShowModal={()=>{}} className="max-w-5xl max-h-[90vh] overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Remittance Details</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading remittance details...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <div className="text-red-500 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium">Failed to load remittance details</p>
              <p className="text-gray-500 text-sm mt-2">Please try again later</p>
            </div>
          ) : remittance ? (
            <div className="p-6 space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Remittance ID</p>
                      <p className="text-lg font-semibold text-gray-900">{remittance.code}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Remittance Date</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(remittance.remittance_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Eye className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Status</p>
                      <Badge className={`${getStatusColor(remittance.status)} px-3 py-1 text-sm font-medium rounded-full border`}>
                        {remittance.status?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Bank Account</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {remittance.bank_account?.account_number || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">{remittance.bank_account?.bank_name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller Information (Admin only) */}
              {isAdmin && remittance.user && (
                <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Seller Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-lg border border-blue-100">
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p className="text-lg font-semibold text-gray-900">{remittance.user.name}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-blue-100">
                      <p className="text-sm font-medium text-gray-600">Email</p>
                      <p className="text-lg font-semibold text-gray-900">{remittance.user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Summary */}
              <div className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border border-green-100 hover:shadow-md transition-shadow">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      ₹ {remittance.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </div>
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-orange-100 hover:shadow-md transition-shadow">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      ₹ {remittance.early_remittance_charge?.toFixed(2) || '0.00'}
                    </div>
                    <p className="text-sm font-medium text-gray-600">Early Remittance Charge</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-red-100 hover:shadow-md transition-shadow">
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      ₹ {remittance.wallet_transfer_amount?.toFixed(2) || '0.00'}
                    </div>
                    <p className="text-sm font-medium text-gray-600">Total Deductions</p>
                  </div>
                </div>
              </div>

              {/* Orders Table */}
              <div className="border rounded-lg overflow-hidden border-gray-200">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
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
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Order #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            AWB
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Payment Method
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {remittance.orders.map((order: any, index: number) => (
                          <tr key={order.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {order.order_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {order.shipment?.awb || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                              ₹ {order.amount_to_collect?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="outline" className="text-xs px-2 py-1">
                                {order.payment_method || 'N/A'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No orders found</p>
                      <p className="text-sm">This remittance doesn't contain any orders</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No remittance data found</p>
              <p className="text-sm text-gray-500">Unable to load remittance details</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <div className="flex gap-3 justify-end">
            <Button 
              onClick={() => onOpenChange(false)} 
              variant="outline" 
              className="px-6 hover:bg-gray-100"
            >
              Close
            </Button>
            {remittance && (
              <>
                <Button 
                  onClick={() => handleExport('csv')} 
                  variant="outline"
                  className="px-6 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                >
                  <Download className="h-4 w-4 mr-2" /> 
                  Export CSV
                </Button>
                <Button 
                  onClick={() => handleExport('xlsx')} 
                  className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" /> 
                  Export XLSX
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    // </Modal>
  );
}