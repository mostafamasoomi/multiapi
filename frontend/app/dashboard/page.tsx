'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, MetricCard, Badge, PageHeader, Skeleton, StatusDot } from '@/components/ui'
import Button from '@/components/ui/Button'

const API = ''

interface UserInfo {
  id: number
  email: string
  username: string
  balance_irr: number
  daily_spend_used_irr: number
  daily_spend_cap_irr: number
  plan_id: number
  status: string
}

interface Model {
  alias: string
  tier: string
  active: boolean
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    const key = localStorage.getItem('api_key') || ''
    setApiKey(key)
    if (!key) { setLoading(false); return }

    Promise.all([
      fetch(`/api/me`, { headers: { Authorization: `Bearer ${key}` } }).then(r => r.ok ? r.json() : null),
      fetch(`/api/models`).then(r => r.ok ? r.json() : []),
    ]).then(([userData, modelsData]) => {
      setUser(userData)
      setModels(Array.isArray(modelsData) ? modelsData : [])
    }).finally(() => setLoading(false))
  }, [])

  const formatIRR = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toLocaleString('fa-IR')
  }

  const activeModels = models.filter(m => m.active)

  if (loading) {
    return (
      <div className="min-h-screen bg-bg p-6" dir="rtl">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    )
  }

  if (!apiKey || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-lg font-bold text-text mb-2">ورود به حساب</h2>
          <p className="text-sm text-text-secondary mb-6">
            برای مشاهده داشبورد، ابتدا وارد حساب خود شوید
          </p>
          <Link href="/app">
            <Button fullWidth>ورود / ثبت‌نام</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text mb-1">
            سلام، {user.username || user.email?.split('@')[0]} 👋
          </h1>
          <p className="text-sm text-text-secondary">
            به پنل MultiAPI خوش آمدید. وضعیت حساب شما:
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="موجودی کیف پول"
            value={`${formatIRR(user.balance_irr)} تومان`}
            icon={<span className="text-xl">💰</span>}
            accent="linear-gradient(135deg, #8b5cf6, #06b6d4)"
          />
          <MetricCard
            title="مصرف امروز"
            value={`${formatIRR(user.daily_spend_used_irr)} تومان`}
            subtitle={`سقف: ${formatIRR(user.daily_spend_cap_irr)}`}
            icon={<span className="text-xl">📊</span>}
            accent="#06b6d4"
          />
          <MetricCard
            title="مدل‌های فعال"
            value={activeModels.length}
            subtitle={`از ${models.length} مدل`}
            icon={<span className="text-xl">🤖</span>}
            accent="#22c55e"
          />
          <MetricCard
            title="وضعیت سرویس"
            value="آنلاین"
            icon={<StatusDot status="online" />}
            accent="#22c55e"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/app">
            <Card hover className="text-center cursor-pointer group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">💬</div>
              <h3 className="text-sm font-semibold text-text mb-1">گفتگوی جدید</h3>
              <p className="text-xs text-text-muted">شروع چت با مدل‌ها</p>
            </Card>
          </Link>
          <Link href="/models">
            <Card hover className="text-center cursor-pointer group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🧩</div>
              <h3 className="text-sm font-semibold text-text mb-1">مدل‌ها</h3>
              <p className="text-xs text-text-muted">مشاهده و انتخاب مدل</p>
            </Card>
          </Link>
          <Link href="/api-keys">
            <Card hover className="text-center cursor-pointer group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🔑</div>
              <h3 className="text-sm font-semibold text-text mb-1">API Keys</h3>
              <p className="text-xs text-text-muted">مدیریت کلیدهای API</p>
            </Card>
          </Link>
          <Link href="/docs">
            <Card hover className="text-center cursor-pointer group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📖</div>
              <h3 className="text-sm font-semibold text-text mb-1">مستندات</h3>
              <p className="text-xs text-text-muted">راهنمای استفاده</p>
            </Card>
          </Link>
        </div>

        {/* Models Grid */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text">مدل‌های موجود</h2>
            <Link href="/models" className="text-xs text-accent hover:text-accent-hover transition-colors">
              مشاهده همه ←
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {models.slice(0, 6).map(model => (
              <div
                key={model.alias}
                className="flex items-center justify-between p-3 bg-bg-3 rounded border border-border"
              >
                <div className="flex items-center gap-2">
                  <StatusDot status={model.active ? 'online' : 'offline'} />
                  <span className="text-sm text-text font-mono">{model.alias}</span>
                </div>
                <Badge variant={model.tier as 'pro' | 'standard' | 'mini'}>
                  {model.tier === 'pro' ? 'حرفه‌ای' : model.tier === 'standard' ? 'استاندارد' : 'سبک'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Start Code */}
        <Card>
          <h2 className="text-base font-semibold text-text mb-4">شروع سریع</h2>
          <div className="bg-[#0d1117] rounded p-4 font-mono text-sm overflow-x-auto" dir="ltr">
            <div className="text-text-muted mb-2"># Quick start with curl</div>
            <pre className="text-[#e6edf3] whitespace-pre-wrap">{`curl -X POST ${API}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"سلام"}]}'`}</pre>
          </div>
        </Card>
      </div>
    </div>
  )
}
