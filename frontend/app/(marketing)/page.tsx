import Link from 'next/link';

const features = [
  { icon: '🤖', title: 'چندین مدل برتر', desc: 'GPT-4o، Claude، DeepSeek و مدل‌های دیگر — همه با یک حساب' },
  { icon: '💳', title: 'پرداخت ریالی', desc: 'کیف پول ریالی، پرداخت به ازای مصرف واقعی، بدون هزینه پنهان' },
  { icon: '🔒', title: 'کنترل کامل هزینه', desc: 'تعیین سقف مصرف روزانه، مشاهده لحظه‌ای مصرف و تاریخچه کامل' },
  { icon: '🇮🇷', title: 'تجربه کاملاً فارسی', desc: 'رابط کاربری راست‌چین، فونت وزیرمتن، پشتیبانی کامل فارسی' },
  { icon: '⚡', title: 'API سازگار با OpenAI', desc: 'توسعه‌دهندگان: یک خط کد تغییر دهید و از MultiAPI استفاده کنید' },
  { icon: '🛡️', title: 'امن و قابل اعتماد', desc: 'پیش‌پرداخت، بدون بدهی. امنیت مالی با کنترل‌های خودکار' },
];

const stats = [
  { value: '۲۰+', label: 'مدل هوش مصنوعی' },
  { value: 'IRR', label: 'پرداخت ریالی' },
  { value: 'API', label: 'سازگار با OpenAI' },
  { value: 'RTL', label: 'فارسی کامل' },
];

export default function Home() {
  return (
    <div style={{ background: '#09090b', color: '#fafafa', fontFamily: 'Vazirmatn, system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* Hero */}
      <section style={{ padding: '140px 24px 80px', textAlign: 'center', maxWidth: 800, margin: '0 auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 60, left: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 100, right: '5%', width: 250, height: 250, background: 'radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 20, position: 'relative' }}>
          هوش مصنوعی برای
          <br />
          <span style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', color: 'transparent' }}>ایران</span>
        </h1>
        <p style={{ fontSize: 18, color: '#a1a1aa', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.8, position: 'relative' }}>
          دسترسی به بهترین مدل‌های هوش مصنوعی دنیا با پرداخت ریالی، کنترل هزینه و تجربه‌ای کاملاً فارسی.
          یک حساب کاربری، یک API Key، چندین مدل.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
          <Link href="/app" style={{ padding: '14px 32px', borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 32px rgba(139,92,246,0.3)' }}>شروع رایگان</Link>
          <Link href="/models" style={{ padding: '14px 32px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', color: '#a1a1aa', fontWeight: 600, fontSize: 16, textDecoration: 'none' }}>مشاهده مدل‌ها</Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ maxWidth: 900, margin: '0 auto 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, padding: '0 24px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{s.value}</div>
            <div style={{ color: '#71717a', fontSize: 13, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1000, margin: '0 auto 80px', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 40 }}>چرا MultiAPI؟</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 1.8 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Developer CTA */}
      <section style={{ maxWidth: 700, margin: '0 auto 80px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 20, padding: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>توسعه‌دهنده هستید؟</h2>
          <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24, lineHeight: 1.8 }}>
            API ما کاملاً با OpenAI سازگار است. کافیست endpoint را تغییر دهید و از همان API Key استفاده کنید.
          </p>
          <div style={{ background: '#0d1117', borderRadius: 12, padding: 20, textAlign: 'left', direction: 'ltr', fontFamily: 'monospace', fontSize: 13, color: '#e6edf3', overflow: 'auto' }}>
            <div style={{ color: '#8b949e' }}># فقط endpoint را عوض کنید</div>
            <div><span style={{ color: '#ff7b72' }}>curl</span> https://api.multiapi.ir/v1/chat/completions \</div>
            <div style={{ paddingLeft: 16 }}>-H <span style={{ color: '#a5d6ff' }}>"Authorization: Bearer YOUR_API_KEY"</span> \</div>
            <div style={{ paddingLeft: 16 }}>-d <span style={{ color: '#a5d6ff' }}>'{"{"}"model": "gpt-4o", "messages":[...]{"}"}'</span></div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ textAlign: 'center', padding: '60px 24px' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>آماده شروع هستید؟</h2>
        <p style={{ color: '#a1a1aa', marginBottom: 28 }}>کمتر از یک دقیقه ثبت‌نام کنید و شروع به چت کنید.</p>
        <Link href="/app" style={{ display: 'inline-block', padding: '16px 40px', borderRadius: 14, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: '#fff', fontWeight: 800, fontSize: 17, textDecoration: 'none', boxShadow: '0 8px 40px rgba(139,92,246,0.35)' }}>شروع رایگان</Link>
      </section>

    </div>
  );
}