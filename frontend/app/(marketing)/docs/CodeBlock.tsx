'use client';

import { useState } from 'react';

export default function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative', marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        borderTopLeftRadius: 12, borderTopRightRadius: 12,
        fontSize: 12, color: '#71717a',
      }}>
        <span>{language}</span>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? 'rgba(34,197,94,0.15)' : 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '4px 12px',
            color: copied ? '#22c55e' : '#a1a1aa',
            fontSize: 11, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ کپی شد' : '📋 کپی'}
        </button>
      </div>
      <pre style={{
        background: '#0d1117', margin: 0, padding: '16px 20px',
        borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
        overflow: 'auto', fontSize: 13, lineHeight: 1.6,
        direction: 'ltr', textAlign: 'left',
        fontFamily: "'Fira Code', 'Cascadia Code', monospace",
        color: '#e6edf3',
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}