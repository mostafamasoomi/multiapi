'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  full_key?: string;
  created_at: string;
  last_used_at: string | null;
  status: 'active' | 'revoked';
};

function getToken(): string {
  return typeof window !== 'undefined' ? localStorage.getItem('api_key') || '' : '';
}

function formatDate(iso: string | null): string {
  if (!iso) return '---';
  return new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch('/api/me/api-keys', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setKeys(Array.isArray(data) ? data : []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const token = getToken();
      const res = await fetch('/api/me/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data);
        setNewKeyName('');
        setShowCreate(false);
        loadKeys();
      } else {
        setToast('خطا در ایجاد کلید');
      }
    } catch { setToast('خطا در ارتباط با سرور'); }
    setCreating(false);
  }

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`آیا از حذف کلید «${name}» اطمینان دارید؟`)) return;
    const token = getToken();
    const res = await fetch(`/api/me/api-keys/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      setToast(`کلید «${name}» حذف شد`);
      loadKeys();
    }
  }

  async function copyKey(text: string) {
    try { await navigator.clipboard.writeText(text); setToast('کپی شد'); } catch { setToast('خطا در کپی'); }
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center' }}><div className="typing"><span /><span /><span /></div></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 24, maxWidth: 1000, margin: '0 auto', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>🔑 مدیریت کلیدهای API</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>کلیدهای دسترسی به API را ایجاد و مدیریت کنید</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: 'var(--accent-grad)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>➕ ایجاد کلید جدید</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 18px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d', fontSize: 13, lineHeight: 1.7, marginBottom: 28 }}>
        <span>⚠️</span>
        <span>کلید API فقط یکبار و در زمان ایجاد نمایش داده میشود. آن را در جای امنی ذخیره کنید.</span>
      </div>

      {keys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', maxWidth: 460, margin: '40px auto' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🔑</div>
          <h2 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>هنوز هیچ کلیدی نساختهاید</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>برای دسترسی به API یک کلید جدید ایجاد کنید.</p>
          <button onClick={() => setShowCreate(true)} style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: 'var(--accent-grad)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>➕ ایجاد اولین کلید</button>
        </div>
      ) : (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, background: 'rgba(124,92,255,0.08)', color: 'var(--accent)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>نام</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, background: 'rgba(124,92,255,0.08)', color: 'var(--accent)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>پیشوند</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, background: 'rgba(124,92,255,0.08)', color: 'var(--accent)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>تاریخ ایجاد</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, background: 'rgba(124,92,255,0.08)', color: 'var(--accent)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>آخرین استفاده</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, background: 'rgba(124,92,255,0.08)', color: 'var(--accent)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>وضعیت</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, background: 'rgba(124,92,255,0.08)', color: 'var(--accent)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>{k.name}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-3)', borderRadius: 6, direction: 'ltr' }}>{k.prefix}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{formatDate(k.created_at)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{formatDate(k.last_used_at)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: k.status === 'active' ? 'var(--success)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>● {k.status === 'active' ? 'فعال' : 'حذف شده'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', display: 'flex', gap: 6 }}>
                    {k.status === 'active' && (
                      <button onClick={() => copyKey(k.prefix)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: 14 }} title="کپی">📋</button>
                    )}
                    {k.status === 'active' && (
                      <button onClick={() => handleRevoke(k.id, k.name)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: 14 }} title="حذف">🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: 20 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
              <span>➕ ایجاد کلید جدید</span>
              <button onClick={() => setShowCreate(false)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px 18px' }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>نام کلید</label>
                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="مثلاً: کلید تولید" autoFocus required style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '10px 22px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14 }}>انصراف</button>
                <button type="submit" disabled={creating || !newKeyName.trim()} style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: 'var(--accent-grad)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: creating || !newKeyName.trim() ? 0.6 : 1 }}>{creating ? 'در حال ایجاد...' : 'ایجاد کلید'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Key Display */}
      {newKey && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: 20 }} onClick={() => setNewKey(null)}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
              <span>🔑 کلید API جدید</span>
              <button onClick={() => setNewKey(null)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: '20px 18px' }}>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#fcd34d', display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.7 }}>
                <span>⚠️</span>
                <span>این کلید فقط یکبار نمایش داده میشود. آن را در جای امنی ذخیره کنید.</span>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>نام کلید</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{newKey.name}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>کلید</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
                  <code style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', direction: 'ltr', textAlign: 'left' }}>{newKey.full_key}</code>
                  <button onClick={() => copyKey(newKey.full_key || '')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: 12 }}>📋 کپی</button>
                </div>
              </div>
              <button onClick={() => setNewKey(null)} style={{ width: '100%', padding: '10px 22px', borderRadius: 12, border: 'none', background: 'var(--accent-grad)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>متوجه شدم</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '12px 20px', borderRadius: 12, background: 'rgba(16,40,22,0.95)', border: '1px solid rgba(74,222,128,0.4)', color: '#b4f5c8', fontSize: 13, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={() => setToast('')}>✅ {toast}</div>}

      <Link href="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginTop: 24 }}>← بازگشت به چت</Link>
    </div>
  );
}
