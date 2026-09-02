import React, { useEffect, useState, useCallback } from 'react';
import paymentService from '../../services/paymentService';
import { useToast }   from '../../components/common/Toast';
import Badge          from '../../components/common/Badge';
import Pagination     from '../../components/common/Pagination';
import Button         from '../../components/common/Button';
import ConfirmDialog  from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState     from '../../components/common/EmptyState';
import { formatDate, formatCurrency, fullName } from '../../utils/helpers';

export default function AdminPayments() {
  const toast = useToast();
  const [payments,   setPayments]   = useState([]);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [statusF,    setStatusF]    = useState('');
  const [gatewayF,   setGatewayF]   = useState('');
  const [approveItem,setApproveItem]= useState(null);
  const [approving,  setApproving]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    paymentService.getAllPayments({
      status:  statusF  || undefined,
      gateway: gatewayF || undefined,
      page, limit: 20,
    })
      .then(res => { setPayments(res.data); setPagination(res.pagination); })
      .finally(() => setLoading(false));
  }, [statusF, gatewayF, page]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await paymentService.approvePayment(approveItem.id);
      toast.success('Payment approved and subscription activated');
      setApproveItem(null);
      load();
    } catch { toast.error('Failed to approve payment'); }
    finally { setApproving(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-gray-800">Payments</h2>
        <p className="text-sm text-gray-400 mt-0.5">{pagination.total || 0} total transactions</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="input-field text-sm w-auto" value={statusF}
          onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select className="input-field text-sm w-auto" value={gatewayF}
          onChange={e => { setGatewayF(e.target.value); setPage(1); }}>
          <option value="">All Gateways</option>
          <option value="chapa">Chapa</option>
          <option value="telebirr">Telebirr</option>
          <option value="santimpay">SantimPay</option>
          <option value="manual">Manual</option>
        </select>
        {(statusF || gatewayF) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusF(''); setGatewayF(''); }}>Clear</Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner variant="dots" className="py-16" />
      ) : payments.length === 0 ? (
        <EmptyState preset="payments" />
      ) : (
        <>
          <div className="soft-card overflow-hidden">
            <div className="hidden lg:grid grid-cols-10 gap-4 px-5 py-3 bg-surface border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-2">User</div>
              <div className="col-span-2">Plan</div>
              <div>Amount</div>
              <div>Gateway</div>
              <div>Status</div>
              <div className="col-span-2">Date</div>
              <div className="text-right">Action</div>
            </div>

            <div className="divide-y divide-gray-50">
              {payments.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface transition-colors flex-wrap">
                  <div className="flex-1 min-w-[150px]">
                    <p className="text-sm font-semibold text-gray-700">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-gray-400">{p.email}</p>
                  </div>
                  <span className="text-sm text-gray-600 flex-shrink-0 min-w-[80px]">{p.plan_name}</span>
                  <span className="text-sm font-semibold text-primary-600 flex-shrink-0">{formatCurrency(p.amount_etb)}</span>
                  <span className="text-xs text-gray-400 capitalize flex-shrink-0">{p.gateway}</span>
                  <Badge preset="payment" value={p.status} size="xs" dot />
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(p.created_at)}</span>
                  {p.status === 'pending' && (
                    <Button size="sm" variant="secondary" onClick={() => setApproveItem(p)}>
                      Approve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Pagination currentPage={page} totalPages={pagination.totalPages}
            onPageChange={setPage} totalItems={pagination.total} itemsPerPage={20} />
        </>
      )}

      <ConfirmDialog isOpen={!!approveItem} onClose={() => setApproveItem(null)}
        onConfirm={handleApprove} loading={approving}
        title="Approve Payment"
        message={`Manually approve payment of ${formatCurrency(approveItem?.amount_etb)} for ${approveItem?.first_name} ${approveItem?.last_name}? This will activate their subscription immediately.`}
        confirmLabel="Approve & Activate"
        variant="info" />
    </div>
  );
}
