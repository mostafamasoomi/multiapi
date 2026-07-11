'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Notification {
  id: number;
  message: string;
  read: boolean;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('api_key') || '';
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '---';
  }
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    direction: 'rtl',
    padding: '32px 24px',
  },
  container: {
    maxWidth: 720,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 16,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius)',
    background: 'var(--bg-3)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    fontSize: 18,
    textDecoration: 'none',
    transition: 'all var(--transition)',
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 4,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    height: 22,
    borderRadius: 20,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '0 6px',
  },
  card: {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    backdropFilter: 'blur(12px)',
    overflow: 'hidden',
  },
  item: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    cursor: 'pointer',
    transition: 'background var(--transition)',
  },
  itemRead: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'var(--accent)',
    boxShadow: '0 0 10px var(--accent-glow)',
    flexShrink: 0,
    marginTop: 6,
  },
  dotRead: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'var(--text-muted)',
    opacity: 0.3,
    flexShrink: 0,
    marginTop: 6,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 1.8,
    color: 'var(--text)',
  },
  msgTextRead: {
    fontSize: 14,
    lineHeight: 1.8,
    color: 'var(--text-secondary)',
  },
  timeText: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 6,
  },
  emptyWrap: {
    textAlign: 'center' as const,
    padding: '80px 24px',
    color: 'var(--text-muted)',
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 20,
    filter: 'drop-shadow(0 8px 24px rgba(139, 92, 246, 0.4))',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: 'var(--text-muted)',
    lineHeight: 1.8,
    maxWidth: 360,
    margin: '0 auto',
  },
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '80px 0',
  },
  markAllBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-3)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    transition: 'all var(--transition)',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    fontSize: 16,
    transition: 'all var(--transition)',
  },
};

// ── Loading Skeleton ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={{ ...S.header, marginBottom: 32 }}>
          <div style={S.headerLeft}>
            <div
              className="skeleton"
              style={{ width: 40, height: 40, borderRadius: 'var(--radius)' }}
            />
            <div
              className="skeleton"
              style={{ width: 160, height: 28, borderRadius: 8 }}
            />
          </div>
        </div>
        <div style={S.card}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <div
                className="skeleton"
                style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 6 }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="skeleton"
                  style={{ width: '80%', height: 16, marginBottom: 8, borderRadius: 6 }}
                />
                <div
                  className="skeleton"
                  style={{ width: '30%', height: 12, borderRadius: 6 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError('لطفاً ابتدا وارد حساب کاربری خود شوید');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('نشست شما منقضی شده است');
          return;
        }
        throw new Error('خطا در دریافت اعلانها');
      }
      const data = await res.json();
      const list: Notification[] = Array.isArray(data) ? data : data.notifications || [];
      setNotifications(list);
    } catch (e: any) {
      setError(e.message || 'خطا در بارگذاری اعلانها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkRead(id: number) {
    const token = getToken();
    if (!token || markingId !== null) return;
    setMarkingId(id);
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch {
      // silent fail
    } finally {
      setMarkingId(null);
    }
  }

  async function handleMarkAllRead() {
    const token = getToken();
    if (!token) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    // Mark all unread in parallel
    try {
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications/${n.id}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silent
    }
  }

  if (loading) return <Skeleton />;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <Link href="/app" style={S.backBtn} title="بازگشت">
              →
            </Link>
            <div>
              <div style={S.title}>
                🔔 اعلانها
                {unreadCount > 0 && <span style={S.badge}>{unreadCount}</span>}
              </div>
              <div style={S.subtitle}>
                {notifications.length > 0
                  ? `${notifications.length} اعلان`
                  : 'اعلانی ندارید'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button style={S.markAllBtn} onClick={handleMarkAllRead}>
                ✓ خواندن همه
              </button>
            )}
            <button style={S.refreshBtn} onClick={fetchNotifications} title="بروزرسانی">
              🔄
            </button>
          </div>
        </div>

        {/* Auth required */}
        {!getToken() && (
          <div style={S.emptyWrap}>
            <div style={S.emptyIcon}>🔒</div>
            <div style={S.emptyTitle}>نیاز به ورود</div>
            <div style={S.emptyDesc}>
              برای مشاهده اعلانها، ابتدا باید وارد حساب کاربری خود شوید.
            </div>
          </div>
        )}

        {/* Error */}
        {error && getToken() && (
          <div style={S.emptyWrap}>
            <div style={S.emptyIcon}>⚠️</div>
            <div style={S.emptyTitle}>خطا</div>
            <div style={S.emptyDesc}>{error}</div>
            <button
              style={{
                ...S.markAllBtn,
                marginTop: 20,
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
              }}
              onClick={fetchNotifications}
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {/* Empty state */}
        {!error && getToken() && notifications.length === 0 && (
          <div style={S.emptyWrap}>
            <div style={S.emptyIcon}>🔔</div>
            <div style={S.emptyTitle}>اعلانی ندارید</div>
            <div style={S.emptyDesc}>
              وقتی اعلان جدیدی دریافت کنید، در اینجا نمایش داده خواهد شد.
            </div>
          </div>
        )}

        {/* Notification list */}
        {!error && getToken() && notifications.length > 0 && (
          <div style={S.card}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={n.read ? S.itemRead : S.item}
                onClick={() => !n.read && handleMarkRead(n.id)}
                onMouseEnter={(e) => {
                  if (!n.read) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--panel-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!n.read) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <span style={n.read ? S.dotRead : S.dot} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={n.read ? S.msgTextRead : S.msgText}>{n.message}</div>
                  <div style={S.timeText}>{formatDate(n.created_at)}</div>
                </div>
                {!n.read && markingId === n.id && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>...</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
