'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, MetricCard, Badge, PageHeader, Skeleton, EmptyState } from '@/components/ui'
import Button from '@/components/ui/Button'

const API = ''

interface UserInfo {
  balance_irr: number
  daily_spend_used_irr: number
  daily_spend_cap_irr: number
}

interface LedgerEntry {
  txn_type: string
  amount_irr: number
  balance_after_irr: number
  created_at: string
}

export default function UsagePage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    const key = localStorage.getItem('api_key') || ''
    setApiKey(key)
    if (!key) { setLoading(false); return }

    Promise.all([
      fetch(`/api/me`, { headers: { Authorization: `Bearer ${key}` } }).then(r => r.ok ? r.json() : null),
      fetch(`/api/wallet/me/ledger`, { headers: { Authorization: `Bearer ${key}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([userData, ledgerData]) => {
      setUser(userData)
      setLedger(Array.isArray(ledgerData) ? ledgerData : [])
    }).finally(() => setLoading(false))
  }, [])

  const formatIRR = (n: number) => n?.toLocaleString('fa-IR') || '۰'

  const txnLabels: Record<string, string> = {
    topup: 'شارژ',
    chat_spend: 'مصرف چت',
    admin_topup: 'شارژ ادمین',
    refund: 'بازگشت',
    payment: 'پرداخت',
  }

  const txnColors: Record<string, string> = {
    topup: 'text-success',
    chat_spend: 'text-danger',
    admin_topup: 'text-accent',
    refund: 'text-warning',
    payment: 'text-success',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg p-6" dir="rtl">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!apiKey || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6" dir="rtl">
        <EmptyState
          icon="🔐"
          title="ورود به حساب"
          description="برای مشاهده کیف پول، ابتدا وارد حساب خود شوید"
          action={
            <Link href="/app">
              <Button>ورود / ثبت‌نام</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="کیف پول"
          description="مدیریت موجودی و تاریخچه تراکنش‌ها"
          action={
            <Link href="/app">
              <Button variant="secondary" size="sm">شارژ کیف پول</Button>
            </Link>
          }
        />

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetricCard
            title="موجودی فعلی"
            value={`${formatIRR(user.balance_irr)} تومان`}
            icon={<span className="text-xl">💰</span>}
            accent="linear-gradient(135deg, #8b5cf6, #06b6d4)"
          />
          <MetricCard
            title="مصرف امروز"
            value={`${formatIRR(user.daily_spend_used_irr)} تومان`}
            icon={<span className="text-xl">📊</span>}
            accent="#06b6d4"
          />
          <MetricCard
            title="سقف روزانه"
            value={`${formatIRR(user.daily_spend_cap_irr)} تومان`}
            icon={<span className="text-xl">🛡️</span>}
            accent="#22c55e"
          />
        </div>

        {/* Spend Progress */}
        {user.daily_spend_cap_irr > 0 && (
          <Card className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">مصرف امروز</span>
              <span className="text-xs text-text-muted">
                {formatIRR(user.daily_spend_used_irr)} از {formatIRR(user.daily_spend_cap_irr)}
              </span>
            </div>
            <div className="w-full h-2 bg-bg-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-gradient rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (user.daily_spend_used_irr / user.daily_spend_cap_irr) * 100)}%` }}
              />
            </div>
          </Card>
        )}

        {/* Ledger */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text">تاریخچه تراکنش‌ها</h2>
            <span className="text-xs text-text-muted">{ledger.length} تراکنش</span>
          </div>

          {ledger.length === 0 ? (
            <EmptyState
              icon="📋"
              title="تراکنشی وجود ندارد"
              description="هنوز هیچ تراکنشی ثبت نشده است"
            />
          ) : (
            <div className="divide-y divide-border">
              {ledger.map((entry, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {entry.txn_type === 'topup' || entry.txn_type === 'admin_topup' ? '📥' : '📤'}
                    </span>
                    <div>
                      <span className="text-sm text-text">
                        {txnLabels[entry.txn_type] || entry.txn_type}
                      </span>
                      <div className="text-xs text-text-muted">
                        {new Date(entry.created_at).toLocaleDateString('fa-IR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`text-sm font-bold ${txnColors[entry.txn_type] || 'text-text'}`}>
                      {entry.amount_irr > 0 ? '+' : ''}{formatIRR(entry.amount_irr)}
                    </span>
                    <div className="text-xs text-text-muted">
                      مانده: {formatIRR(entry.balance_after_irr)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
