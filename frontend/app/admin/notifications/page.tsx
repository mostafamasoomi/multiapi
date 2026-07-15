'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchAllNotifications, sendNotification, NotificationRow } from '../../../lib/admin-api';
import { AdminToast } from '../components/AdminToast';

function ir(v: number) { return v.toLocaleString('fa-IR'); }

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);

  // Send notification state
  const [sendUserId, setSendUserId] = useState('');
  const [sendMsg, setSendMsg] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try { setNotifications(await fetchAllNotifications()); }
    catch { setToastOk(false); setToast('خطا در بارگذاری اعلانها'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSend() {
    if (!sendUserId || !sendMsg.trim()) return;
    setSending(true);
    try {
      await sendNotification(parseInt(sendUserId), sendMsg.trim());
      setToastOk(true);
      setToast('اعلان با موفقیت ارسال شد');
      setSendUserId('');
      setSendMsg('');
      load();
    } catch {
      setToastOk(false);
      setToast('خطا در ارسال اعلان');
    }
    setSending(false);
  }

  if (loading) return <div className="admin-loading"><div className="typing"><span /><span /><span /></div></div>;

  return (
    <>
      <h2 className="admin-page-title">🔔 اعلانها</h2>

      {/* Send Notification */}
      <div className="admin-card" style={{ marginBottom: 24, padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>ارسال اعلان جدید</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>شناسه کاربر</label>
            <input
              className="admin-inline-input"
              value={sendUserId}
              onChange={e => setSendUserId(e.target.value)}
              placeholder="user_id"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 3, minWidth: 200 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>متن اعلان</label>
            <input
              className="admin-inline-input"
              value={sendMsg}
              onChange={e => setSendMsg(e.target.value)}
              placeholder="متن اعلان..."
              style={{ width: '100%' }}
            />
          </div>
          <button
            className="admin-btn-sm admin-btn-success"
            onClick={handleSend}
            disabled={sending || !sendUserId || !sendMsg.trim()}
          >
            {sending ? '...' : 'ارسال'}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>کاربر</th>
              <th>ایمیل</th>
              <th>پیام</th>
              <th>وضعیت</th>
              <th>تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map(n => (
              <tr key={n.id}>
                <td>{n.id}</td>
                <td>{n.user_id}</td>
                <td className="text-xs">{n.user_email || '---'}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</td>
                <td>
                  <span style={{ color: n.read ? 'var(--text-muted)' : 'var(--ok)', fontWeight: 600, fontSize: 12 }}>
                    {n.read ? 'خوانده شده' : '● جدید'}
                  </span>
                </td>
                <td className="text-xs">{n.created_at ? new Date(n.created_at).toLocaleDateString('fa-IR') : '---'}</td>
              </tr>
            ))}
            {notifications.length === 0 && (
              <tr><td colSpan={6} className="admin-table-empty">اعلانی موجود نیست</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminToast msg={toast} ok={toastOk} onClose={() => setToast('')} />
    </>
  );
}
