'use client';

import { useState, useCallback } from 'react';

type ReferralCardProps = {
  label: string;
  value: string;
  copyable?: boolean;
  icon?: string;
  accent?: 'purple' | 'cyan' | 'mixed';
};

export function ReferralCard({ label, value, copyable = false, icon = '📋', accent = 'purple' }: ReferralCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  const accentBorderMap: Record<string, string> = {
    purple: 'rgba(139, 92, 246, 0.15)',
    cyan: 'rgba(6, 182, 212, 0.15)',
    mixed: 'rgba(139, 92, 246, 0.10)',
  };

  return (
    <div
      className="referral-card"
      style={{
        background: 'var(--bg-2)',
        border: `1px solid ${accentBorderMap[accent]}`,
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'var(--transition)',
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: accent === 'cyan'
            ? 'linear-gradient(90deg, #06b6d4, #8b5cf6)'
            : accent === 'mixed'
              ? 'linear-gradient(90deg, #8b5cf6, #06b6d4)'
              : 'var(--accent-grad)',
          opacity: 0.7,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '22px' }}>{icon}</span>
        <span style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          fontWeight: 500,
        }}>
          {label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <code
          style={{
            flex: 1,
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text)',
            background: 'var(--bg-3)',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            direction: 'ltr',
            textAlign: 'left' as const,
            fontFamily: "'Vazirmatn', monospace",
            wordBreak: 'break-all' as const,
            lineHeight: 1.5,
          }}
        >
          {value}
        </code>

        {copyable && (
          <button
            onClick={handleCopy}
            title={copied ? 'کپی شد!' : 'کپی'}
            style={{
              background: copied ? 'var(--success)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 18px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'Vazirmatn, sans-serif',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap',
              minWidth: '72px',
            }}
          >
            {copied ? '✓ کپی شد' : 'کپی'}
          </button>
        )}
      </div>
    </div>
  );
}
