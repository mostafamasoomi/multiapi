'use client';
import { useEffect, useState } from 'react';
import { fetchHealth, fetchPnl, PnlRow } from '../../lib/admin-api';
import { MetricCard } from './components/MetricCard';
import DataTable from './components/DataTable';
import { AdminToast } from './components/AdminToast';
import type { Column } from './components/DataTable';

function ir(v: number) {
  return v.toLocaleString('fa-IR');
}

function shortDate(s: string) {
  return s.slice(0, 10);
}

export default function OverviewPage() {
  const [health, setHealth] = useState<any>(null);
  const [pnl, setPnl] = useState<PnlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [h, p] = await Promise.all([fetchHealth(), fetchPnl()]);
        setHealth(h);
        setPnl(p);
      } catch {
        setToast('خطا در بارگذاری اطلاعات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = pnl[0];

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

  const pnlColumns: Column<PnlRow>[] = [
    {
      key: 'day',
      title: 'تاریخ',
      render: (p) => shortDate(p.day),
    },
    {
      key: 'revenue_irr',
      title: 'درآمد (ریال)',
      render: (p) => ir(p.revenue_irr),
    },
    {
      key: 'upstream_cost_usd',
      title: 'هزینه ($)',
      render: (p) => `$${p.upstream_cost_usd.toFixed(2)}`,
    },
    {
      key: 'gross_margin_pct',
      title: 'حاشیه %',
      render: (p) => {
        if (p.gross_margin_pct == null) return <span className="text-muted">---</span>;
        const color = p.gross_margin_pct > 0 ? 'var(--ok)' : 'var(--danger)';
        return <span style={{ color }}>%{p.gross_margin_pct.toFixed(1)}</span>;
      },
    },
  ];

  return (
    <>
      <h2 className="admin-page-title">نمای کلی</h2>

      <div className="admin-card-row">
        <MetricCard
          icon="🟢"
          title="وضعیت سرور"
          value={health?.status || '---'}
          accent="var(--ok)"
        />
        <MetricCard
          icon="💰"
          title="درآمد امروز (ریال)"
          value={today ? ir(today.revenue_irr) : '۰'}
          accent="var(--accent)"
        />
        <MetricCard
          icon="💸"
          title="هزینه Upstream ($)"
          value={today ? `$${today.upstream_cost_usd.toFixed(2)}` : '$0'}
          accent="var(--accent-2)"
        />
        <MetricCard
          icon="📈"
          title="حاشیه سود (%)"
          value={
            today?.gross_margin_pct != null ? `%${today.gross_margin_pct.toFixed(1)}` : '---'
          }
          accent={
            today?.gross_margin_pct != null && today.gross_margin_pct > 0
              ? 'var(--ok)'
              : 'var(--danger)'
          }
        />
      </div>

      <h3 className="admin-section-title">سوابق P&L (۳۰ روز اخیر)</h3>
      <DataTable
        columns={pnlColumns}
        data={pnl as any}
        rowKey="day"
        loading={false}
        emptyMessage="داده‌ای موجود نیست"
      />

      <AdminToast msg={toast} ok={false} onClose={() => setToast('')} />
    </>
  );
}