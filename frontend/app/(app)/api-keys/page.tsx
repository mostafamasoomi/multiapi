'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  full_key?: string; // only available immediately after creation
  created_at: string;
  last_used_at: string | null;
  status: 'active' | 'revoked';
};

type ToastData = { message: string; ok: boolean };

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateId(): string {
  return `key_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getApiToken(): string {
  return typeof window !== 'undefined' ? localStorage.getItem('api_key') || '' : '';
}

function loadLocalKeys(): ApiKey[] {
  try {
    const raw = localStorage.getItem('api_keys');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalKeys(keys: ApiKey[]): void {
  localStorage.setItem('api_keys', JSON.stringify(keys));
}

function formatDate(iso: string | null): string {
  if (!iso) return '---';
  const d = new Date(iso);
  return d.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message, ok, onClose }: { message: string; ok: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: message ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100px)',
        padding: '12px 20px',
        borderRadius: 12,
        fontSize: 13.5,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: '90vw',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        background: ok ? 'rgba(16,40,22,0.95)' : 'rgba(40,16,22,0.95)',
        border: `1px solid ${ok ? 'rgba(74,222,128,0.4)' : 'rgba(255,107,138,0.4)'}`,
        color: ok ? '#b4f5c8' : '#ffc2cf',
      }}
    >
      {ok ? '✅' : '⚠️'} {message}
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div style={S.modalOverlay} onClick={onCancel}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHead}>
          <span>{title}</span>
          <button style={S.closeBtn} onClick={onCancel}>
            ✕
          </button>
        </div>
        <div style={{ padding: '20px 18px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.8 }}>
            {message}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={S.btnSecondary} onClick={onCancel}>
              انصراف
            </button>
            <button style={S.btnDanger} onClick={onConfirm}>
              تأیید و حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Key Display ────────────────────────────────────────────────────────────

function NewKeyDisplay({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!apiKey.full_key) return;
    const ok = await copyToClipboard(apiKey.full_key);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHead}>
          <span>🔑 کلید API جدید</span>
          <button style={S.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: '20px 18px' }}>
          <div
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              color: '#fcd34d',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              lineHeight: 1.7,
            }}
          >
            <span>⚠️</span>
            <span>این کلید فقط یکبار نمایش داده می‌شود. آن را در جای امنی ذخیره کنید.</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>نام کلید</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{apiKey.name}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>کلید</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '8px 12px',
              }}
            >
              <code
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: 'var(--text)',
                  wordBreak: 'break-all',
                  direction: 'ltr',
                  textAlign: 'left',
                }}
              >
                {apiKey.full_key}
              </code>
              <button style={copied ? S.copyBtnCopied : S.copyBtn} onClick={handleCopy}>
                {copied ? '✓ کپی شد' : '📋 کپی'}
              </button>
            </div>
          </div>
          <button style={S.btnPrimary} onClick={onClose}>
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Key Form ────────────────────────────────────────────────────────────

function CreateKeyForm({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (key: ApiKey) => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const token = getApiToken();
      let newKey: ApiKey | null = null;

      // Try backend first
      if (token) {
        const res = await fetch('/api/me/api-keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: name.trim() }),
        });
        if (res.ok) {
          newKey = await res.json();
        }
      }

      // Fallback to localStorage
      if (!newKey) {
        const id = generateId();
        const fullKey = `sk-${generateId()}${generateId()}`;
        newKey = {
          id,
          name: name.trim(),
          prefix: fullKey.slice(0, 8),
          full_key: fullKey,
          created_at: new Date().toISOString(),
          last_used_at: null,
          status: 'active',
        };
      }

      // If backend didn't return full_key, it's stored server-side only
      // In that case, we still show the prefix but no full key
      setName('');
      setError('');
      onCreated(newKey);
    } catch (e: any) {
      setError(e.message || 'خطا در ایجاد کلید');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHead}>
          <span>➕ ایجاد کلید جدید</span>
          <button style={S.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 18px' }}>
          {error && (
            <div
              style={{
                background: 'var(--danger-bg)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>نام کلید</label>
            <input
              style={S.input}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثلاً: کلید تولید"
              autoFocus
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" style={S.btnSecondary} onClick={onClose}>
              انصراف
            </button>
            <button
              type="submit"
              style={S.btnPrimary}
              disabled={loading || !name.trim()}
            >
              {loading ? 'در حال ایجاد...' : 'ایجاد کلید'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData>({ message: '', ok: true });
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
  }, []);

  // Load keys from backend or localStorage
  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const token = getApiToken();
      if (token) {
        const res = await fetch('/api/me/api-keys', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const keys = Array.isArray(data) ? data : data.keys || [];
          setKeys(keys);
          saveLocalKeys(keys); // sync to localStorage
          return;
        }
      }
      // Fallback to localStorage
      setKeys(loadLocalKeys());
    } catch {
      setKeys(loadLocalKeys());
      showToast('خطا در بارگذاری کلیدها — از حافظه محلی استفاده شد', false);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  // Save to localStorage whenever keys change (as fallback sync)
  useEffect(() => {
    saveLocalKeys(keys);
  }, [keys]);

  async function handleRevoke(key: ApiKey) {
    setRevoking(true);
    try {
      const token = getApiToken();
      let success = false;

      if (token) {
        const res = await fetch(`/api/me/api-keys/${key.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        success = res.ok;
      }

      if (success || !token) {
        // Remove from state (and localStorage via effect)
        setKeys(prev => prev.map(k => (k.id === key.id ? { ...k, status: 'revoked' as const } : k)));
        showToast(`کلید «${key.name}» با موفقیت حذف شد`, true);
      } else {
        showToast('خطا در حذف کلید', false);
      }
    } catch {
      showToast('خطا در ارتباط با سرور', false);
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  }

  async function handleCopy(key: ApiKey) {
    // For existing keys, copy the prefix (full key is not available after creation)
    const text = key.full_key || key.prefix;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(key.id);
      showToast('کلید در کلیپ‌بورد کپی شد', true);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      showToast('خطا در کپی کلید', false);
    }
  }

  function handleKeyCreated(key: ApiKey) {
    setKeys(prev => [key, ...prev]);
    setShowCreate(false);
    setNewKey(key);
  }

  const activeKeys = keys.filter(k => k.status === 'active');
  const revokedKeys = keys.filter(k => k.status === 'revoked');

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.center}>
          <div className="typing">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🔑 مدیریت کلیدهای API</h1>
          <p style={S.subtitle}>کلیدهای دسترسی به API را ایجاد و مدیریت کنید</p>
        </div>
        <button style={S.btnPrimary} onClick={() => setShowCreate(true)}>
          ➕ ایجاد کلید جدید
        </button>
      </div>

      {/* Warning banner */}
      <div style={S.warningBanner}>
        <span>⚠️</span>
        <span>کلید API فقط یکبار و در زمان ایجاد نمایش داده می‌شود. آن را در جای امنی ذخیره کنید.</span>
      </div>

      {/* Active Keys */}
      {activeKeys.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={S.sectionTitle}>
            کلیدهای فعال
            <span style={S.badge}>{activeKeys.length}</span>
          </h2>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>نام کلید</th>
                  <th style={S.th}>پیشوند</th>
                  <th style={S.th}>تاریخ ایجاد</th>
                  <th style={S.th}>آخرین استفاده</th>
                  <th style={S.th}>وضعیت</th>
                  <th style={S.th}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {activeKeys.map(key => (
                  <tr key={key.id} style={S.tr}>
                    <td style={{ ...S.td, fontWeight: 600 }}>{key.name}</td>
                    <td style={S.td}>
                      <code style={S.keyCode}>{key.prefix}...</code>
                    </td>
                    <td style={S.td}>{formatDate(key.created_at)}</td>
                    <td style={S.td}>
                      {key.last_used_at ? formatDate(key.last_used_at) : '---'}
                    </td>
                    <td style={S.td}>
                      <span style={S.statusActive}>● فعال</span>
                    </td>
                    <td style={{ ...S.td, display: 'flex', gap: 6 }}>
                      <button
                        style={copiedId === key.id ? S.copyBtnCopiedSm : S.actionBtn}
                        onClick={() => handleCopy(key)}
                        title="کپی پیشوند کلید"
                      >
                        {copiedId === key.id ? '✓' : '📋'}
                      </button>
                      <button
                        style={S.actionBtnDanger}
                        onClick={() => setRevokeTarget(key)}
                        title="حذف کلید"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ ...S.sectionTitle, color: 'var(--text-muted)' }}>
            کلیدهای حذف شده
            <span style={{ ...S.badge, background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
              {revokedKeys.length}
            </span>
          </h2>
          <div style={{ ...S.tableWrap, opacity: 0.55 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>نام کلید</th>
                  <th style={S.th}>پیشوند</th>
                  <th style={S.th}>تاریخ ایجاد</th>
                  <th style={S.th}>آخرین استفاده</th>
                  <th style={S.th}>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {revokedKeys.map(key => (
                  <tr key={key.id} style={S.tr}>
                    <td style={{ ...S.td, fontWeight: 600, textDecoration: 'line-through' }}>
                      {key.name}
                    </td>
                    <td style={S.td}>
                      <code style={S.keyCode}>{key.prefix}...</code>
                    </td>
                    <td style={S.td}>{formatDate(key.created_at)}</td>
                    <td style={S.td}>
                      {key.last_used_at ? formatDate(key.last_used_at) : '---'}
                    </td>
                    <td style={S.td}>
                      <span style={S.statusRevoked}>● حذف شده</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Empty State */}
      {keys.length === 0 && (
        <div style={S.emptyState}>
          <div style={{ fontSize: 56, marginBottom: 20, filter: 'drop-shadow(0 8px 24px rgba(139,92,246,0.4))' }}>
            🔑
          </div>
          <h2 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
            هنوز هیچ کلیدی نساخته‌اید
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
            برای دسترسی به API یک کلید جدید ایجاد کنید. کلیدها به شما امکان می‌دهند از مدل‌های هوش مصنوعی
            از طریق API استفاده کنید.
          </p>
          <button style={S.btnPrimary} onClick={() => setShowCreate(true)}>
            ➕ ایجاد اولین کلید
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateKeyForm open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleKeyCreated} />
      {newKey && <NewKeyDisplay apiKey={newKey} onClose={() => setNewKey(null)} />}
      <ConfirmDialog
        open={revokeTarget !== null}
        title="تأیید حذف کلید"
        message={`آیا از حذف کلید «${revokeTarget?.name}» اطمینان دارید؟ این عملیات قابل بازگشت نیست و تمام درخواست‌هایی که از این کلید استفاده می‌کنند از کار خواهند افتاد.`}
        onConfirm={() => revokeTarget && handleRevoke(revokeTarget)}
        onCancel={() => setRevokeTarget(null)}
      />

      <Toast message={toast.message} ok={toast.ok} onClose={() => setToast({ message: '', ok: true })} />
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    direction: 'rtl',
    background: 'var(--bg)',
    padding: '24px',
    maxWidth: 1000,
    margin: '0 auto',
  },
  center: {
    display: 'grid',
    placeItems: 'center',
    minHeight: 400,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: 'var(--text)',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-muted)',
  },
  warningBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '14px 18px',
    borderRadius: 12,
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    color: '#fcd34d',
    fontSize: 13,
    lineHeight: 1.7,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 10px',
    borderRadius: 20,
    background: 'rgba(139,92,246,0.15)',
    color: '#c4b5ff',
  },
  tableWrap: {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
    boxShadow: 'var(--shadow)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  },
  th: {
    padding: '12px 16px',
    textAlign: 'right' as const,
    fontWeight: 700,
    background: 'rgba(124,92,255,0.08)',
    color: 'var(--accent-2)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap' as const,
    fontSize: 12,
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.15s',
  },
  td: {
    padding: '12px 16px',
    whiteSpace: 'nowrap' as const,
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  keyCode: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 12,
    background: 'var(--bg-3)',
    padding: '3px 8px',
    borderRadius: 6,
    color: 'var(--text)',
    direction: 'ltr' as const,
    display: 'inline-block',
  },
  statusActive: {
    color: 'var(--success)',
    fontSize: 12,
    fontWeight: 600,
  },
  statusRevoked: {
    color: 'var(--text-muted)',
    fontSize: 12,
    fontWeight: 600,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    fontSize: 14,
    transition: 'all 0.15s',
  },
  actionBtnDanger: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    fontSize: 14,
    transition: 'all 0.15s',
  },
  copyBtnCopiedSm: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid rgba(34,197,94,0.3)',
    background: 'rgba(34,197,94,0.1)',
    color: 'var(--success)',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    fontSize: 14,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    maxWidth: 460,
    margin: '40px auto',
  },
  // Modal
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 50,
    backdropFilter: 'blur(4px)',
    padding: 20,
  },
  modal: {
    background: 'var(--panel-solid)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out',
  },
  modalHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid var(--border)',
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--text)',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    color: 'var(--text)',
    fontSize: 14,
    display: 'grid',
    placeItems: 'center',
  },
  // Buttons
  btnPrimary: {
    padding: '10px 22px',
    borderRadius: 12,
    border: 'none',
    background: 'var(--accent-grad)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(124,92,255,0.3)',
    transition: 'all 0.15s',
    opacity: 1,
  },
  btnSecondary: {
    padding: '10px 22px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  btnDanger: {
    padding: '10px 22px',
    borderRadius: 12,
    border: 'none',
    background: 'var(--danger)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  copyBtn: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s',
  },
  copyBtnCopied: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid rgba(34,197,94,0.3)',
    background: 'rgba(34,197,94,0.1)',
    color: 'var(--success)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    background: 'var(--bg-3)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
    transition: 'all 0.15s',
  },
};