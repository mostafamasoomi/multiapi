'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchAllPayments, PaymentRow } from '../../../lib/admin-api';
import { AdminToast } from '../components/AdminToast';

function ir(v: number) { return v.toLocaleString('fa-IR'); }

function statusColor(s: string) {
  switch (s) {
    case 'completed': return 'var(--ok)';
    case 'pending': return 'var(--warning)';
    case 'failed': return 'var(--danger)';
    default: return 'var(--text-muted)';
  }
}

function statusLabel(s: string) {
  switch (s) {
    case 'completed': return '✅ موفق';
    case 'pending': return '⏳ در انتظار';
    case 'failed': return '❌ ناموفق';
    default: return s;
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);

  const load = useCallback(async () => {
    try { setPayments(await fetchAllPayments()); }
    catch { setToastOk(false); setToast('خطا در بارگذاری پرداختها'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalAmount = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount_irr, 0);
  const successCount = payments.filter(p => p.status === 'completed').length;

  if (loading) return <div className="admin-loading"><div className="typing"><span /><span /><span /></div></div>;

  return (
    <>
      <h2 className="admin-page-title">💳 پرداختها</h2>

      {/* Stats */}
      <div className="admin-card-row" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{payments.length}</div>
          <div className="admin-stat-label">کل تراکنش</div>
        </div>
        <div className="admin-stat-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ok)' }}>{successCount}</div>
          <div className="admin-stat-label">موفق</div>
        </div>
        <div className="admin-stat-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{ir(totalAmount)}</div>
          <div className="admin-stat-label">مجموع درآمد (ریال)</div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>کاربر</th>
              <th>ایمیل</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
              <th>مرجع</th>
              <th>تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td className="text-xs" style={{ fontFamily: 'monospace' }}>{p.id.slice(0, 8)}...</td>
                <td>{p.user_id}</td>
                <td className="text-xs">{p.user_email || '---'}</td>
                <td style={{ fontWeight: 700 }}>{ir(p.amount_irr)} ریال</td>
                <td style={{ color: statusColor(p.status), fontWeight: 600, fontSize: 12 }}>
                  {statusLabel(p.status)}
                </td>
                <td className="text-xs" style={{ fontFamily: 'monospace', direction: 'ltr' }}>{p.ref_id || '---'}</td>
                <td className="text-xs">{p.created_at ? new Date(p.created_at).toLocaleDateString('fa-IR') : '---'}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={7} className="admin-table-empty">پرداختی موجود نیست</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminToast msg={toast} ok={toastOk} onClose={() => setToast('')} />
    </>
  );
}
