'use client';
import { useState } from 'react';
import { setAdminToken } from '../../../lib/admin-api';

export function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      // Verify token by making an actual admin API call (through Next.js proxy)
      const r = await fetch('/api/admin/brakes/status', {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      if (!r.ok) {
        if (r.status === 401) {
          throw new Error('توکن ادمین نامعتبر است');
        }
        throw new Error('سرور در دسترس نیست');
      }
      setAdminToken(token.trim());
      onLogin(token.trim());
    } catch (e: any) {
      setErr(e.message || 'خطا');
    } finally {
      setLoading(false);
    }
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
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_TOKEN"
            autoFocus
          />
        </div>
        <button className="auth-btn" type="submit" disabled={loading || !token.trim()}>
          {loading ? '...' : 'ورود'}
        </button>
      </form>
    </div>
  );
}