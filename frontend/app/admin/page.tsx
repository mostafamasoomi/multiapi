'use client';
import { useCallback, useEffect, useState } from 'react';

// Types
type Model = { alias: string; tier: string; active: boolean; auto_disabled: boolean; up_in: number; up_out: number; in_margin: number; out_margin: number; max_tokens_cap: number; free_tier_eligible: boolean };
type User = { id: number; email: string; username: string; telegram_id: string; status: string; plan_id: number | null; balance_irr: number; daily_spend_used_irr: number; daily_spend_cap_irr: number; created_at: string | null };
type LedgerEntry = { id: number; txn_type: string; amount_irr: number; balance_after_irr: number; note: string; created_at: string | null };
type PnlRow = { day: string; revenue_irr: number; upstream_cost_usd: number; gross_margin_pct: number | null };
type FxRateRow = { rate_date: string; usd_to_irr: number; fx_buffer: number; effective_rate: number; source: string | null };
type BrakeStatus = { kill_switch: Record<string, unknown>; fx_circuit_breaker: Record<string, unknown>; today_cost_usd: number; today_revenue_irr: number };
type Tab = 'overview' | 'models' | 'users' | 'fx' | 'brakes';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'نمای کلی', icon: '📊' },
  { key: 'models', label: 'مدلها', icon: '🤖' },
  { key: 'users', label: 'کاربران', icon: '👥' },
  { key: 'fx', label: 'نرخ ارز', icon: '💱' },
  { key: 'brakes', label: 'ترمزها', icon: '🛑' },
];

// Helpers
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }
function af(path: string, init?: RequestInit) {
  return fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...init?.headers } });
}
function ir(v: number) { return v.toLocaleString('fa-IR'); }
function shortDate(s: string) { return s.slice(0, 10); }

// Toast
function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { if (!msg) return; const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [msg, onClose]);
  const base: React.CSSProperties = {
    position: 'fixed', top: 16, left: '50%', padding: '10px 18px', borderRadius: 12, fontSize: 13.5,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', gap: 8, maxWidth: '90vw',
    transition: 'transform .35s cubic-bezier(.2,.9,.3,1.2)',
  };
  return (
    <div style={{ ...base, transform: msg ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-80px)',
      background: ok ? 'rgba(16,40,22,0.95)' : 'rgba(40,16,22,0.95)',
      border: `1px solid ${ok ? 'rgba(74,222,128,0.4)' : 'rgba(255,107,138,0.4)'}`,
      color: ok ? '#b4f5c8' : '#ffc2cf' }}>
      {ok ? '✅' : '⚠️'} {msg}
    </div>
  );
}

// Login
function AdminLogin({ onLogin }: { onLogin: (t: string) => void }) {
  const [token, setToken] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr('');
    try {
      const r = await fetch('/health');
      if (!r.ok) throw new Error('سرور در دسترس نیست');
      localStorage.setItem('admin_token', token.trim());
      onLogin(token.trim());
    } catch (e: any) { setErr(e.message || 'خطا'); } finally { setLoading(false); }
  }
  return (
    <div className="auth-panel">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">🛡️</div>
        <h2>پنل مدیریت</h2>
        <p className="auth-subtitle">توکن ادمین را وارد کنید</p>
        {err && <div className="auth-error">{err}</div>}
        <div className="form-group">
          <label>توکن ادمین</label>
          <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="ADMIN_TOKEN" autoFocus />
        </div>
        <button className="auth-btn" type="submit" disabled={loading || !token.trim()}>
          {loading ? '...' : 'ورود'}
        </button>
      </form>
    </div>
  );
}

