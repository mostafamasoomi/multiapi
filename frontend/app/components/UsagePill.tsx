'use client';

type Props = {
  cost_irr: number;
  token_count?: number;
};

export function UsagePill({ cost_irr, token_count }: Props) {
  return (
    <span className="usage-pill" dir="rtl" title={token_count ? `${token_count.toLocaleString('fa-IR')} توکن` : undefined}>
      <span>💰</span>
      <span className="usage-cost">
        {cost_irr.toLocaleString('fa-IR')} ریال
      </span>
      {token_count !== undefined && (
        <span className="usage-tokens">
          {token_count.toLocaleString('fa-IR')} توکن
        </span>
      )}
    </span>
  );
}