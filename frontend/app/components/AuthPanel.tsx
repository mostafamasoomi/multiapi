'use client';
import { useState } from 'react';

type AuthMode = 'login' | 'register';

export function AuthPanel({ onAuth }: { onAuth: (key: string) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'خطا در احراز هویت');
      }

      // Store API key and call onAuth
      localStorage.setItem('api_key', data.api_key);
      localStorage.setItem('user_id', String(data.user_id));
      onAuth(data.api_key);
    } catch (e: any) {
      setError(e.message || 'خطا در ارتباط');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-panel">
      <div className="auth-card">
        <div className="auth-logo">⚡</div>
        <h2>{mode === 'login' ? 'ورود' : 'ثبت‌نام'}</h2>
        <p className="auth-subtitle">به دروازه هوش مصنوعی خوش آمدید</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ایمیل</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>رمز عبور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'در حال پردازش...' : mode === 'login' ? 'ورود' : 'ثبت‌نام'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>حساب ندارید؟ <button onClick={() => setMode('register')}>ثبت‌نام کنید</button></>
          ) : (
            <>قبلا ثبت‌نام کردید؟ <button onClick={() => setMode('login')}>ورود</button></>
          )}
        </div>
      </div>
    </div>
  );
}
