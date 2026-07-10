'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchBrakeStatus,
  toggleKillSwitch,
  runMarginCheck,
  BrakeStatus,
} from '../../../lib/admin-api';
import { MetricCard } from '../components/MetricCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { AdminToast } from '../components/AdminToast';

function ir(v: number) {
  return v.toLocaleString('fa-IR');
}

export default function BrakesPage() {
  const [status, setStatus] = useState<BrakeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [marginResult, setMarginResult] = useState<string[] | null>(null);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    enable: boolean;
    label: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchBrakeStatus());
    } catch {
      setToastOk(false);
      setToast('خطا در بارگذاری وضعیت ترمزها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function promptKillSwitch(enable: boolean) {
    setConfirmAction({
      enable,
      label: enable ? 'فعال‌سازی' : 'غیرفعال‌سازی',
    });
    setConfirmOpen(true);
  }

  async function handleConfirmKillSwitch() {
    if (!confirmAction) return;
    setToggling(true);
    setConfirmOpen(false);
    try {
      await toggleKillSwitch(confirmAction.enable);
      setToastOk(true);
      setToast(
        confirmAction.enable
          ? 'کیل سوئیچ فعال شد 🔴'
          : 'کیل سوئیچ غیرفعال شد 🟢'
      );
      load();
    } catch {
      setToastOk(false);
      setToast('خطا در تغییر کیل سوئیچ');
    } finally {
      setToggling(false);
      setConfirmAction(null);
    }
  }

  async function handleMarginCheck() {
    setChecking(true);
    setMarginResult(null);
    try {
      const d = await runMarginCheck();
      setMarginResult(d.disabled_models || []);
      setToastOk(true);
      setToast(
        d.disabled_models?.length
          ? `${d.disabled_models.length} مدل غیرفعال شد`
          : 'همه مدل‌ها در وضعیت عادی هستند'
      );
    } catch {
      setToastOk(false);
      setToast('خطا در بررسی مارجین');
    } finally {
      setChecking(false);
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

  const ksEnabled = (status?.kill_switch as any)?.enabled;
  const breakerTripped = !!(status?.fx_circuit_breaker as any)?.tripped_at;

  return (
    <>
      <h2 className="admin-page-title">ترمزها</h2>

      <div className="admin-card-row">
        <MetricCard
          icon="🛑"
          title="کیل سوئیچ"
          value={ksEnabled ? 'فعال 🔴' : 'غیرفعال 🟢'}
          accent={ksEnabled ? 'var(--danger)' : 'var(--ok)'}
        />
        <MetricCard
          icon="⚡"
          title="بریکر FX"
          value={breakerTripped ? 'فعالشده ⚠️' : 'عادی ✅'}
          accent={breakerTripped ? 'var(--danger)' : 'var(--ok)'}
        />
        <MetricCard
          icon="💸"
          title="هزینه امروز ($)"
          value={`$${(status?.today_cost_usd || 0).toFixed(2)}`}
          accent="var(--accent-2)"
        />
        <MetricCard
          icon="💰"
          title="درآمد امروز (ریال)"
          value={ir(status?.today_revenue_irr || 0)}
          accent="var(--accent)"
        />
      </div>

      <h3 className="admin-section-title">کنترل ترمزها</h3>
      <div className="admin-card-row">
        <div className="admin-control-card">
          <div className="admin-control-icon">🛑</div>
          <div className="admin-control-title">کیل سوئیچ سراسری</div>
          <div className="admin-control-desc">
            غیرفعال‌سازی کل سرویس برای کاربران عادی
          </div>
          <div className="admin-control-actions">
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => promptKillSwitch(true)}
              disabled={toggling || ksEnabled}
            >
              فعال‌سازی
            </button>
            <button
              className="admin-btn admin-btn-success"
              onClick={() => promptKillSwitch(false)}
              disabled={toggling || !ksEnabled}
            >
              غیرفعال‌سازی
            </button>
          </div>
        </div>

        <div className="admin-control-card">
          <div className="admin-control-icon">📊</div>
          <div className="admin-control-title">بررسی مارجین مدل‌ها</div>
          <div className="admin-control-desc">
            غیرفعال‌سازی خودکار مدل‌های زیانده
          </div>
          <button
            className="admin-btn"
            onClick={handleMarginCheck}
            disabled={checking}
          >
            {checking ? 'در حال بررسی...' : 'بررسی مارجین'}
          </button>
          {marginResult && (
            <div
              className="admin-margin-result"
              style={{
                color: marginResult.length ? 'var(--danger)' : 'var(--ok)',
              }}
            >
              {marginResult.length
                ? `مدل‌های غیرفعال‌شده: ${marginResult.join(', ')}`
                : '✅ همه مدل‌ها سالم هستند'}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="تغییر کیل سوئیچ"
        message={
          confirmAction
            ? `آیا از ${confirmAction.label} کیل سوئیچ اطمینان دارید؟ این عملیات کل سرویس را تحت تأثیر قرار می‌دهد.`
            : ''
        }
        confirmLabel="تأیید"
        danger
        onConfirm={handleConfirmKillSwitch}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
      />

      <AdminToast msg={toast} ok={toastOk} onClose={() => setToast('')} />
    </>
  );
}