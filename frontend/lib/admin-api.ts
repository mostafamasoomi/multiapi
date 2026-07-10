// Admin API helpers
const ADMIN_TOKEN_KEY = 'admin_token';

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

async function af(path: string, init?: RequestInit): Promise<Response> {
  const token = getAdminToken();
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

export type Model = {
  alias: string;
  tier: string;
  active: boolean;
  auto_disabled: boolean;
  up_in: number;
  up_out: number;
  in_margin: number;
  out_margin: number;
  max_tokens_cap: number;
  free_tier_eligible: boolean;
};

export type User = {
  id: number;
  email: string;
  username: string;
  telegram_id: string;
  status: string;
  plan_id: number | null;
  balance_irr: number;
  daily_spend_used_irr: number;
  daily_spend_cap_irr: number;
  created_at: string | null;
};

export type LedgerEntry = {
  id: number;
  txn_type: string;
  amount_irr: number;
  balance_after_irr: number;
  note: string;
  created_at: string | null;
};

export type PnlRow = {
  day: string;
  revenue_irr: number;
  upstream_cost_usd: number;
  gross_margin_pct: number | null;
};

export type FxRateRow = {
  rate_date: string;
  usd_to_irr: number;
  fx_buffer: number;
  effective_rate: number;
  source: string | null;
};

export type BrakeStatus = {
  kill_switch: Record<string, unknown>;
  fx_circuit_breaker: Record<string, unknown>;
  today_cost_usd: number;
  today_revenue_irr: number;
};

// ── API Functions ────────────────────────────────────────────────────────────

// Overview
export async function fetchHealth(): Promise<unknown> {
  const r = await fetch('/health');
  if (!r.ok) throw new Error('سرور در دسترس نیست');
  return r.json();
}

export async function fetchPnl(): Promise<PnlRow[]> {
  const r = await af('/admin/pnl');
  if (!r.ok) throw new Error('خطا در بارگذاری P&L');
  return r.json();
}

// Models
export async function fetchModels(): Promise<Model[]> {
  const r = await af('/admin/models');
  if (!r.ok) throw new Error('خطا در بارگذاری مدلها');
  return r.json();
}

export async function toggleModel(alias: string): Promise<{ active: boolean }> {
  const r = await af(`/admin/models/${alias}/toggle`, { method: 'POST' });
  if (!r.ok) throw new Error('خطا در تغییر وضعیت مدل');
  return r.json();
}

export async function updateModelMargin(
  alias: string,
  input_margin_factor: number,
  output_margin_factor: number
): Promise<unknown> {
  const r = await af('/admin/models/margin', {
    method: 'POST',
    body: JSON.stringify({ alias, input_margin_factor, output_margin_factor }),
  });
  if (!r.ok) throw new Error('خطا در بهروزرسانی مارجین');
  return r.json();
}

// Users
export async function fetchUsers(): Promise<User[]> {
  const r = await af('/admin/users');
  if (!r.ok) throw new Error('خطا در بارگذاری کاربران');
  return r.json();
}

export async function topupUser(userId: number, amountIrr: number): Promise<{ new_balance_irr: number }> {
  const r = await af('/admin/users/topup', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, amount_irr: amountIrr, note: 'admin topup' }),
  });
  if (!r.ok) throw new Error('خطا در شارژ کاربر');
  return r.json();
}

export async function fetchUserLedger(userId: number): Promise<LedgerEntry[]> {
  const r = await af(`/admin/users/${userId}/ledger`);
  if (!r.ok) throw new Error('خطا در بارگذاری تراکنشها');
  return r.json();
}

export async function updateUserStatus(userId: number, status: string): Promise<unknown> {
  const r = await af('/admin/users/update', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, status }),
  });
  if (!r.ok) throw new Error('خطا در تغییر وضعیت');
  return r.json();
}

// FX
export async function fetchCurrentFx(): Promise<FxRateRow> {
  const r = await af('/admin/fx');
  if (!r.ok) throw new Error('خطا در بارگذاری نرخ ارز');
  return r.json();
}

export async function fetchFxHistory(): Promise<FxRateRow[]> {
  const r = await af('/admin/fx/history');
  if (!r.ok) throw new Error('خطا در بارگذاری سابقه نرخ ارز');
  return r.json();
}

export async function setFxRate(usdToIrr: number, fxBuffer: number): Promise<unknown> {
  const r = await af('/admin/fx', {
    method: 'POST',
    body: JSON.stringify({ usd_to_irr: usdToIrr, fx_buffer: fxBuffer, source: 'admin-dashboard' }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.detail?.message || d.detail || 'خطا در بهروزرسانی نرخ ارز');
  }
  return r.json();
}

// Brakes
export async function fetchBrakeStatus(): Promise<BrakeStatus> {
  const r = await af('/admin/brakes/status');
  if (!r.ok) throw new Error('خطا در بارگذاری وضعیت ترمزها');
  return r.json();
}

export async function toggleKillSwitch(enable: boolean): Promise<unknown> {
  const r = await af(`/admin/brakes/kill-switch?enable=${enable}`, { method: 'POST' });
  if (!r.ok) throw new Error('خطا در تغییر کیل سوئیچ');
  return r.json();
}

export async function runMarginCheck(): Promise<{ disabled_models: string[] }> {
  const r = await af('/admin/brakes/margin-check', { method: 'POST' });
  if (!r.ok) throw new Error('خطا در بررسی مارجین');
  return r.json();
}