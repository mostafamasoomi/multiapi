'use client';
import { useEffect } from 'react';

export function Toast({ message, show, onClose }: { message: string; show: boolean; onClose: () => void }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onClose, 5000);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);

  return (
    <div className={'toast' + (show ? ' show' : '')} role="alert">
      <span>⚠️</span>
      <span>{message}</span>
    </div>
  );
}
