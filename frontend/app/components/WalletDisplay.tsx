'use client';
import { useEffect, useState, useCallback } from 'react';

type WalletInfo = {
  balance_irr: number;
  daily_spend_used_irr: number;
  daily_spend_cap_irr: number;
};

export function WalletDisplay({ apiKey, refreshTrigger }: { apiKey: string; refreshTrigger?: number }) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!apiKey) return;
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWallet({
          balance_irr: data.balance_irr || 0,
          daily_spend_used_irr: data.daily_spend_used_irr || 0,
          daily_spend_cap_irr: data.daily_spend_cap_irr || 0,
        });
      }
    } catch (e) {
      console.error('Failed to fetch wallet:', e);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // Initial fetch
  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Refresh when trigger changes (e.g., after chat completion)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchWallet();
    }
  }, [refreshTrigger, fetchWallet]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchWallet, 30000);
    return () => clearInterval(interval);
  }, [fetchWallet]);

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
