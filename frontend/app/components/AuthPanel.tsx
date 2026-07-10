'use client';
import { useState } from 'react';

type AuthMode = 'login' | 'register';

export function AuthPanel({ onAuth }: { onAuth: (key: string) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body: Record<string, string> = { email, password };
      if (mode === 'register') body.username = username;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'خطا در احراز هویت');
      }

      // API key from response body (also set as HttpOnly cookie)
      if (data.api_key) {
        localStorage.setItem('api_key', data.api_key);
        localStorage.setItem('user_id', String(data.user_id));
        onAuth(data.api_key);
      } else {
        throw new Error('پاسخی از سرور دریافت نشد');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-panel">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⚡</span>
          <h1>MultiAPI</h1>
        </div>
        <h2>{mode === 'login' ? 'ورود' : 'ثبت‌نام'}</h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'به پنل کاربری خود وارد شوید'
            : 'حساب جدید بسازید و شروع کنید'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">ایمیل</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@mail.com"
              required
              autoFocus
              dir="ltr"
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="username">نام کاربری (اختیاری)</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="نام نمایشی"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">رمز عبور</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="حداقل ۶ کاراکتر"
              required
              minLength={6}
              dir="ltr"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'در حال پردازش...' : mode === 'login' ? 'ورود' : 'ثبت‌نام'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>حساب ندارید؟{' '}<button onClick={() => { setMode('register'); setError(''); }}>ثبت‌نام کنید</button></>
          ) : (
            <>قبلاً ثبت‌نام کردید؟{' '}<button onClick={() => { setMode('login'); setError(''); }}>ورود</button></>
          )}
        </div>

        <div className="auth-footer-note">
          رمز عبور شما با bcrypt ذخیره و هرگز به صورت متن ساده نگهداری نمی‌شود.
        </div>
      </div>
    </div>
  );
}