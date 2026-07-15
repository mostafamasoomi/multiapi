'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, Badge, PageHeader, Skeleton, StatusDot } from '@/components/ui'
import Button from '@/components/ui/Button'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8800'

interface Model {
  alias: string
  tier: string
  active: boolean
  free_tier_eligible?: boolean
  up_in?: number
  up_out?: number
  in_margin?: number
  out_margin?: number
  max_tokens_cap?: number
}

const tierColors: Record<string, string> = {
  pro: '#8b5cf6',
  standard: '#06b6d4',
  mini: '#22c55e',
}

const tierLabels: Record<string, string> = {
  pro: 'حرفه‌ای',
  standard: 'استاندارد',
  mini: 'سبک',
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetch(`${API}/api/models`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setModels(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? models : models.filter(m => m.tier === filter)
  const activeCount = models.filter(m => m.active).length

  if (loading) {
    return (
      <div className="min-h-screen bg-bg p-6" dir="rtl">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="مدل‌های هوش مصنوعی"
          description={`${activeCount} مدل فعال از ${models.length} مدل موجود`}
        />

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pro', 'standard', 'mini'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`
                px-4 py-2 rounded text-sm font-medium transition-all
                ${filter === t
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-bg-3 text-text-secondary border border-border hover:bg-panel-hover'
                }
              `}
            >
              {t === 'all' ? 'همه' : tierLabels[t]}
              <span className="mr-1 text-xs opacity-60">
                ({t === 'all' ? models.length : models.filter(m => m.tier === t).length})
              </span>
            </button>
          ))}
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(model => (
            <Card key={model.alias} hover className="relative">
              {/* Tier indicator */}
              <div
                className="absolute top-0 left-0 w-full h-0.5"
                style={{ background: tierColors[model.tier] || '#71717a' }}
              />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <StatusDot status={model.active ? 'online' : 'offline'} />
                  <span className="font-mono font-bold text-text">{model.alias}</span>
                </div>
                <Badge variant={model.tier as 'pro' | 'standard' | 'mini'}>
                  {tierLabels[model.tier] || model.tier}
                </Badge>
              </div>

              {/* Pricing */}
              {model.up_in != null && model.up_out != null && (
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">ورودی:</span>
                    <span className="text-text-secondary font-mono">
                      {model.up_in.toLocaleString('fa-IR')} ریال/1M
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">خروجی:</span>
                    <span className="text-text-secondary font-mono">
                      {model.up_out.toLocaleString('fa-IR')} ریال/1M
                    </span>
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="flex gap-2 flex-wrap">
                {model.free_tier_eligible && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-success/10 text-success">
                    رایگان
                  </span>
                )}
                {model.max_tokens_cap && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-bg-3 text-text-muted">
                    سقف: {model.max_tokens_cap.toLocaleString('fa-IR')} توکن
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link href="/app">
            <Button size="lg">شروع چت با مدل‌ها</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
