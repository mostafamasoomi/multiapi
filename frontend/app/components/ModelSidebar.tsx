'use client';
import { ReactNode } from 'react';

type Model = { alias: string; tier: string; active: boolean; auto_disabled: boolean };

const TIER_LABEL: Record<string, string> = { mini: 'سبک', standard: 'استاندارد', pro: 'حرفهای' };

export function ModelSidebar({
  models,
  selected,
  onSelect,
  query,
  setQuery,
  children,
}: {
  models: Model[];
  selected: string;
  onSelect: (a: string) => void;
  query: string;
  setQuery: (q: string) => void;
  children?: ReactNode;
}) {
  const filtered = models.filter((m) => m.alias.toLowerCase().includes(query.toLowerCase()));
  const groups: Record<string, Model[]> = { pro: [], standard: [], mini: [] };
  filtered.forEach((m) => {
    const g = groups[m.tier] ? m.tier : 'standard';
    groups[g].push(m);
  });

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">⚡</div>
        <div className="name">multiapi</div>
      </div>

      {children}

      <input
        className="search"
        placeholder="جستجوی مدل..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="model-list">
        {(['pro', 'standard', 'mini'] as const).map((tier) =>
          groups[tier].length ? (
            <div key={tier}>
              <div className="model-group-label">{TIER_LABEL[tier] ?? tier}</div>
              {groups[tier].map((m) => {
                const on = m.active && !m.auto_disabled;
                return (
                  <div
                    key={m.alias}
                    className={'model-item' + (m.alias === selected ? ' active' : '')}
                    onClick={() => onSelect(m.alias)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={'dot' + (on ? '' : ' off')} />
                      {m.alias}
                    </span>
                    <span className={'tier-badge ' + tier}>{TIER_LABEL[tier] ?? tier}</span>
                  </div>
                );
              })}
            </div>
          ) : null
        )}
        {!filtered.length && <div className="muted" style={{ padding: 12, fontSize: 13 }}>مدلی یافت نشد</div>}
      </div>

      <div className="sidebar-foot">دروازه هوش مصنوعی · نسخه بتا</div>
    </aside>
  );
}
