import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/SiteLayout';

const plans = [
  { name: 'رایگان', price: '۰', period: 'برای همیشه', features: ['مدل‌های سبک', '۵۰,۰۰۰ توکن روزانه', 'چت متنی', 'پشتیبانی فارسی'], cta: 'شروع رایگان', href: '/app', highlighted: false },
  { name: 'پیش‌پرداخت', price: 'دلخواه', period: 'اعتبار بدون انقضا', features: ['همه مدل‌ها', 'پرداخت به ازای مصرف', 'کنترل سقف هزینه', 'API Key شخصی', 'تاریخچه مصرف', 'پشتیبانی ویژه'], cta: 'شروع کنید', href: '/app', highlighted: true },
];

const examples = [
  { task: 'یک سوال ساده', model: 'Haiku 4.5', cost: '~۵۰ تومان' },
  { task: 'تحلیل یک صفحه متن', model: 'GPT-4o Mini', cost: '~۲۰۰ تومان' },
  { task: 'کدنویسی یک تابع', model: 'DeepSeek 3.2', cost: '~۴۰۰ تومان' },
  { task: 'گزارش ۵ صفحه‌ای', model: 'GPT-4o', cost: '~۱,۵۰۰ تومان' },
];

export default function PricingPage() {
  return (
    <div style={{ background: '#09090b', color: '#fafafa', fontFamily: 'Vazirmatn, system-ui, sans-serif', minHeight: '100vh' }}>
      <SiteHeader />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '100px 24px 60px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>قیمت‌گذاری شفاف</h1>
        <p style={{ textAlign: 'center', color: '#a1a1aa', fontSize: 16, marginBottom: 48 }}>فقط برای چیزی که مصرف می‌کنید هزینه پرداخت کنید. بدون هزینه پنهان.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 60 }}>
          {plans.map(p => (
            <div key={p.name} style={{
              background: p.highlighted ? 'rgba(139,92,246,0.08)' : 'rgba(24,24,27,0.8)',
              border: p.highlighted ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20, padding: 32, textAlign: 'center'
            }}>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{p.name}</h3>
              <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{p.price}</div>
              <div style={{ color: '#71717a', fontSize: 13, marginBottom: 24 }}>{p.period}</div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 28 }}>
                {p.features.map(f => <li key={f} style={{ padding: '8px 0', color: '#a1a1aa', fontSize: 14 }}>✓ {f}</li>)}
              </ul>
              <Link href={p.href} style={{ display: 'block', padding: '12px 24px', borderRadius: 12, background: p.highlighted ? 'linear-gradient(135deg,#8b5cf6,#06b6d4)' : 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>{p.cta}</Link>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 24 }}>مثال‌های واقعی هزینه</h2>
        <div style={{ maxWidth: 500, margin: '0 auto', background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
          {examples.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < examples.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', fontSize: 14 }}>
              <span style={{ color: '#a1a1aa' }}>{e.task}</span>
              <span style={{ color: '#71717a', fontSize: 12 }}>{e.model}</span>
              <span style={{ fontWeight: 700, color: '#22c55e' }}>{e.cost}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link href="/app" style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>شروع رایگان</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}