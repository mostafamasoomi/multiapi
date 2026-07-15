'use client'

import Link from 'next/link'
import { Card, Badge } from '@/components/ui'
import Button from '@/components/ui/Button'

const plans = [
  {
    name: 'رایگان',
    price: '۰',
    period: 'برای همیشه',
    features: ['مدل‌های سبک', '۵۰,۰۰۰ توکن روزانه', 'چت متنی', 'پشتیبانی فارسی'],
    cta: 'شروع رایگان',
    href: '/app',
    highlighted: false,
  },
  {
    name: 'پیش‌پرداخت',
    price: 'دلخواه',
    period: 'اعتبار بدون انقضا',
    features: ['همه مدل‌ها', 'پرداخت به ازای مصرف', 'کنترل سقف هزینه', 'API Key شخصی', 'تاریخچه مصرف', 'پشتیبانی ویژه'],
    cta: 'شروع کنید',
    href: '/app',
    highlighted: true,
  },
]

const examples = [
  { task: 'یک سوال ساده', model: 'Haiku 4.5', cost: '~۵۰ تومان' },
  { task: 'تحلیل یک صفحه متن', model: 'GPT-4o Mini', cost: '~۲۰۰ تومان' },
  { task: 'کدنویسی یک تابع', model: 'DeepSeek 3.2', cost: '~۴۰۰ تومان' },
  { task: 'گزارش ۵ صفحه‌ای', model: 'GPT-4o', cost: '~۱,۵۰۰ تومان' },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-text mb-3">قیمت‌گذاری شفاف</h1>
          <p className="text-text-secondary max-w-md mx-auto">
            فقط برای چیزی که مصرف می‌کنید هزینه پرداخت کنید. بدون هزینه پنهان.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {plans.map(plan => (
            <Card
              key={plan.name}
              padding="lg"
              className={`relative ${plan.highlighted ? 'border-accent/30' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 left-0 w-full h-0.5 bg-accent-gradient" />
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-text mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold bg-accent-gradient bg-clip-text text-transparent mb-1">
                  {plan.price}
                </div>
                <span className="text-xs text-text-muted">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-success">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={plan.href}>
                <Button
                  variant={plan.highlighted ? 'primary' : 'secondary'}
                  fullWidth
                >
                  {plan.cta}
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        {/* Cost Examples */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-text text-center mb-6">مثال‌های واقعی هزینه</h2>
          <Card padding="sm">
            <div className="divide-y divide-border">
              {examples.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm text-text-secondary">{e.task}</span>
                  <span className="text-xs text-text-muted font-mono">{e.model}</span>
                  <span className="text-sm font-bold text-success">{e.cost}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/app">
            <Button size="lg">شروع رایگان</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
