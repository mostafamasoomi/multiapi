'use client';
import { useEffect, useState } from 'react';

type WalletInfo = {
  balance_irr: number;
  daily_spend_used_irr: number;
  daily_spend_cap_irr: number;
};

export function WalletDisplay({ apiKey }: { apiKey: string }) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiKey) return;
    fetch('/api/me', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setWallet({
          balance_irr: data.balance_irr || 0,
          daily_spend_used_irr: data.daily_spend_used_irr || 0,
          daily_spend_cap_irr: data.daily_spend_cap_irr || 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiKey]);

  if (loading) return <div className="wallet-loading">در حال بارگذاری...</div>;
  if (!wallet) return null;

  const balance = wallet.balance_irr.toLocaleString('fa-IR');
  const used = wallet.daily_spend_used_irr.toLocaleString('fa-IR');
  const cap = wallet.daily_spend_cap_irr > 0
    ? wallet.daily_spend_cap_irr.toLocaleString('fa-IR')
    : '∞';

  return (
    <div className="wallet-display">
      <div className="wallet-row">
        <span className="wallet-label"> موجودی</span>
        <span className="wallet-value">{balance} ریال</span>
      </div>
      <div className="wallet-row">
        <span className="wallet-label"> مصرف امروز</span>
        <span className="wallet-value">{used} / {cap}</span>
      </div>
      {wallet.daily_spend_cap_irr > 0 && (
        <div className="wallet-bar">
          <div
            className="wallet-bar-fill"
            style={{
              width: `${Math.min(100, (wallet.daily_spend_used_irr / wallet.daily_spend_cap_irr) * 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
