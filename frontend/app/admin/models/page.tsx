'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchModels, toggleModel, updateModelMargin, Model } from '../../../lib/admin-api';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { AdminToast } from '../components/AdminToast';

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [mIn, setMIn] = useState('');
  const [mOut, setMOut] = useState('');

  const load = useCallback(async () => {
    try {
      setModels(await fetchModels());
    } catch {
      setToastOk(false);
      setToast('خطا در بارگذاری مدلها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(alias: string) {
    try {
      const d = await toggleModel(alias);
      setModels((prev) =>
        prev.map((m) =>
          m.alias === alias ? { ...m, active: d.active, auto_disabled: false } : m
        )
      );
      setToastOk(true);
      setToast(`مدل ${alias} ${d.active ? 'فعال' : 'غیرفعال'} شد`);
    } catch {
      setToastOk(false);
      setToast('خطا در تغییر وضعیت مدل');
    }
  }

  async function handleSaveMargin(alias: string) {
    try {
      await updateModelMargin(alias, parseFloat(mIn), parseFloat(mOut));
      setEditing(null);
      setToastOk(true);
      setToast(`مارجین ${alias} به‌روزرسانی شد`);
      load();
    } catch {
      setToastOk(false);
      setToast('خطا در به‌روزرسانی مارجین');
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

  const columns: Column<Model>[] = [
    {
      key: 'alias',
      title: 'مدل',
      render: (m) => <span className="font-bold">{m.alias}</span>,
    },
    {
      key: 'tier',
      title: 'تییر',
      render: (m) => <span className={`tier-badge ${m.tier}`}>{m.tier}</span>,
    },
    {
      key: 'up_in',
      title: 'ورودی ($/1M)',
      render: (m) => `$${m.up_in.toFixed(2)}`,
    },
    {
      key: 'up_out',
      title: 'خروجی ($/1M)',
      render: (m) => `$${m.up_out.toFixed(2)}`,
    },
    {
      key: 'in_margin',
      title: 'مارجین ورودی',
      render: (m) =>
        editing === m.alias ? (
          <input
            className="admin-inline-input"
            value={mIn}
            onChange={(e) => setMIn(e.target.value)}
          />
        ) : (
          `${m.in_margin}x`
        ),
    },
    {
      key: 'out_margin',
      title: 'مارجین خروجی',
      render: (m) =>
        editing === m.alias ? (
          <input
            className="admin-inline-input"
            value={mOut}
            onChange={(e) => setMOut(e.target.value)}
          />
        ) : (
          `${m.out_margin}x`
        ),
    },
    {
      key: 'active',
      title: 'وضعیت',
      render: (m) => (
        <span
          style={{
            color: m.active && !m.auto_disabled ? 'var(--ok)' : 'var(--danger)',
          }}
        >
          {m.active && !m.auto_disabled ? '✅ فعال' : '❌ غیرفعال'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'عملیات',
      render: (m) => (
        <div className="admin-actions">
          <button className="admin-btn-sm" onClick={() => handleToggle(m.alias)}>
            {m.active ? 'غیرفعال' : 'فعال'}
          </button>
          {editing === m.alias ? (
            <>
              <button
                className="admin-btn-sm admin-btn-primary"
                onClick={() => handleSaveMargin(m.alias)}
              >
                ذخیره
              </button>
              <button
                className="admin-btn-sm admin-btn-cancel"
                onClick={() => setEditing(null)}
              >
                لغو
              </button>
            </>
          ) : (
            <button
              className="admin-btn-sm"
              onClick={() => {
                setEditing(m.alias);
                setMIn(String(m.in_margin));
                setMOut(String(m.out_margin));
              }}
            >
              مارجین
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <h2 className="admin-page-title">مدل‌ها</h2>
      <DataTable
        columns={columns}
        data={models as any}
        rowKey="alias"
        loading={false}
        emptyMessage="مدلی یافت نشد"
      />
      <AdminToast msg={toast} ok={toastOk} onClose={() => setToast('')} />
    </>
  );
}