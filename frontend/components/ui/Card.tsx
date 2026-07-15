'use client'

import { ReactNode } from 'react'

/* ─── Card ─── */
interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddings = { sm: 'p-4', md: 'p-5', lg: 'p-6' }

export function Card({ children, className = '', hover, padding = 'md', onClick }: CardProps) {
  return (
    <div
      className={`
        bg-panel backdrop-blur-xl border border-border rounded-lg
        ${hover ? 'hover:bg-panel-hover hover:border-border-light transition-all duration-150 cursor-pointer' : ''}
        ${paddings[padding]}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

/* ─── Badge ─── */
type BadgeVariant = 'flagship' | 'mid' | 'mini' | 'success' | 'danger' | 'warning' | 'muted'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
}

const badgeVariants: Record<BadgeVariant, string> = {
  flagship: 'bg-accent/15 text-accent',
  mid: 'bg-accent-2/15 text-accent-2',
  mini: 'bg-success/15 text-success',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
  warning: 'bg-warning/15 text-warning',
  muted: 'bg-bg-3 text-text-muted',
}

export function Badge({ children, variant = 'muted', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-xl
        ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'}
        ${badgeVariants[variant]}
      `}
    >
      {children}
    </span>
  )
}

/* ─── MetricCard ─── */
interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; positive: boolean }
  accent?: string
}

export function MetricCard({ title, value, subtitle, icon, trend, accent }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      {accent && (
        <div
          className="absolute top-0 left-0 w-full h-0.5"
          style={{ background: accent }}
        />
      )}
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary">{title}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-text mb-1">{value}</div>
      <div className="flex items-center gap-2">
        {subtitle && <span className="text-xs text-text-muted">{subtitle}</span>}
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? 'text-success' : 'text-danger'}`}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </Card>
  )
}

/* ─── Skeleton ─── */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-bg-3 rounded ${className}`}
    />
  )
}

/* ─── EmptyState ─── */
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-4xl mb-4 opacity-50">{icon}</div>}
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      {description && <p className="text-sm text-text-secondary mb-6 max-w-md">{description}</p>}
      {action}
    </div>
  )
}

/* ─── Divider ─── */
export function Divider({ className = '' }: { className?: string }) {
  return <div className={`border-t border-border ${className}`} />
}

/* ─── PageHeader ─── */
interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-text">{title}</h1>
        {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* ─── StatusDot ─── */
export function StatusDot({ status }: { status: 'online' | 'offline' | 'warning' }) {
  const colors = {
    online: 'bg-success',
    offline: 'bg-danger',
    warning: 'bg-warning',
  }
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />
  )
}

/* ─── CopyButton ─── */
export function CopyButton({ text, label = 'کپی' }: { text: string; label?: string }) {
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text) } catch {}
  }
  return (
    <button
      onClick={handleCopy}
      className="text-xs text-text-muted hover:text-accent transition-colors px-2 py-1 rounded bg-bg-3 hover:bg-bg-3/80"
    >
      {label}
    </button>
  )
}
