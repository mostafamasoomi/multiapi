'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ReferralCard } from '../../components/ReferralCard';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReferralStats {
  total_referrals: number;
  referral_code: string;
  referral_link: string;
  earnings: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('api_key') || '';
}

function irr(v: number): string {
  return v.toLocaleString('fa-IR');
}

// ── Loading Skeleton ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="referral-page">
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 180, marginBottom: 24, borderRadius: 'var(--radius-lg)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 120 }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
        <div className="skeleton" style={{ height: 100, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 100 }} />
      </div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        transition: 'var(--transition)',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ReferralPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchTrigger, setFetchTrigger] = useState(0);

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
      const res = await fetch('/api/referral/stats', {
        headers: { Authorization: `Bearer ${key}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('api_key');
          localStorage.removeItem('user_id');
          setError('نشست شما منقضی شده است. لطفاً دوباره وارد شوید');
          setLoading(false);
          return;
        }
        throw new Error('خطا در دریافت اطلاعات رفرال');
      }

      const data = await res.json();
      setStats(data);
    } catch (e: any) {
      setError(e.message || 'خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, fetchTrigger]);

  if (loading) return <Skeleton />;

  if (!getToken()) {
    return (
      <div className="referral-page">
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{
            textAlign: 'center',
            marginTop: 80,
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>نیاز به ورود</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: 400, margin: '0 auto' }}>
              برای مشاهده اطلاعات رفرال، ابتدا باید وارد حساب کاربری خود شوید.
            </p>
            <Link
              href="/app"
              style={{
                display: 'inline-block',
                marginTop: '24px',
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              ← بازگشت به چت
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="referral-page">
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ textAlign: 'center', marginTop: 80 }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>خطا</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{error}</p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
              <button
                onClick={() => setFetchTrigger(t => t + 1)}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Vazirmatn, sans-serif',
                }}
              >
                تلاش مجدد
              </button>
              <Link
                href="/app"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                ← بازگشت
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="referral-page">
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Back Link */}
        <Link
          href="/app"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '24px',
            transition: 'var(--transition)',
          }}
        >
          ← بازگشت به چت
        </Link>

        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.10) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px 32px',
            marginBottom: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative blobs */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              left: '-40px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 70%)',
              pointerEvents: 'none' as const,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-60px',
              right: '-30px',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08), transparent 70%)',
              pointerEvents: 'none' as const,
            }}
          />

          <div style={{ position: 'relative' as const, zIndex: 1 }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎁</div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', marginBottom: '12px' }}>
              دعوت دوستان
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: 500, lineHeight: 1.7 }}>
              لینک رفرال خود را با دوستان به اشتراک بگذارید. با هر ثبت‌نام موفق، پاداش دریافت کنید!
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <StatCard
            icon="👥"
            label="تعداد دعوت‌شدگان"
            value={stats ? irr(stats.total_referrals) : '---'}
            sub="نفر"
          />
          <StatCard
            icon="💰"
            label="درآمد رفرال"
            value={stats ? irr(stats.earnings) : '---'}
            sub="ریال"
          />
        </div>

        {/* Referral Code Card */}
        {stats && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px', marginBottom: '32px' }}>
            <ReferralCard
              label="کد رفرال شما"
              value={stats.referral_code}
              copyable
              icon="🏷️"
              accent="purple"
            />
            <ReferralCard
              label="لینک دعوت"
              value={stats.referral_link}
              copyable
              icon="🔗"
              accent="cyan"
            />
          </div>
        )}

        {/* How It Works */}
        <div
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '24px' }}>
            📖 نحوه کار
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '20px',
            }}
          >
            {[
              { icon: '📤', title: 'اشتراک‌گذاری', desc: 'لینک یا کد خود را برای دوستان بفرستید' },
              { icon: '📝', title: 'ثبت‌نام', desc: 'دوست شما با لینک شما ثبت‌نام کند' },
              { icon: '🎁', title: 'پاداش', desc: 'پاداش رفرال به حساب شما اضافه میشود' },
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center',
                  textAlign: 'center' as const,
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '36px' }}>{step.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{step.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
