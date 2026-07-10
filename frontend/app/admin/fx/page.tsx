'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchCurrentFx,
  fetchFxHistory,
  setFxRate,
  FxRateRow,
} from '../../../lib/admin-api';
import { MetricCard } from '../components/MetricCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { AdminToast } from '../components/AdminToast';

function ir(v: number) {
  return v.toLocaleString('fa-IR');
}

function shortDate(s: string) {
  return s.slice(0, 10);
}

export default function FxPage() {
  const [current, setCurrent] = useState<FxRateRow | null>(null);
  const [history, setHistory] = useState<FxRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const [newRate, setNewRate] = useState('');
  const [newBuffer, setNewBuffer] = useState('1.12');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([fetchCurrentFx(), fetchFxHistory()]);
      setCurrent(c);
      setHistory(h);
    } catch {
      setToastOk(false);
      setToast('خطا در بارگذاری نرخ ارز');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSetRate() {
    setSaving(true);
    try {
      await setFxRate(parseFloat(newRate), parseFloat(newBuffer));
      setToastOk(true);
      setToast('نرخ ارز با موفقیت به‌روزرسانی شد');
      setNewRate('');
      load();
    } catch (e: any) {
      setToastOk(false);
      setToast(e.message || 'خطا در به‌روزرسانی نرخ ارز');
    } finally {
      setSaving(false);
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

  const historyColumns: Column<FxRateRow>[] = [
    {
      key: 'rate_date',
      title: 'تاریخ',
      render: (h) => shortDate(h.rate_date),
    },
    {
      key: 'usd_to_irr',
      title: 'نرخ',
      render: (h) => ir(h.usd_to_irr),
    },
    {
      key: 'fx_buffer',
      title: 'بافر',
      render: (h) => `${h.fx_buffer}x`,
    },
    {
      key: 'source',
      title: 'منبع',
      render: (h) => <span className="text-muted">{h.source || '---'}</span>,
    },
  ];

  return (
    <>
      <h2 className="admin-page-title">نرخ ارز</h2>

      {current && (
        <div className="admin-card-row">
          <MetricCard
            icon="📅"
            title="تاریخ"
            value={shortDate(current.rate_date)}
            accent="var(--accent)"
          />
          <MetricCard
            icon="💵"
            title="نرخ (دلار/ریال)"
            value={ir(current.usd_to_irr)}
            accent="var(--accent-2)"
          />
          <MetricCard
            icon="📐"
            title="بافر"
            value={`${current.fx_buffer}x`}
            accent="var(--accent)"
          />
          <MetricCard
            icon="⚡"
            title="نرخ مؤثر"
            value={ir(current.effective_rate)}
            accent="var(--ok)"
          />
        </div>
      )}

      <h3 className="admin-section-title">ثبت نرخ جدید</h3>
      <div className="admin-form-row">
        <div className="form-group" style={{ flex: 1, margin: 0 }}>
          <label>نرخ دلار به ریال</label>
          <input
            className="admin-input"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            placeholder={current ? String(current.usd_to_irr) : 'مثلاً 620000'}
          />
        </div>
        <div className="form-group" style={{ flex: 1, margin: 0 }}>
          <label>بافر</label>
          <input
            className="admin-input"
            value={newBuffer}
            onChange={(e) => setNewBuffer(e.target.value)}
            placeholder="1.12"
          />
        </div>
        <button
          className="admin-btn"
          onClick={handleSetRate}
          disabled={saving || !newRate}
        >
          {saving ? '...' : 'ثبت نرخ'}
        </button>
      </div>

      <h3 className="admin-section-title">سابقه نرخ ارز</h3>
      <DataTable
        columns={historyColumns}
        data={history as any}
        rowKey="rate_date"
        loading={false}
      />

      <AdminToast msg={toast} ok={toastOk} onClose={() => setToast('')} />
    </>
  );
}