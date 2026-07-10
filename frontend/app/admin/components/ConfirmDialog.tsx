'use client';

import React, { useEffect, useCallback } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.65)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 100,
    backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.2s ease',
  },
  dialog: {
    background: 'var(--panel-solid)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    width: '90%',
    maxWidth: 420,
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    animation: 'scaleIn 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontWeight: 700,
    fontSize: 15,
    color: 'var(--text)',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: 14,
    display: 'grid',
    placeItems: 'center',
    transition: 'all 0.15s',
  },
  body: {
    padding: '20px',
  },
  message: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
    textAlign: 'center' as const,
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    padding: '0 20px 20px',
  },
  btnBase: {
    padding: '10px 28px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    minWidth: 100,
  },
  btnCancel: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
  },
  btnConfirm: {
    background: 'var(--accent-grad)',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)',
  },
  btnDanger: {
    background: 'var(--danger)',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      style={styles.overlay}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        style={{ ...styles.dialog, direction: 'rtl' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <span id="confirm-dialog-title" style={styles.title}>
            {title}
          </span>
          <button
            style={styles.closeBtn}
            onClick={onCancel}
            aria-label="بستن"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <p style={styles.message}>{message}</p>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={{ ...styles.btnBase, ...styles.btnCancel }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            style={{
              ...styles.btnBase,
              ...(danger ? styles.btnDanger : styles.btnConfirm),
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}