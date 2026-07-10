'use client';
import { useEffect } from 'react';

export function AdminToast({
  msg,
  ok,
  onClose,
}: {
  msg: string;
  ok: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  return (
    <div className={'admin-toast' + (msg ? ' show' : '') + (ok ? '' : ' error')}>
      <span>{ok ? '✅' : '⚠️'}</span>
      <span>{msg}</span>
    </div>
  );
}