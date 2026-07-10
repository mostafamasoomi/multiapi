'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchUsers,
  topupUser,
  fetchUserLedger,
  updateUserStatus,
  User,
  LedgerEntry,
} from '../../../lib/admin-api';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { AdminToast } from '../components/AdminToast';

function ir(v: number) {
  return v.toLocaleString('fa-IR');
}

function shortDate(s: string) {
  return s.slice(0, 10);
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);

  // Topup state
  const [topupId, setTopupId] = useState<number | null>(null);
  const [topupAmt, setTopupAmt] = useState('');

  // Ledger modal state
  const [ledgerUser, setLedgerUser] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    userId: number;
    newStatus: string;
    label: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await fetchUsers());
    } catch {
      setToastOk(false);
      setToast('خطا در بارگذاری کاربران');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function doTopup(userId: number) {
    const amt = parseInt(topupAmt);
    if (!amt) return;
    try {
      const d = await topupUser(userId, amt);
      setTopupId(null);
      setTopupAmt('');
      setToastOk(true);
      setToast(`شارژ موفق — موجودی جدید: ${ir(d.new_balance_irr)} ریال`);
      load();
    } catch {
      setToastOk(false);
      setToast('خطا در شارژ کاربر');
    }
  }

  async function viewLedger(userId: number) {
    setLedgerUser(userId);
    setLedgerLoading(true);
    try {
      setLedger(await fetchUserLedger(userId));
    } catch {
      setToastOk(false);
      setToast('خطا در بارگذاری تراکنش‌ها');
    } finally {
      setLedgerLoading(false);
    }
  }

  function promptStatusChange(userId: number, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const label = currentStatus === 'active' ? 'توقف' : 'فعال‌سازی';
    setConfirmAction({ userId, newStatus, label });
    setConfirmOpen(true);
  }

  async function handleConfirmStatusChange() {
    if (!confirmAction) return;
    try {
      await updateUserStatus(confirmAction.userId, confirmAction.newStatus);
      setToastOk(true);
      setToast(`وضعیت کاربر ${confirmAction.userId} به «${confirmAction.newStatus}» تغییر کرد`);
      load();
    } catch {
      setToastOk(false);
      setToast('خطا در تغییر وضعیت');
    } finally {
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  const columns: Column<User>[] = [
    {
      key: 'id',
      title: 'ID',
      render: (u) => u.id,
    },
    {
      key: 'username',
      title: 'ایمیل / نام کاربری',
      render: (u) => (
        <div>
          <div className="font-semibold">{u.username || '---'}</div>
          <div className="text-muted text-xs">{u.email || '---'}</div>
        </div>
      ),
    },
    {
      key: 'balance_irr',
      title: 'موجودی (ریال)',
      render: (u) => <span className="font-bold">{ir(u.balance_irr)}</span>,
    },
    {
      key: 'status',
      title: 'وضعیت',
      render: (u) => (
        <span
          className="status-badge"
          style={{
            color: u.status === 'active' ? 'var(--ok)' : 'var(--danger)',
          }}
        >
          {u.status === 'active' ? '✅ فعال' : u.status}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'عملیات',
      render: (u) => (
        <div className="admin-actions">
          {topupId === u.id ? (
            <span className="admin-inline-group">
              <input
                className="admin-inline-input"
                value={topupAmt}
                onChange={(e) => setTopupAmt(e.target.value)}
                placeholder="مبلغ ریال"
              />
              <button
                className="admin-btn-sm admin-btn-success"
                onClick={() => doTopup(u.id)}
                disabled={!topupAmt}
              >
                ✓
              </button>
              <button
                className="admin-btn-sm admin-btn-cancel"
                onClick={() => {
                  setTopupId(null);
                  setTopupAmt('');
                }}
              >
                ×
              </button>
            </span>
          ) : (
            <button
              className="admin-btn-sm"
              onClick={() => {
                setTopupId(u.id);
                setTopupAmt('');
              }}
            >
              شارژ
            </button>
          )}
          <button className="admin-btn-sm" onClick={() => viewLedger(u.id)}>
            دفترچه
          </button>
          <button
            className={
              'admin-btn-sm' +
              (u.status === 'active' ? ' admin-btn-danger' : ' admin-btn-success')
            }
            onClick={() => promptStatusChange(u.id, u.status)}
          >
            {u.status === 'active' ? 'توقف' : 'فعال‌سازی'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <h2 className="admin-page-title">کاربران</h2>
      <DataTable
        columns={columns}
        data={users as any}
        rowKey="id"
        loading={false}
        emptyMessage="کاربری یافت نشد"
      />

      {/* Ledger Modal */}
      {ledgerUser != null && (
        <div className="admin-modal-overlay" onClick={() => setLedgerUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <span>دفترچه تراکنش‌های کاربر #{ledgerUser}</span>
              <button className="admin-close-btn" onClick={() => setLedgerUser(null)}>
                ✕
              </button>
            </div>
            {ledgerLoading ? (
              <div className="admin-loading">
                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : (
              <div className="admin-modal-body">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>نوع</th>
                      <th>مبلغ</th>
                      <th>مانده</th>
                      <th>توضیح</th>
                      <th>تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((l) => (
                      <tr key={l.id}>
                        <td>{l.txn_type}</td>
                        <td
                          style={{
                            color: l.amount_irr > 0 ? 'var(--ok)' : 'var(--danger)',
                          }}
                        >
                          {l.amount_irr > 0 ? '+' : ''}
                          {ir(l.amount_irr)}
                        </td>
                        <td>{ir(l.balance_after_irr)}</td>
                        <td className="text-muted text-xs">{l.note || '---'}</td>
                        <td className="text-xs">
                          {l.created_at ? shortDate(l.created_at) : '---'}
                        </td>
                      </tr>
                    ))}
                    {ledger.length === 0 && (
                      <tr>
                        <td colSpan={5} className="admin-table-empty">
                          تراکنشی موجود نیست
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Dialog for status change */}
      <ConfirmDialog
        open={confirmOpen}
        title="تغییر وضعیت کاربر"
        message={
          confirmAction
            ? `آیا از ${confirmAction.label} کاربر #${confirmAction.userId} اطمینان دارید؟`
            : ''
        }
        confirmLabel="تأیید"
        danger
        onConfirm={handleConfirmStatusChange}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
      />

      <AdminToast msg={toast} ok={toastOk} onClose={() => setToast('')} />
    </>
  );
}