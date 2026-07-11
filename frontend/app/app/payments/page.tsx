'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Payment {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  gateway_ref: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('api_key') || '';
}

function toPersianNum(v: number): string {
  return v.toLocaleString('fa-IR');
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

function statusConfig(status: string) {
  switch (status.toLowerCase()) {
    case 'success':
    case 'paid':
    case 'completed':
      return { label: 'موفق', color: 'var(--success)', bg: 'var(--success-bg)' };
    case 'pending':
    case 'processing':
      return { label: 'در انتظار', color: 'var(--warning)', bg: 'var(--warning-bg)' };
    case 'failed':
    case 'cancelled':
    case 'error':
      return { label: 'ناموفق', color: 'var(--danger)', bg: 'var(--danger-bg)' };
    default:
      return { label: status, color: 'var(--text-muted)', bg: 'rgba(113,113,122,0.10)' };
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
    maxWidth: 780,
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
  card: {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    backdropFilter: 'blur(12px)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 120px 100px 140px',
    gap: 12,
    padding: '12px 20px',
    borderBottom: '1px solid var(--border)',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 120px 100px 140px',
    gap: 12,
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    alignItems: 'center',
    transition: 'background var(--transition)',
    cursor: 'default',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },
  amount: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text)',
    whiteSpace: 'nowrap' as const,
  },
  dateText: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
  refText: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
    direction: 'ltr' as const,
    textAlign: 'right' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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
  mobileTableHeader: {
    display: 'none',
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
              style={{ width: 180, height: 28, borderRadius: 8 }}
            />
          </div>
        </div>
        <div style={S.card}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '1fr 120px 100px 140px',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div className="skeleton" style={{ height: 16, borderRadius: 6, maxWidth: '60%' }} />
              <div className="skeleton" style={{ height: 16, borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 24, borderRadius: 20, maxWidth: 80 }} />
              <div className="skeleton" style={{ height: 14, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mobile Payment Card ────────────────────────────────────────────────────────

function MobilePaymentCard({ payment }: { payment: Payment }) {
  const sc = statusConfig(payment.status);
  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
          {toPersianNum(payment.amount)} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>ریال</span>
        </span>
        <span
          style={{
            ...S.statusBadge,
            color: sc.color,
            background: sc.bg,
          }}
        >
          <span style={{ ...S.statusDot, background: sc.color }} />
          {sc.label}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(payment.created_at)}</span>
        {payment.gateway_ref && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', direction: 'ltr' }}>
            {payment.gateway_ref}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPayments = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError('لطفاً ابتدا وارد حساب کاربری خود شوید');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('نشست شما منقضی شده است');
          return;
        }
        throw new Error('خطا در دریافت تاریخچه پرداخت');
      }
      const data = await res.json();
      const list: Payment[] = Array.isArray(data) ? data : data.payments || data.data || [];
      setPayments(list);
    } catch (e: any) {
      setError(e.message || 'خطا در بارگذاری تاریخچه پرداخت');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  if (loading) return <Skeleton />;

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
              <div style={S.title}>💳 تاریخچه پرداخت</div>
              <div style={S.subtitle}>
                {payments.length > 0
                  ? `${toPersianNum(payments.length)} پرداخت`
                  : 'پرداختی نداشتهاید'}
              </div>
            </div>
          </div>
          <button style={S.refreshBtn} onClick={fetchPayments} title="بروزرسانی">
            🔄
          </button>
        </div>

        {/* Auth required */}
        {!getToken() && (
          <div style={S.emptyWrap}>
            <div style={S.emptyIcon}>🔒</div>
            <div style={S.emptyTitle}>نیاز به ورود</div>
            <div style={S.emptyDesc}>
              برای مشاهده تاریخچه پرداخت، ابتدا باید وارد حساب کاربری خود شوید.
            </div>
            <Link
              href="/app"
              style={{
                display: 'inline-block',
                marginTop: 24,
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              ← بازگشت به پنل
            </Link>
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
                marginTop: 20,
                padding: '10px 24px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'Vazirmatn, sans-serif',
              }}
              onClick={fetchPayments}
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {/* Empty state */}
        {!error && getToken() && payments.length === 0 && (
          <div style={S.emptyWrap}>
            <div style={S.emptyIcon}>📄</div>
            <div style={S.emptyTitle}>پرداختی نداشتهاید</div>
            <div style={S.emptyDesc}>
              وقتی پرداختی انجام دهید، تاریخچه آن در اینجا نمایش داده خواهد شد.
            </div>
            <Link
              href="/app"
              style={{
                display: 'inline-block',
                marginTop: 24,
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              ← بازگشت به پنل
            </Link>
          </div>
        )}

        {/* Desktop Table */}
        {!error && getToken() && payments.length > 0 && (
          <>
            <div className="payments-desktop" style={S.card}>
              <div style={S.tableHeader}>
                <span>مبلغ</span>
                <span>وضعیت</span>
                <span>مرجع</span>
                <span>تاریخ</span>
              </div>
              {payments.map((p) => {
                const sc = statusConfig(p.status);
                return (
                  <div
                    key={p.id}
                    style={S.row}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--panel-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <div style={S.amount}>
                      {toPersianNum(p.amount)}{' '}
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>ریال</span>
                    </div>
                    <div>
                      <span
                        style={{
                          ...S.statusBadge,
                          color: sc.color,
                          background: sc.bg,
                        }}
                      >
                        <span style={{ ...S.statusDot, background: sc.color }} />
                        {sc.label}
                      </span>
                    </div>
                    <div style={S.refText} title={p.gateway_ref}>
                      {p.gateway_ref || '---'}
                    </div>
                    <div style={S.dateText}>{formatDate(p.created_at)}</div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Cards */}
            <div className="payments-mobile" style={S.card}>
              {payments.map((p) => (
                <MobilePaymentCard key={p.id} payment={p} />
              ))}
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .payments-mobile { display: none; }

        @media (max-width: 640px) {
          .payments-desktop { display: none !important; }
          .payments-mobile { display: block !important; }
        }
      `}</style>
    </div>
  );
}
