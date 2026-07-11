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

// ── Component ──────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: Notification[] = Array.isArray(data) ? data : data.notifications || [];
        setNotifications(list.slice(0, 10));
        setCount(list.filter((n) => !n.read).length);
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function handleMarkRead(id: number) {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent fail
    }
  }

  function formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fa-IR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        title="اعلانها"
        style={{ position: 'relative' }}
      >
        🔔
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              insetInlineStart: 4,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'var(--danger)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              lineHeight: 1,
              boxShadow: '0 0 8px rgba(239,68,68,0.5)',
            }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 90,
            }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              insetInlineEnd: 0,
              width: 340,
              maxHeight: 400,
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>اعلانها</span>
              <Link
                href="/app/notifications"
                onClick={() => setOpen(false)}
                style={{
                  fontSize: 12,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
              >
                مشاهده همه
              </Link>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                  }}
                >
                  🔔 اعلانی ندارید
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: n.read ? 'default' : 'pointer',
                      background: n.read ? 'transparent' : 'rgba(139,92,246,0.06)',
                      transition: 'background var(--transition)',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    {!n.read && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          boxShadow: '0 0 8px var(--accent-glow)',
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: n.read ? 'var(--text-secondary)' : 'var(--text)',
                          lineHeight: 1.6,
                        }}
                      >
                        {n.message}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginTop: 4,
                        }}
                      >
                        {formatTime(n.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
