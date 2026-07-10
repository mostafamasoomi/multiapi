'use client';

export function MetricCard({
  icon,
  title,
  value,
  accent,
}: {
  icon: string;
  title: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="metric-card" style={{ borderColor: accent + '22' }}>
      <div className="metric-card-icon">{icon}</div>
      <div className="metric-card-title">{title}</div>
      <div className="metric-card-value" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}