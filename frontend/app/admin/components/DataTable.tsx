'use client';

import React, { useState, useMemo } from 'react';

export interface Column<T = Record<string, unknown>> {
  key: string;
  title: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  rowKey?: keyof T | ((row: T, index: number) => string | number);
  onRowClick?: (row: T) => void;
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
    boxShadow: 'var(--shadow)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  },
  th: {
    padding: '10px 14px',
    textAlign: 'right' as const,
    fontWeight: 700,
    background: 'rgba(139, 92, 246, 0.08)',
    color: 'var(--accent-2)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap' as const,
    fontSize: 12,
    cursor: 'default',
    userSelect: 'none' as const,
  },
  thSortable: {
    cursor: 'pointer',
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  sortIcon: {
    fontSize: 11,
    opacity: 0.5,
    transition: 'opacity 0.15s',
  },
  sortIconActive: {
    opacity: 1,
    color: 'var(--accent)',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '10px 14px',
    whiteSpace: 'nowrap' as const,
    fontSize: 13,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px 14px',
    color: 'var(--text-muted)',
    fontSize: 14,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '12px 14px',
    borderTop: '1px solid var(--border)',
    direction: 'ltr' as const,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    display: 'grid',
    placeItems: 'center',
    transition: 'all 0.15s',
  },
  pageBtnActive: {
    background: 'var(--accent)',
    color: '#fff',
    borderColor: 'var(--accent)',
  },
  pageBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: 12,
    color: 'var(--text-muted)',
    padding: '0 8px',
  },
  skeletonRow: {
    borderBottom: '1px solid var(--border)',
  },
  skeletonCell: {
    padding: '10px 14px',
  },
  skeletonBar: {
    height: 14,
    borderRadius: 6,
    background: 'rgba(255,255,255,0.06)',
    animation: 'shimmer 1.5s infinite',
  },
};

const SKELETON_ROWS = 5;

function getRowKey<T>(row: T, index: number, rowKey?: keyof T | ((row: T, idx: number) => string | number)): string | number {
  if (typeof rowKey === 'function') return rowKey(row, index);
  if (rowKey && typeof row === 'object' && row !== null && rowKey in row) {
    return String((row as Record<string, unknown>)[rowKey as string]);
  }
  return index;
}

function sortData<T>(
  data: T[],
  sortKey: string | null,
  sortDir: 'asc' | 'desc',
): T[] {
  if (!sortKey) return data;
  return [...data].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sortKey];
    const bVal = (b as Record<string, unknown>)[sortKey];
    if (aVal == null || bVal == null) return 0;

    let cmp = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      cmp = aVal.localeCompare(bVal, 'fa-IR');
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal), 'fa-IR');
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'داده‌ای موجود نیست',
  pageSize = 10,
  rowKey,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(
    () => sortData(data, sortKey, sortDir),
    [data, sortKey, sortDir],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const renderPageNumbers = () => {
    const pages: React.ReactNode[] = [];
    const maxVisible = 5;
    let start = Math.max(0, safePage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible);
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }

    for (let i = start; i < end; i++) {
      pages.push(
        <button
          key={i}
          style={{
            ...styles.pageBtn,
            ...(i === safePage ? styles.pageBtnActive : {}),
          }}
          onClick={() => setPage(i)}
        >
          {(i + 1).toLocaleString('fa-IR')}
        </button>,
      );
    }
    return pages;
  };

  return (
    <div style={{ ...styles.wrapper, direction: 'rtl' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...styles.th,
                  ...(col.sortable ? styles.thSortable : {}),
                }}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div style={styles.thContent}>
                  <span>{col.title}</span>
                  {col.sortable && (
                    <span
                      style={{
                        ...styles.sortIcon,
                        ...(sortKey === col.key ? styles.sortIconActive : {}),
                      }}
                    >
                      {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            // Skeleton rows
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <tr key={`skeleton-${i}`} style={styles.skeletonRow}>
                {columns.map((col) => (
                  <td key={col.key} style={styles.skeletonCell}>
                    <div
                      style={{
                        ...styles.skeletonBar,
                        width: `${60 + Math.random() * 30}%`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : !paginated.length ? (
            // Empty state
            <tr>
              <td colSpan={columns.length} style={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            // Data rows
            paginated.map((row, idx) => (
              <tr key={getRowKey(row, idx, rowKey)} style={styles.tr}>
                {columns.map((col) => (
                  <td key={col.key} style={styles.td}>
                    {col.render
                      ? col.render(row, safePage * pageSize + idx)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div style={styles.pagination}>
          <button
            style={{
              ...styles.pageBtn,
              ...(safePage === 0 ? styles.pageBtnDisabled : {}),
            }}
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ‹
          </button>

          {renderPageNumbers()}

          <button
            style={{
              ...styles.pageBtn,
              ...(safePage >= totalPages - 1 ? styles.pageBtnDisabled : {}),
            }}
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            ›
          </button>

          <span style={styles.pageInfo}>
            صفحه {(safePage + 1).toLocaleString('fa-IR')} از{' '}
            {totalPages.toLocaleString('fa-IR')}
          </span>
        </div>
      )}
    </div>
  );
}