// StatCard
function StatCard({ icon, title, value, accent }: { icon: string; title: string; value: string; accent: string }) {
  return (
    <div style={{ ...S.card, borderColor: `${accent}22` }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ token }: { token: string }) {
  const [health, setHealth] = useState<any>(null);
  const [pnl, setPnl] = useState<PnlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const [hr, pr] = await Promise.all([fetch('/health'), af('/admin/pnl')]);
        if (hr.ok) setHealth(await hr.json());
        if (pr.ok) setPnl(await pr.json());
      } catch { setToast('خطا در بارگذاری اطلاعات'); } finally { setLoading(false); }
    })();
  }, [token]);
  const today = pnl[0];
  if (loading) return <div style={S.center}><div className="typing"><span /><span /><span /></div></div>;
  return (<>
    <div style={S.cardRow}>
      <StatCard icon="🟢" title="وضعیت سرور" value={health?.status || '---'} accent="var(--ok)" />
      <StatCard icon="💰" title="درآمد امروز (ریال)" value={today ? ir(today.revenue_irr) : '۰'} accent="var(--accent)" />
      <StatCard icon="💸" title="هزینه Upstream ($)" value={today ? `$${today.upstream_cost_usd.toFixed(2)}` : '$0'} accent="var(--accent-2)" />
      <StatCard icon="📈" title="حاشیه سود (%)" value={today?.gross_margin_pct != null ? `%${today.gross_margin_pct.toFixed(1)}` : '---'} accent={today?.gross_margin_pct != null && today.gross_margin_pct > 0 ? 'var(--ok)' : 'var(--danger)'} />
    </div>
    <h3 style={S.sectionTitle}>سوابق P&L (۳۰ روز اخیر)</h3>
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr><th style={S.th}>تاریخ</th><th style={S.th}>درآمد (ریال)</th><th style={S.th}>هزینه ($)</th><th style={S.th}>حاشیه %</th></tr></thead>
        <tbody>
          {pnl.map(p => (
            <tr key={p.day} style={S.tr}>
              <td style={S.td}>{shortDate(p.day)}</td>
              <td style={S.td}>{ir(p.revenue_irr)}</td>
              <td style={S.td}>${p.upstream_cost_usd.toFixed(2)}</td>
              <td style={{ ...S.td, color: p.gross_margin_pct != null && p.gross_margin_pct > 0 ? 'var(--ok)' : 'var(--danger)' }}>
                {p.gross_margin_pct != null ? `%${p.gross_margin_pct.toFixed(1)}` : '---'}
              </td>
            </tr>
          ))}
          {!pnl.length && <tr><td colSpan={4} style={{ ...S.td, textAlign: 'center', color: 'var(--muted)' }}>داده‌ای موجود نیست</td></tr>}
        </tbody>
      </table>
    </div>
    <Toast msg={toast} ok={false} onClose={() => setToast('')} />
  </>);
}

