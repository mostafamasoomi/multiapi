import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/SiteLayout';

const models = [
  { alias: 'gpt-4o', name: 'GPT-4o', tier: 'pro', desc: 'بهترین مدل برای کارهای پیچیده، کدنویسی و تحلیل', input: 18000, output: 62000, ctx: 128000 },
  { alias: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', tier: 'pro', desc: 'استدلال قوی، نوشتن خلاقانه و تحلیل عمیق', input: 22000, output: 78000, ctx: 200000 },
  { alias: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', tier: 'mini', desc: 'سریع، ارزان و عالی برای کارهای روزمره', input: 1800, output: 7200, ctx: 200000 },
  { alias: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'mini', desc: 'مدل سبک و سریع برای مکالمات ساده', input: 1400, output: 5600, ctx: 128000 },
  { alias: 'deepseek-3.2', name: 'DeepSeek 3.2', tier: 'standard', desc: 'تعادل عالی بین قیمت و کیفیت، کدنویسی قوی', input: 3500, output: 14000, ctx: 128000 },
  { alias: 'qwen3-coder-next', name: 'Qwen3 Coder', tier: 'standard', desc: 'متخصص کدنویسی با پشتیبانی از زبان‌های مختلف', input: 3000, output: 12000, ctx: 128000 },
];

const tierColors: Record<string, string> = { pro: '#8b5cf6', standard: '#06b6d4', mini: '#22c55e' };
const tierLabels: Record<string, string> = { pro: 'حرفه‌ای', standard: 'استاندارد', mini: 'سبک' };

export default function ModelsPage() {
  return (
    <div style={{ background: '#09090b', color: '#fafafa', fontFamily: 'Vazirmatn, system-ui, sans-serif', minHeight: '100vh' }}>
      <SiteHeader />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px 60px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>مدل‌های هوش مصنوعی</h1>
        <p style={{ textAlign: 'center', color: '#a1a1aa', fontSize: 16, marginBottom: 48 }}>از بین بهترین مدل‌های دنیا انتخاب کنید. همه با یک حساب و یک API Key.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {models.map(m => (
            <div key={m.alias} style={{
              background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, padding: 24, transition: 'all .2s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: tierColors[m.tier], boxShadow: `0 0 10px ${tierColors[m.tier]}` }} />
                <span style={{ fontWeight: 700, fontSize: 18 }}>{m.name}</span>
                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: `${tierColors[m.tier]}22`, color: tierColors[m.tier], fontWeight: 700, marginRight: 'auto' }}>{tierLabels[m.tier]}</span>
              </div>
              <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 16, lineHeight: 1.8 }}>{m.desc}</p>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#71717a', marginBottom: 16 }}>
                <span>ورودی: {m.input.toLocaleString('fa-IR')} ریال / 1M توکن</span>
                <span>خروجی: {m.output.toLocaleString('fa-IR')} ریال / 1M توکن</span>
              </div>
              <div style={{ fontSize: 11, color: '#52525b' }}>پنجره متن: {m.ctx.toLocaleString('fa-IR')} توکن</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link href="/app" style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>شروع چت با مدل‌ها</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}