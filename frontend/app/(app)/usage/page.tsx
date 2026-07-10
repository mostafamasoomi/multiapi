'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MeResponse {
  user_id: number;
  email: string;
  username: string | null;
  status: string;
  plan_id: number | null;
  balance_irr: number;
  daily_spend_used_irr: number;
  daily_spend_cap_irr: number;
}

interface LedgerEntry {
  txn_type: string;
  amount_irr: number;
  balance_after_irr: number;
  created_at: string;
}

interface DayUsage {
  day: string;       // e.g. "۱۴ تیر"
  dayLabel: string;  // e.g. "پنجشنبه"
  spend_irr: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function irr(v: number): string {
  return v.toLocaleString('fa-IR');
}

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('api_key') || '';
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '---';
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function txnTypeLabel(t: string): string {
  const map: Record<string, string> = {
    topup: 'شارژ',
    hold: 'رزرو',
    release: 'آزادسازی',
    settle: 'تسویه',
    refund: 'بازگشت وجه',
    fee: 'کارمزد',
    adjustment: 'تنظیم',
  };
  return map[t] || t;
}

function txnTypeColor(t: string): string {
  const positive = ['topup', 'release', 'refund'];
  const negative = ['hold', 'settle', 'fee'];
  if (positive.includes(t)) return 'var(--ok)';
  if (negative.includes(t)) return 'var(--danger)';
  return 'var(--text-secondary)';
}

// ── Build last 7 days usage from ledger ────────────────────────────────────────

function buildDayUsage(ledger: LedgerEntry[]): DayUsage[] {
  const persianDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

  const now = new Date();
  const days: DayUsage[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' });
    const dayOfWeek = persianDays[(d.getDay() + 1) % 7]; // JS Sunday=0, Persian Saturday=0
    days.push({ day: dayStr, dayLabel: dayOfWeek, spend_irr: 0 });
  }

  // Sum settlements per day
  for (const entry of ledger) {
    if (entry.txn_type !== 'settle' || entry.amount_irr >= 0) continue;
    const d = new Date(entry.created_at);
    const key = d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' });
    const day = days.find(dd => dd.day === key);
    if (day) {
      day.spend_irr += Math.abs(entry.amount_irr);
    }
  }

  return days;
}

// ── Loading Skeleton ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="usage-page">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <div className="skeleton" style={{ width: 180, height: 28, marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div className="skeleton" style={{ height: 120 }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
        <div className="skeleton" style={{ height: 200, marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="empty-state">
      <div className="big">📊</div>
      <h2>هنوز تراکنشی ندارید</h2>
      <p>با شارژ حساب و استفاده از مدل‌ها، گزارش مصرف و تاریخچه تراکنش‌های شما در این صفحه نمایش داده می‌شود.</p>
      <div className="features">
        <div className="feature">
          <div className="icon">💰</div>
          <div className="label">شارژ حساب</div>
          <div className="desc">حساب خود را شارژ کنید</div>
        </div>
        <div className="feature">
          <div className="icon">📈</div>
          <div className="label">گزارش مصرف</div>
          <div className="desc">مصرف روزانه خود را ببینید</div>
        </div>
        <div className="feature">
          <div className="icon">📋</div>
          <div className="label">تاریخچه</div>
          <div className="desc">تراکنش‌های خود را مرور کنید</div>
        </div>
        <div className="feature">
          <div className="icon">🔄</div>
          <div className="label">بارگذاری مجدد</div>
          <div className="desc" style={{ cursor: 'pointer' }} onClick={onRetry}>برای بارگذاری کلیک کنید</div>
        </div>
      </div>
    </div>
  );
}

// ── Bar Chart (CSS only) ───────────────────────────────────────────────────────

function BarChart({ days }: { days: DayUsage[] }) {
  const maxSpend = Math.max(...days.map(d => d.spend_irr), 1);

  return (
    <div className="bar-chart">
      <h3 className="usage-section-title">📈 نمودار مصرف ۷ روز اخیر</h3>
      <div className="bar-chart-container">
        {days.map((d, i) => {
          const pct = (d.spend_irr / maxSpend) * 100;
          const isToday = i === days.length - 1;
          return (
            <div key={d.day} className="bar-column">
              <div className="bar-value">{d.spend_irr > 0 ? irr(d.spend_irr) : '---'}</div>
              <div className="bar-track">
                <div
                  className={`bar-fill ${isToday ? 'bar-fill-today' : ''}`}
                  style={{ height: `${Math.max(pct, d.spend_irr > 0 ? 4 : 0)}%` }}
                />
              </div>
              <div className="bar-label">{d.dayLabel}</div>
              <div className="bar-sublabel">{d.day}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const [apiKey, setApiKey] = useState('');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    setApiKey(getToken());
  }, []);

  const fetchData = useCallback(async () => {
    const key = getToken();
    if (!key) {
      setLoading(false);
      setError('لطفاً ابتدا وارد حساب کاربری خود شوید');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${key}` };
      const [meRes, ledgerRes] = await Promise.all([
        fetch('/api/me', { headers }),
        fetch('/api/wallet/me/ledger?limit=100', { headers }),
      ]);

      if (!meRes.ok) {
        if (meRes.status === 401) {
          localStorage.removeItem('api_key');
          localStorage.removeItem('user_id');
          setApiKey('');
          setError('نشست شما منقضی شده است. لطفاً دوباره وارد شوید');
          return;
        }
        throw new Error('خطا در دریافت اطلاعات حساب');
      }

      const meData = await meRes.json();
      setMe(meData);

      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        setLedger(ledgerData || []);
      }
    } catch (e: any) {
      setError(e.message || 'خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, fetchTrigger]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!apiKey) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [apiKey, fetchData]);

  if (loading) return <Skeleton />;

  if (!apiKey) {
    return (
      <div className="usage-page">
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="big">🔒</div>
          <h2>نیاز به ورود</h2>
          <p>برای مشاهده گزارش مصرف و تراکنش‌ها، ابتدا باید وارد حساب کاربری خود شوید.</p>
        </div>
      </div>
    );
  }

  if (error && !me) {
    return (
      <div className="usage-page">
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="big">⚠️</div>
          <h2>خطا</h2>
          <p>{error}</p>
          <button
            className="auth-btn"
            style={{ marginTop: 24, maxWidth: 200 }}
            onClick={() => { setFetchTrigger(t => t + 1); }}
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  const dayUsage = buildDayUsage(ledger);
  const hasTransactions = ledger.length > 0;
  const balance = me?.balance_irr ?? 0;
  const dailyUsed = me?.daily_spend_used_irr ?? 0;
  const dailyCap = me?.daily_spend_cap_irr ?? 0;
  const dailyPct = dailyCap > 0 ? Math.min(100, (dailyUsed / dailyCap) * 100) : 0;

  return (
    <div className="usage-page">
      <div className="usage-content">
        {/* Header */}
        <div className="usage-header">
          <div className="usage-header-left">
            <h1 className="usage-title">💰 مصرف و صورتحساب</h1>
            <p className="usage-subtitle">موجودی، مصرف روزانه و تاریخچه تراکنش‌های شما</p>
          </div>
          <button
            className="icon-btn"
            onClick={() => { setFetchTrigger(t => t + 1); }}
            title="بروزرسانی"
            style={{ fontSize: 18 }}
          >
            🔄
          </button>
        </div>

        {/* Cards Row */}
        <div className="usage-cards">
          {/* Balance Card */}
          <div className="usage-card balance-card">
            <div className="usage-card-icon">💎</div>
            <div className="usage-card-label">موجودی فعلی</div>
            <div className="usage-card-value">{irr(balance)}</div>
            <div className="usage-card-unit">ریال</div>
          </div>

          {/* Daily Spend Card */}
          <div className="usage-card daily-card">
            <div className="usage-card-icon">📊</div>
            <div className="usage-card-label">مصرف امروز</div>
            <div className="usage-card-value">{irr(dailyUsed)}</div>
            <div className="usage-card-unit">
              {dailyCap > 0 ? `از ${irr(dailyCap)} ریال` : 'بدون سقف'}
            </div>
            {dailyCap > 0 && (
              <div className="daily-progress">
                <div className="daily-progress-track">
                  <div
                    className={`daily-progress-fill ${dailyPct > 80 ? 'danger' : ''}`}
                    style={{ width: `${dailyPct}%` }}
                  />
                </div>
                <div className="daily-progress-pct">{Math.round(dailyPct)}٪</div>
              </div>
            )}
            {dailyPct > 80 && dailyCap > 0 && (
              <div className="daily-warning">⚠️ نزدیک به سقف مصرف روزانه</div>
            )}
          </div>
        </div>

        {/* Chart */}
        <BarChart days={dayUsage} />

        {/* Transactions Table */}
        <div className="usage-transactions">
          <h3 className="usage-section-title">📋 تراکنش‌های اخیر</h3>
          {!hasTransactions ? (
            <EmptyState onRetry={() => setFetchTrigger(t => t + 1)} />
          ) : (
            <div className="usage-table-wrap">
              <table className="usage-table">
                <thead>
                  <tr>
                    <th>تاریخ</th>
                    <th>ساعت</th>
                    <th>نوع</th>
                    <th>مبلغ (ریال)</th>
                    <th>مانده</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.slice(0, 50).map((entry, i) => (
                    <tr key={i}>
                      <td>{formatDate(entry.created_at)}</td>
                      <td className="time-cell">{formatTime(entry.created_at)}</td>
                      <td>
                        <span
                          className="txn-type-badge"
                          style={{ color: txnTypeColor(entry.txn_type) }}
                        >
                          {txnTypeLabel(entry.txn_type)}
                        </span>
                      </td>
                      <td
                        style={{
                          fontWeight: 600,
                          color: entry.amount_irr > 0 ? 'var(--ok)' : 'var(--danger)',
                          direction: 'ltr',
                          textAlign: 'right' as const,
                        }}
                      >
                        {entry.amount_irr > 0 ? '+' : ''}{irr(entry.amount_irr)}
                      </td>
                      <td style={{ direction: 'ltr', textAlign: 'right' as const, color: 'var(--text-secondary)' }}>
                        {irr(entry.balance_after_irr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}