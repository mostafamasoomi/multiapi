'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type UserProfile = {
  id?: number;
  user_id?: number;
  email: string;
  phone?: string;
  username?: string;
  balance_irr: number;
  plan?: string;
  plan_id?: number;
  status?: string;
  created_at?: string;
  daily_spend_used_irr?: number;
  daily_spend_cap_irr?: number;
};

export default function ProfilePage() {
  const [apiKey, setApiKey] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const key = localStorage.getItem('api_key') || localStorage.getItem('apiKey');
    if (!key) {
      window.location.href = '/app';
      return;
    }
    setApiKey(key);
    fetchProfile(key);
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function fetchProfile(key: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) throw new Error('خطا در بارگذاری پروفایل');
      const data: UserProfile = await res.json();
      setProfile(data);
      setPhone(data.phone || '');
    } catch (e: any) {
      showToast(e.message || 'خطا در بارگذاری پروفایل', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey) return;
    setSavingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.error || 'خطا در ذخیره پروفایل');
      }
      showToast('پروفایل با موفقیت بروزرسانی شد', 'success');
      fetchProfile(apiKey);
    } catch (e: any) {
      showToast(e.message || 'خطا در ذخیره پروفایل', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey) return;

    if (newPassword.length < 8) {
      showToast('رمز عبور جدید باید حداقل ۸ کاراکتر باشد', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('رمز عبور جدید و تکرار آن مطابقت ندارند', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.error || 'خطا در تغییر رمز عبور');
      }
      showToast('رمز عبور با موفقیت تغییر کرد', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      showToast(e.message || 'خطا در تغییر رمز عبور', 'error');
    } finally {
      setChangingPassword(false);
    }
  }

  function formatBalance(amount: number): string {
    return new Intl.NumberFormat('fa-IR').format(amount);
  }

  function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function getPlanLabel(profile: UserProfile): string {
    const plan = profile.plan || String(profile.plan_id || '');
    const plans: Record<string, string> = {
      free: 'رایگان',
      basic: 'پایه',
      pro: 'حرفه‌ای',
      enterprise: 'سازمانی',
      '0': 'رایگان',
      '1': 'پایه',
      '2': 'حرفه‌ای',
    };
    return plans[plan?.toLowerCase?.()] || plan || '—';
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <Link href="/app" className="back-link">
          <span className="back-arrow">→</span>
          <span>بازگشت</span>
        </Link>
        <h1 className="profile-title">
          <span className="title-icon">👤</span>
          پروفایل کاربری
        </h1>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>در حال بارگذاری...</span>
        </div>
      ) : !profile ? (
        <div className="empty-state">
          <div className="empty-icon">😕</div>
          <p>خطا در بارگذاری اطلاعات</p>
          <button className="btn btn-accent" onClick={() => fetchProfile(apiKey)}>
            تلاش مجدد
          </button>
        </div>
      ) : (
        <div className="profile-content">
          {/* Info Cards */}
          <div className="info-grid">
            <div className="info-card">
              <div className="info-card-icon">📧</div>
              <div className="info-card-label">ایمیل</div>
              <div className="info-card-value">{profile.email}</div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">💰</div>
              <div className="info-card-label">موجودی</div>
              <div className="info-card-value accent">{formatBalance(profile.balance_irr)} ریال</div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">⭐</div>
              <div className="info-card-label">پلن</div>
              <div className="info-card-value">
                <span className="plan-badge">{getPlanLabel(profile)}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">📅</div>
              <div className="info-card-label">عضویت از</div>
              <div className="info-card-value">{formatDate(profile.created_at)}</div>
            </div>
          </div>

          {/* Edit Profile */}
          <div className="glass-panel">
            <h2 className="panel-title">
              <span>✏️</span>
              ویرایش پروفایل
            </h2>
            <form onSubmit={handleSaveProfile} className="profile-form">
              <div className="form-group">
                <label htmlFor="email-display">ایمیل</label>
                <input
                  id="email-display"
                  type="email"
                  value={profile.email}
                  disabled
                  dir="ltr"
                  className="form-input form-input-disabled"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">شماره موبایل</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="09123456789"
                  dir="ltr"
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-accent" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <span className="btn-spinner" />
                      در حال ذخیره...
                    </>
                  ) : (
                    'ذخیره تغییرات'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="glass-panel">
            <h2 className="panel-title">
              <span>🔒</span>
              تغییر رمز عبور
            </h2>
            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="form-group">
                <label htmlFor="old-password">رمز عبور فعلی</label>
                <input
                  id="old-password"
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="رمز عبور فعلی خود را وارد کنید"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-password">رمز عبور جدید</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="حداقل ۸ کاراکتر"
                  className="form-input"
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">تکرار رمز عبور جدید</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="رمز عبور جدید را دوباره وارد کنید"
                  className="form-input"
                  required
                  minLength={8}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-accent" disabled={changingPassword}>
                  {changingPassword ? (
                    <>
                      <span className="btn-spinner" />
                      در حال تغییر...
                    </>
                  ) : (
                    'تغییر رمز عبور'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'} toast-show`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.08), transparent),
            radial-gradient(ellipse 60% 40% at 80% 100%, rgba(6, 182, 212, 0.05), transparent),
            var(--bg);
          padding: 24px;
          overflow-y: auto;
        }

        .profile-header {
          max-width: 720px;
          margin: 0 auto 32px;
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--panel);
          backdrop-filter: blur(12px);
          transition: all var(--transition);
        }

        .back-link:hover {
          color: var(--text);
          border-color: var(--border-light);
          background: var(--panel-hover);
        }

        .back-arrow {
          font-size: 16px;
        }

        .profile-title {
          font-size: 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .title-icon {
          font-size: 28px;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 80px 0;
          color: var(--text-secondary);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 80px 0;
          color: var(--text-secondary);
        }

        .empty-icon {
          font-size: 48px;
        }

        .profile-content {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        @media (max-width: 540px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
        }

        .info-card {
          background: var(--panel);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: all var(--transition);
        }

        .info-card:hover {
          border-color: var(--border-light);
          transform: translateY(-2px);
          box-shadow: var(--shadow);
        }

        .info-card-icon {
          font-size: 24px;
        }

        .info-card-label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-card-value {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          word-break: break-all;
        }

        .info-card-value.accent {
          color: var(--accent);
        }

        .plan-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          background: var(--accent-glow);
          color: var(--accent);
          font-size: 13px;
          font-weight: 600;
        }

        .glass-panel {
          background: var(--panel);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 28px;
        }

        .panel-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text);
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .form-input {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          font-size: 15px;
          color: var(--text);
          font-family: 'Vazirmatn', system-ui, sans-serif;
          transition: all var(--transition);
          outline: none;
        }

        .form-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .form-input::placeholder {
          color: var(--text-dim);
        }

        .form-input-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-actions {
          display: flex;
          justify-content: flex-start;
          padding-top: 4px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          font-family: 'Vazirmatn', system-ui, sans-serif;
          cursor: pointer;
          transition: all var(--transition);
          border: none;
          outline: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-accent {
          background: var(--accent-grad);
          color: white;
        }

        .btn-accent:hover:not(:disabled) {
          background: var(--accent-grad-hover);
          box-shadow: var(--shadow-accent);
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* Toast */
        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          padding: 14px 24px;
          border-radius: var(--radius);
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          transition: all var(--transition-slow);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          z-index: 1000;
          pointer-events: none;
        }

        .toast-show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
          pointer-events: auto;
        }

        .toast-success {
          background: var(--success-bg);
          border-color: rgba(34, 197, 94, 0.2);
          color: var(--success);
        }

        .toast-error {
          background: var(--danger-bg);
          border-color: rgba(239, 68, 68, 0.2);
          color: var(--danger);
        }

        @media (max-width: 768px) {
          .profile-page {
            padding: 16px;
          }

          .profile-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .profile-title {
            font-size: 20px;
          }

          .glass-panel {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
