'use client';
import { useState, useEffect } from 'react';

type SettingsProps = {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  selectedModel: string;
};

export function SettingsPanel({ open, onClose, apiKey, selectedModel }: SettingsProps) {
  const [balance, setBalance] = useState(0);
  const [email, setEmail] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    if (!open || !apiKey) return;
    fetch('/api/me', { headers: { Authorization: `Bearer ${apiKey}` } })
      .then(r => r.json())
      .then(data => {
        setBalance(data.balance_irr || 0);
        setEmail(data.email || '');
      })
      .catch(() => {});
  }, [open, apiKey]);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <h3>
          ⚙️ تنظیمات
          <button className="icon-btn" onClick={onClose}>✕</button>
        </h3>

        <div className="settings-section">
          <h4>حساب کاربری</h4>
          <div className="settings-row">
            <span className="label">ایمیل</span>
            <span className="value">{email || '—'}</span>
          </div>
          <div className="settings-row">
            <span className="label">موجودی</span>
            <span className="value">{balance.toLocaleString('fa-IR')} ریال</span>
          </div>
          <div className="settings-row">
            <span className="label">مدل فعال</span>
            <span className="value">{selectedModel || '—'}</span>
          </div>
        </div>

        <div className="settings-section">
          <h4>ظاهر</h4>
          <div className="settings-row">
            <span className="label">اندازه فونت</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="icon-btn"
                style={{ width: 28, height: 28, fontSize: 14 }}
                onClick={() => setFontSize(s => Math.max(12, s - 1))}
              >
                −
              </button>
              <span className="value" style={{ minWidth: 30, textAlign: 'center' }}>{fontSize}px</span>
              <button
                className="icon-btn"
                style={{ width: 28, height: 28, fontSize: 14 }}
                onClick={() => setFontSize(s => Math.min(20, s + 1))}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h4>درباره</h4>
          <div className="settings-row">
            <span className="label">نسخه</span>
            <span className="value">1.0.0</span>
          </div>
          <div className="settings-row">
            <span className="label">پلتفرم</span>
            <span className="value">Persian AI Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}