// Models Tab
function ModelsTab({ token }: { token: string }) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [mIn, setMIn] = useState('');
  const [mOut, setMOut] = useState('');
  const load = useCallback(async () => {
    try { const r = await af('/admin/models'); if (!r.ok) throw new Error('خطا'); setModels(await r.json()); }
    catch { setToastOk(false); setToast('خطا در بارگذاری مدل‌ها'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function toggle(alias: string) {
    try {
      const r = await af(`/admin/models/${alias}/toggle`, { method: 'POST' });
      if (!r.ok) throw new Error('خطا');
      const d = await r.json();
      setModels(prev => prev.map(m => m.alias === alias ? { ...m, active: d.active, auto_disabled: false } : m));
      setToastOk(true); setToast(`مدل ${alias} ${d.active ? 'فعال' : 'غیرفعال'} شد`);
    } catch { setToastOk(false); setToast('خطا در تغییر وضعیت مدل'); }
  }
  async function saveMargin(alias: string) {
    try {
      const r = await af('/admin/models/margin', { method: 'POST', body: JSON.stringify({ alias, input_margin_factor: parseFloat(mIn), output_margin_factor: parseFloat(mOut) }) });
      if (!r.ok) throw new Error('خطا');
      setEditing(null); setToastOk(true); setToast(`مارجین ${alias} به‌روزرسانی شد`); load();
    } catch { setToastOk(false); setToast('خطا در به‌روزرسانی مارجین'); }
  }
  if (loading) return <div style={S.center}><div className="typing"><span /><span /><span /></div></div>;
  return (<>
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr>
          <th style={S.th}>مدل</th><th style={S.th}>تییر</th><th style={S.th}>ورودی ($/1M)</th><th style={S.th}>خروجی ($/1M)</th>
          <th style={S.th}>مارجین ورودی</th><th style={S.th}>مارجین خروجی</th><th style={S.th}>وضعیت</th><th style={S.th}>عملیات</th>
        </tr></thead>
        <tbody>
          {models.map(m => (
            <tr key={m.alias} style={S.tr}>
              <td style={{ ...S.td, fontWeight: 700 }}>{m.alias}</td>
              <td style={S.td}><span className={`tier-badge ${m.tier}`}>{m.tier}</span></td>
              <td style={S.td}>${m.up_in.toFixed(2)}</td>
              <td style={S.td}>${m.up_out.toFixed(2)}</td>
              {editing === m.alias ? (
                <><td style={S.td}><input style={S.inlineInput} value={mIn} onChange={e => setMIn(e.target.value)} /></td>
                <td style={S.td}><input style={S.inlineInput} value={mOut} onChange={e => setMOut(e.target.value)} /></td></>
              ) : (<><td style={S.td}>{m.in_margin}x</td><td style={S.td}>{m.out_margin}x</td></>)}
              <td style={S.td}>
                <span style={{ color: m.active && !m.auto_disabled ? 'var(--ok)' : 'var(--danger)' }}>
                  {m.active && !m.auto_disabled ? '✅ فعال' : '❌ غیرفعال'}
                </span>
              </td>
              <td style={{ ...S.td, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button style={S.btnSm} onClick={() => toggle(m.alias)}>{m.active ? 'غیرفعال' : 'فعال'}</button>
                {editing === m.alias ? (<>
                  <button style={{ ...S.btnSm, background: 'var(--accent)' }} onClick={() => saveMargin(m.alias)}>ذخیره</button>
                  <button style={{ ...S.btnSm, background: 'var(--muted)' }} onClick={() => setEditing(null)}>لغو</button>
                </>) : (
                  <button style={S.btnSm} onClick={() => { setEditing(m.alias); setMIn(String(m.in_margin)); setMOut(String(m.out_margin)); }}>مارجین</button>
                )}
              </td>
            </tr>
          ))}
          {!models.length && <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: 'var(--muted)' }}>مدلی یافت نشد</td></tr>}
        </tbody>
      </table>
    </div>
    <Toast msg={toast} ok={toastOk} onClose={() => setToast('')} />
  </>);
}

// Users Tab
function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const [topupId, setTopupId] = useState<number | null>(null);
  const [topupAmt, setTopupAmt] = useState('');
  const [ledgerUser, setLedgerUser] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const load = useCallback(async () => {
    try { const r = await af('/admin/users'); if (!r.ok) throw new Error('خطا'); setUsers(await r.json()); }
    catch { setToastOk(false); setToast('خطا در بارگذاری کاربران'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function doTopup(userId: number) {
    try {
      const r = await af('/admin/users/topup', { method: 'POST', body: JSON.stringify({ user_id: userId, amount_irr: parseInt(topupAmt), note: 'admin topup' }) });
      if (!r.ok) throw new Error('خطا');
      const d = await r.json(); setTopupId(null); setTopupAmt('');
      setToastOk(true); setToast(`شارژ موفق — موجودی جدید: ${ir(d.new_balance_irr)} ریال`); load();
    } catch { setToastOk(false); setToast('خطا در شارژ کاربر'); }
  }
  async function viewLedger(userId: number) {
    setLedgerUser(userId); setLedgerLoading(true);
    try { const r = await af(`/admin/users/${userId}/ledger`); if (!r.ok) throw new Error('خطا'); setLedger(await r.json()); }
    catch { setToastOk(false); setToast('خطا در بارگذاری تراکنش‌ها'); } finally { setLedgerLoading(false); }
  }
  async function updateStatus(userId: number, status: string) {
    try {
      const r = await af('/admin/users/update', { method: 'POST', body: JSON.stringify({ user_id: userId, status }) });
      if (!r.ok) throw new Error('خطا');
      setToastOk(true); setToast(`وضعیت کاربر ${userId} به «${status}» تغییر کرد`); load();
    } catch { setToastOk(false); setToast('خطا در تغییر وضعیت'); }
  }
  if (loading) return <div style={S.center}><div className="typing"><span /><span /><span /></div></div>;
  return (<>
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr><th style={S.th}>ID</th><th style={S.th}>ایمیل / نام کاربری</th><th style={S.th}>موجودی (ریال)</th><th style={S.th}>وضعیت</th><th style={S.th}>عملیات</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={S.tr}>
              <td style={S.td}>{u.id}</td>
              <td style={S.td}>
                <div style={{ fontWeight: 600 }}>{u.username || '---'}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email || '---'}</div>
              </td>
              <td style={{ ...S.td, fontWeight: 700 }}>{ir(u.balance_irr)}</td>
              <td style={S.td}>
                <span style={{ color: u.status === 'active' ? 'var(--ok)' : 'var(--danger)', fontSize: 12, fontWeight: 600 }}>
                  {u.status === 'active' ? '✅ فعال' : u.status}
                </span>
              </td>
              <td style={{ ...S.td, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {topupId === u.id ? (
                  <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input style={S.inlineInput} value={topupAmt} onChange={e => setTopupAmt(e.target.value)} placeholder="مبلغ ریال" />
                    <button style={{ ...S.btnSm, background: 'var(--ok)' }} onClick={() => doTopup(u.id)} disabled={!topupAmt}>✓</button>
                    <button style={{ ...S.btnSm, background: 'var(--muted)' }} onClick={() => { setTopupId(null); setTopupAmt(''); }}>×</button>
                  </span>
                ) : <button style={S.btnSm} onClick={() => { setTopupId(u.id); setTopupAmt(''); }}>شارژ</button>}
                <button style={S.btnSm} onClick={() => viewLedger(u.id)}>دفترچه</button>
                <button style={{ ...S.btnSm, background: u.status === 'active' ? 'var(--danger)' : 'var(--ok)' }}
                  onClick={() => updateStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}>
                  {u.status === 'active' ? 'توقف' : 'فعال‌سازی'}
                </button>
              </td>
            </tr>
          ))}
          {!users.length && <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: 'var(--muted)' }}>کاربری یافت نشد</td></tr>}
        </tbody>
      </table>
    </div>
    {ledgerUser != null && (
      <div style={S.modalOverlay} onClick={() => setLedgerUser(null)}>
        <div style={S.modal} onClick={e => e.stopPropagation()}>
          <div style={S.modalHead}>
            <span>دفترچه تراکنش‌های کاربر #{ledgerUser}</span>
            <button style={S.closeBtn} onClick={() => setLedgerUser(null)}>✕</button>
          </div>
          {ledgerLoading ? <div style={{ padding: 24, textAlign: 'center' }}><div className="typing"><span /><span /><span /></div></div> : (
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              <table style={S.table}>
                <thead><tr><th style={S.th}>نوع</th><th style={S.th}>مبلغ</th><th style={S.th}>مانده</th><th style={S.th}>توضیح</th><th style={S.th}>تاریخ</th></tr></thead>
                <tbody>
                  {ledger.map(l => (
                    <tr key={l.id} style={S.tr}>
                      <td style={S.td}>{l.txn_type}</td>
                      <td style={{ ...S.td, color: l.amount_irr > 0 ? 'var(--ok)' : 'var(--danger)' }}>{l.amount_irr > 0 ? '+' : ''}{ir(l.amount_irr)}</td>
                      <td style={S.td}>{ir(l.balance_after_irr)}</td>
                      <td style={{ ...S.td, fontSize: 11, color: 'var(--muted)' }}>{l.note || '---'}</td>
                      <td style={{ ...S.td, fontSize: 11 }}>{l.created_at ? shortDate(l.created_at) : '---'}</td>
                    </tr>
                  ))}
                  {!ledger.length && <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: 'var(--muted)' }}>تراکنشی موجود نیست</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}
    <Toast msg={toast} ok={toastOk} onClose={() => setToast('')} />
  </>);
}

// FX Tab
function FxTab({ token }: { token: string }) {
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
      const [cr, hr] = await Promise.all([af('/admin/fx'), af('/admin/fx/history')]);
      if (cr.ok) setCurrent(await cr.json());
      if (hr.ok) setHistory(await hr.json());
    } catch { setToastOk(false); setToast('خطا در بارگذاری نرخ ارز'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function setRate() {
    setSaving(true);
    try {
      const r = await af('/admin/fx', { method: 'POST', body: JSON.stringify({ usd_to_irr: parseFloat(newRate), fx_buffer: parseFloat(newBuffer), source: 'admin-dashboard' }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.detail?.message || d.detail || 'خطا'); }
      setToastOk(true); setToast('نرخ ارز با موفقیت به‌روزرسانی شد'); setNewRate(''); load();
    } catch (e: any) { setToastOk(false); setToast(e.message || 'خطا در به‌روزرسانی نرخ ارز'); } finally { setSaving(false); }
  }
  if (loading) return <div style={S.center}><div className="typing"><span /><span /><span /></div></div>;
  return (<>
    {current && <div style={S.cardRow}>
      <StatCard icon="📅" title="تاریخ" value={shortDate(current.rate_date)} accent="var(--accent)" />
      <StatCard icon="💵" title="نرخ (دلار/ریال)" value={ir(current.usd_to_irr)} accent="var(--accent-2)" />
      <StatCard icon="📐" title="بافر" value={`${current.fx_buffer}x`} accent="var(--accent)" />
      <StatCard icon="⚡" title="نرخ مؤثر" value={ir(current.effective_rate)} accent="var(--ok)" />
    </div>}
    <h3 style={S.sectionTitle}>ثبت نرخ جدید</h3>
    <div style={S.cardRow}>
      <div style={S.formRow}>
        <div className="form-group" style={{ flex: 1, margin: 0 }}>
          <label>نرخ دلار به ریال</label>
          <input style={S.input} value={newRate} onChange={e => setNewRate(e.target.value)} placeholder={current ? String(current.usd_to_irr) : 'مثلاً 620000'} />
        </div>
        <div className="form-group" style={{ flex: 1, margin: 0 }}>
          <label>بافر</label>
          <input style={S.input} value={newBuffer} onChange={e => setNewBuffer(e.target.value)} placeholder="1.12" />
        </div>
        <button style={{ ...S.btn, alignSelf: 'flex-end', opacity: saving || !newRate ? 0.5 : 1 }} onClick={setRate} disabled={saving || !newRate}>
          {saving ? '...' : 'ثبت نرخ'}
        </button>
      </div>
    </div>
    <h3 style={S.sectionTitle}>سابقه نرخ ارز</h3>
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr><th style={S.th}>تاریخ</th><th style={S.th}>نرخ</th><th style={S.th}>بافر</th><th style={S.th}>منبع</th></tr></thead>
        <tbody>
          {history.map(h => (
            <tr key={h.rate_date} style={S.tr}>
              <td style={S.td}>{shortDate(h.rate_date)}</td>
              <td style={S.td}>{ir(h.usd_to_irr)}</td>
              <td style={S.td}>{h.fx_buffer}x</td>
              <td style={{ ...S.td, color: 'var(--muted)' }}>{h.source || '---'}</td>
            </tr>
          ))}
          {!history.length && <tr><td colSpan={4} style={{ ...S.td, textAlign: 'center', color: 'var(--muted)' }}>داده‌ای موجود نیست</td></tr>}
        </tbody>
      </table>
    </div>
    <Toast msg={toast} ok={toastOk} onClose={() => setToast('')} />
  </>);
}

// Brakes Tab
function BrakesTab({ token }: { token: string }) {
  const [status, setStatus] = useState<BrakeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [marginResult, setMarginResult] = useState<string[] | null>(null);
  const load = useCallback(async () => {
    try { const r = await af('/admin/brakes/status'); if (!r.ok) throw new Error('خطا'); setStatus(await r.json()); }
    catch { setToastOk(false); setToast('خطا در بارگذاری وضعیت ترمزها'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function toggleKillSwitch(enable: boolean) {
    setToggling(true);
    try {
      const r = await af(`/admin/brakes/kill-switch?enable=${enable}`, { method: 'POST' });
      if (!r.ok) throw new Error('خطا');
      setToastOk(true); setToast(enable ? 'کیل سوئیچ فعال شد 🔴' : 'کیل سوئیچ غیرفعال شد 🟢'); load();
    } catch { setToastOk(false); setToast('خطا در تغییر کیل سوئیچ'); } finally { setToggling(false); }
  }
  async function marginCheck() {
    setChecking(true); setMarginResult(null);
    try {
      const r = await af('/admin/brakes/margin-check', { method: 'POST' });
      if (!r.ok) throw new Error('خطا');
      const d = await r.json(); setMarginResult(d.disabled_models || []);
      setToastOk(true); setToast(d.disabled_models?.length ? `${d.disabled_models.length} مدل غیرفعال شد` : 'همه مدل‌ها در وضعیت عادی هستند');
    } catch { setToastOk(false); setToast('خطا در بررسی مارجین'); } finally { setChecking(false); }
  }
  if (loading) return <div style={S.center}><div className="typing"><span /><span /><span /></div></div>;
  const ksEnabled = (status?.kill_switch as any)?.enabled;
  const breakerTripped = !!(status?.fx_circuit_breaker as any)?.tripped_at;
  return (<>
    <div style={S.cardRow}>
      <StatCard icon="🛑" title="کیل سوئیچ" value={ksEnabled ? 'فعال 🔴' : 'غیرفعال 🟢'} accent={ksEnabled ? 'var(--danger)' : 'var(--ok)'} />
      <StatCard icon="⚡" title="بریکر FX" value={breakerTripped ? 'فعال‌شده ⚠️' : 'عادی ✅'} accent={breakerTripped ? 'var(--danger)' : 'var(--ok)'} />
      <StatCard icon="💸" title="هزینه امروز ($)" value={`$${(status?.today_cost_usd || 0).toFixed(2)}`} accent="var(--accent-2)" />
      <StatCard icon="💰" title="درآمد امروز (ریال)" value={ir(status?.today_revenue_irr || 0)} accent="var(--accent)" />
    </div>
    <h3 style={S.sectionTitle}>کنترل ترمزها</h3>
    <div style={S.cardRow}>
      <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div style={{ fontSize: 36 }}>🛑</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>کیل سوئیچ سراسری</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>غیرفعال‌سازی کل سرویس برای کاربران عادی</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...S.btn, background: 'var(--danger)', opacity: toggling ? 0.5 : 1 }} onClick={() => toggleKillSwitch(true)} disabled={toggling || ksEnabled}>فعال‌سازی</button>
          <button style={{ ...S.btn, background: 'var(--ok)', opacity: toggling ? 0.5 : 1 }} onClick={() => toggleKillSwitch(false)} disabled={toggling || !ksEnabled}>غیرفعال‌سازی</button>
        </div>
      </div>
      <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div style={{ fontSize: 36 }}>📊</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>بررسی مارجین مدل‌ها</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>غیرفعال‌سازی خودکار مدل‌های زیان‌ده</div>
        <button style={{ ...S.btn, opacity: checking ? 0.5 : 1 }} onClick={marginCheck} disabled={checking}>
          {checking ? 'در حال بررسی...' : 'بررسی مارجین'}
        </button>
        {marginResult && (
          <div style={{ fontSize: 13, color: marginResult.length ? 'var(--danger)' : 'var(--ok)', textAlign: 'center' }}>
            {marginResult.length ? `مدل‌های غیرفعال‌شده: ${marginResult.join(', ')}` : '✅ همه مدل‌ها سالم هستند'}
          </div>
        )}
      </div>
    </div>
    <Toast msg={toast} ok={toastOk} onClose={() => setToast('')} />
  </>);
}

// Main Page
export default function AdminPage() {
  const [token, setToken] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  useEffect(() => { const t = getToken(); if (t) setToken(t); }, []);
  if (!token) return <AdminLogin onLogin={setToken} />;
  function logout() { localStorage.removeItem('admin_token'); setToken(''); }
  return (
    <div style={{ minHeight: '100vh', direction: 'rtl' }}>
      <div style={S.topbar}>
        <span style={{ fontSize: 22 }}>🛡️</span>
        <span style={S.brandName}>پنل مدیریت</span>
        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>مدیر</span>
          <button style={S.logoutBtn} onClick={logout} title="خروج">🚪</button>
        </div>
      </div>
      <div style={S.tabBar}>
        {TABS.map(t => (
          <button key={t.key} style={{
            ...S.tabBtn,
            background: tab === t.key ? 'var(--user-bubble)' : 'transparent',
            borderColor: tab === t.key ? 'rgba(124,92,255,0.4)' : 'transparent',
            color: tab === t.key ? 'var(--accent)' : 'var(--muted)',
          }} onClick={() => setTab(t.key)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
      <div style={S.content}>
        {tab === 'overview' && <OverviewTab token={token} />}
        {tab === 'models' && <ModelsTab token={token} />}
        {tab === 'users' && <UsersTab token={token} />}
        {tab === 'fx' && <FxTab token={token} />}
        {tab === 'brakes' && <BrakesTab token={token} />}
      </div>
    </div>
  );
}

// Styles (matching globals.css dark theme)
const S: Record<string, React.CSSProperties> = {
  topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 22px', borderBottom: '1px solid var(--border)', background: 'rgba(10,11,15,0.6)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 20 },
  brandName: { fontWeight: 800, fontSize: 18, background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' },
  logoutBtn: { width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 14 },
  tabBar: { display: 'flex', gap: 4, padding: '8px 22px', borderBottom: '1px solid var(--border)', overflowX: 'auto' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, transition: 'all .15s', whiteSpace: 'nowrap', background: 'transparent' },
  content: { padding: '20px 22px', maxWidth: 1100, margin: '0 auto', width: '100%' },
  cardRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 20 },
  card: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px', backdropFilter: 'blur(8px)', boxShadow: 'var(--shadow)', textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '6px 0 10px' },
  tableWrap: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 20, backdropFilter: 'blur(8px)', boxShadow: 'var(--shadow)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 14px', textAlign: 'right' as const, fontWeight: 700, background: 'rgba(124,92,255,0.08)', color: 'var(--accent-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const, fontSize: 12 },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '10px 14px', whiteSpace: 'nowrap' as const, fontSize: 13 },
  btnSm: { padding: '5px 12px', borderRadius: 8, border: 'none', background: 'rgba(124,92,255,0.18)', color: '#c4b5ff', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' },
  btn: { padding: '10px 22px', borderRadius: 12, border: 'none', background: 'var(--accent-grad)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(124,92,255,0.3)' },
  inlineInput: { width: 80, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' },
  input: { width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' },
  formRow: { display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' },
  center: { display: 'grid', placeItems: 'center', minHeight: 300 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 50, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--panel-solid)', border: '1px solid var(--border)', borderRadius: 16, width: '90%', maxWidth: 700, boxShadow: '0 12px 40px rgba(0,0,0,0.5)', overflow: 'hidden' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 },
  closeBtn: { width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)', fontSize: 14, display: 'grid', placeItems: 'center' },
};
