import type { Metadata } from 'next';
import CodeBlock from './CodeBlock';

export const metadata: Metadata = {
  title: 'مستندات توسعه‌دهندگان — MultiAPI',
  description: 'راهنمای کامل API، نمونه کدها، کدهای خطا و مرجع مدل‌ها',
};

const sidebarSections = [
  { id: 'quickstart', label: 'شروع سریع' },
  { id: 'auth', label: 'احراز هویت' },
  { id: 'chat', label: 'Chat Completions' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'errors', label: 'کدهای خطا' },
  { id: 'rate-limits', label: 'محدودیت نرخ' },
  { id: 'models', label: 'مرجع مدل‌ها' },
];

const curlQuickstart = `curl https://api.multiapi.ir/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "سلام! چطوری؟"}
    ]
  }'`;

const pythonQuickstart = `import requests

response = requests.post(
    "https://api.multiapi.ir/v1/chat/completions",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "model": "gpt-4o",
        "messages": [
            {"role": "user", "content": "سلام! چطوری؟"}
        ]
    }
)

print(response.json()["choices"][0]["message"]["content"])`;

const jsQuickstart = `const response = await fetch("https://api.multiapi.ir/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-4o",
    messages: [
      { role: "user", content: "سلام! چطوری؟" }
    ]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`;

const authExample = `# همیشه API Key خود را در هدر Authorization قرار دهید
Authorization: Bearer YOUR_API_KEY`;

const chatRequestBody = `{
  "model": "gpt-4o",              // شناسه مدل (الزامی)
  "messages": [                    // آرایه پیام‌ها (الزامی)
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": false,                 // فعال‌سازی streaming (اختیاری)
  "max_tokens": 1024,              // حداکثر توکن خروجی (اختیاری)
  "temperature": 0.7,              // دمای خروجی ۰ تا ۲ (اختیاری)
  "top_p": 1                       // nucleus sampling (اختیاری)
}`;

const chatResponseExample = `{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1720000000,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "سلام! خوبم، مرسی. تو چطوری؟"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 12,
    "total_tokens": 27
  }
}`;

const pythonStreaming = `import requests

response = requests.post(
    "https://api.multiapi.ir/v1/chat/completions",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "model": "gpt-4o",
        "messages": [
            {"role": "user", "content": "یک داستان کوتاه بنویس"}
        ],
        "stream": True
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        line = line.decode("utf-8")
        if line.startswith("data: "):
            data = line[6:]
            if data == "[DONE]":
                break
            import json
            chunk = json.loads(data)
            if chunk["choices"][0].get("delta", {}).get("content"):
                print(chunk["choices"][0]["delta"]["content"], end="", flush=True)`;

const jsStreaming = `const response = await fetch("https://api.multiapi.ir/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-4o",
    messages: [{ role: "user", content: "یک داستان کوتاه بنویس" }],
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") break;
      const chunk = JSON.parse(data);
      const content = chunk.choices[0]?.delta?.content;
      if (content) process.stdout.write(content);
    }
  }
}`;

const errorCodes = [
  { code: '400', message: 'Bad Request', desc: 'درخواست نامعتبر — پارامترها را بررسی کنید', fa: 'درخواست نامعتبر' },
  { code: '401', message: 'Unauthorized', desc: 'API Key نامعتبر یا منقضی شده', fa: 'عدم احراز هویت' },
  { code: '402', message: 'Payment Required', desc: 'اعتبار کیف پول کافی نیست', fa: 'نیاز به شارژ حساب' },
  { code: '429', message: 'Too Many Requests', desc: 'تعداد درخواست‌ها از حد مجاز فراتر رفته', fa: 'تعداد درخواست زیاد' },
  { code: '500', message: 'Internal Server Error', desc: 'خطای سرور — تیم فنی در حال بررسی است', fa: 'خطای سرور' },
  { code: '503', message: 'Service Unavailable', desc: 'سرویس موقتاً در دسترس نیست', fa: 'سرویس در دسترس نیست' },
];

const models = [
  { alias: 'gpt-4o', name: 'GPT-4o', tier: 'pro', input: '۱۸,۰۰۰', output: '۶۲,۰۰۰', ctx: '۱۲۸,۰۰۰', desc: 'بهترین مدل برای کارهای پیچیده، کدنویسی و تحلیل' },
  { alias: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'mini', input: '۱,۴۰۰', output: '۵,۶۰۰', ctx: '۱۲۸,۰۰۰', desc: 'مدل سبک و سریع برای مکالمات ساده' },
  { alias: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', tier: 'pro', input: '۲۲,۰۰۰', output: '۷۸,۰۰۰', ctx: '۲۰۰,۰۰۰', desc: 'استدلال قوی، نوشتن خلاقانه و تحلیل عمیق' },
  { alias: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', tier: 'mini', input: '۱,۸۰۰', output: '۷,۲۰۰', ctx: '۲۰۰,۰۰۰', desc: 'سریع، ارزان و عالی برای کارهای روزمره' },
  { alias: 'deepseek-3.2', name: 'DeepSeek 3.2', tier: 'standard', input: '۳,۵۰۰', output: '۱۴,۰۰۰', ctx: '۱۲۸,۰۰۰', desc: 'تعادل عالی بین قیمت و کیفیت، کدنویسی قوی' },
  { alias: 'qwen3-coder-next', name: 'Qwen3 Coder', tier: 'standard', input: '۳,۰۰۰', output: '۱۲,۰۰۰', ctx: '۱۲۸,۰۰۰', desc: 'متخصص کدنویسی با پشتیبانی از زبان‌های مختلف' },
];

const tierColors: Record<string, string> = { pro: '#8b5cf6', standard: '#06b6d4', mini: '#22c55e' };
const tierLabels: Record<string, string> = { pro: 'حرفه‌ای', standard: 'استاندارد', mini: 'سبک' };

export default function DocsPage() {
  return (
    <div style={{ background: '#09090b', color: '#fafafa', fontFamily: 'Vazirmatn, system-ui, sans-serif', minHeight: '100vh' }}>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px 60px', display: 'flex', gap: 40 }}>

        {/* Sidebar */}
        <aside style={{
          width: 220, flexShrink: 0, position: 'sticky', top: 100, alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 140px)', overflowY: 'auto',
        }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#71717a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
              مستندات API
            </h3>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sidebarSections.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={{
                    display: 'block', padding: '8px 12px', borderRadius: 8,
                    color: '#a1a1aa', fontSize: 13, textDecoration: 'none',
                    transition: 'all 0.15s',
                    borderRight: '2px solid transparent',
                  }}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Page Header */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>مستندات توسعه‌دهندگان</h1>
            <p style={{ color: '#a1a1aa', fontSize: 16, lineHeight: 1.8 }}>
              API ما کاملاً با OpenAI سازگار است. کافیست endpoint و API Key را تغییر دهید.
              همه درخواست‌ها از طریق HTTPS ارسال می‌شوند و پاسخ‌ها با فرمت JSON برمی‌گردند.
            </p>
          </div>

          {/* Quickstart */}
          <section id="quickstart" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              🚀 شروع سریع
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24, lineHeight: 1.8 }}>
              اولین درخواست خود را در کمتر از ۳۰ ثانیه ارسال کنید. کافیست API Key خود را از{' '}
              <a href="/app" style={{ color: '#8b5cf6' }}>پنل کاربری</a> دریافت کنید.
            </p>

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#e4e4e7' }}>cURL</h3>
            <CodeBlock code={curlQuickstart} language="cURL" />

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#e4e4e7' }}>Python</h3>
            <CodeBlock code={pythonQuickstart} language="Python" />

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#e4e4e7' }}>JavaScript (Node.js / Browser)</h3>
            <CodeBlock code={jsQuickstart} language="JavaScript" />
          </section>

          {/* Authentication */}
          <section id="auth" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              🔐 احراز هویت
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 16, lineHeight: 1.8 }}>
              تمام درخواست‌ها باید شامل هدر <code style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', padding: '2px 8px', borderRadius: 4, fontSize: 13, direction: 'ltr', display: 'inline-block' }}>Authorization: Bearer YOUR_API_KEY</code> باشند.
              API Key خود را از{' '}
              <a href="/app" style={{ color: '#8b5cf6' }}>پنل کاربری</a> دریافت کنید.
            </p>

            <CodeBlock code={authExample} language="HTTP Header" />

            <div style={{
              background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',
              borderRadius: 12, padding: 16, marginTop: 16,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div style={{ fontSize: 13, color: '#fbbf24', lineHeight: 1.8 }}>
                  <strong>نکته امنیتی:</strong> هرگز API Key خود را در کدهای client-side یا مخازن عمومی (Git) قرار ندهید.
                  همیشه آن را در متغیرهای محیطی (<code style={{ background: 'rgba(251,191,36,0.15)', padding: '2px 6px', borderRadius: 3 }}>process.env</code>) ذخیره کنید.
                </div>
              </div>
            </div>
          </section>

          {/* Chat Completions */}
          <section id="chat" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              💬 Chat Completions
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24, lineHeight: 1.8 }}>
              endpoint اصلی برای مکالمه با مدل‌های هوش مصنوعی. فرمت درخواست و پاسخ کاملاً با OpenAI سازگار است.
            </p>

            <div style={{
              background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
              borderRadius: 12, padding: 16, marginBottom: 24,
              direction: 'ltr', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                <span style={{
                  background: '#22c55e', color: '#fff', padding: '2px 10px', borderRadius: 6,
                  fontSize: 12, fontWeight: 700,
                }}>POST</span>
                <code style={{ color: '#e4e4e7', fontSize: 15, fontFamily: 'monospace' }}>
                  /v1/chat/completions
                </code>
              </div>
              <div style={{ color: '#71717a', fontSize: 13, fontFamily: 'monospace', direction: 'ltr' }}>
                https://api.multiapi.ir/v1/chat/completions
              </div>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#e4e4e7' }}>بدنه درخواست</h3>
            <CodeBlock code={chatRequestBody} language="JSON" />

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 28, color: '#e4e4e7' }}>پاسخ نمونه</h3>
            <CodeBlock code={chatResponseExample} language="JSON" />

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 28, color: '#e4e4e7' }}>پارامترها</h3>
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>پارامتر</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>نوع</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>الزامی</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>توضیح</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { param: 'model', type: 'string', required: '✅', desc: 'شناسه مدل (مثلاً gpt-4o)' },
                    { param: 'messages', type: 'array', required: '✅', desc: 'آرایه پیام‌ها با نقش‌های system, user, assistant' },
                    { param: 'stream', type: 'boolean', required: '❌', desc: 'فعال‌سازی streaming (پیش‌فرض: false)' },
                    { param: 'max_tokens', type: 'integer', required: '❌', desc: 'حداکثر توکن خروجی' },
                    { param: 'temperature', type: 'number', required: '❌', desc: 'دمای خروجی بین ۰ تا ۲ (پیش‌فرض: ۱)' },
                    { param: 'top_p', type: 'number', required: '❌', desc: 'nucleus sampling (پیش‌فرض: ۱)' },
                  ].map((row, i) => (
                    <tr key={row.param} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                    }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', direction: 'ltr', textAlign: 'left', color: '#c4b5fd' }}>{row.param}</td>
                      <td style={{ padding: '10px 16px', color: '#a1a1aa', direction: 'ltr', textAlign: 'left' }}>{row.type}</td>
                      <td style={{ padding: '10px 16px' }}>{row.required}</td>
                      <td style={{ padding: '10px 16px', color: '#a1a1aa' }}>{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Streaming */}
          <section id="streaming" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              ⚡ Streaming
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24, lineHeight: 1.8 }}>
              با تنظیم <code style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', padding: '2px 8px', borderRadius: 4, fontSize: 13, direction: 'ltr', display: 'inline-block' }}>stream: true</code>{' '}
              پاسخ‌ها به صورت تکه‌تکه (chunk) با فرمت{' '}
              <span style={{ direction: 'ltr', display: 'inline-block', fontFamily: 'monospace', color: '#e4e4e7' }}>text/event-stream</span> (SSE) ارسال می‌شوند.
              هر chunk با <code style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', padding: '2px 8px', borderRadius: 4, fontSize: 13, direction: 'ltr', display: 'inline-block' }}>data: </code> شروع می‌شود
              و پایان stream با <code style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', padding: '2px 8px', borderRadius: 4, fontSize: 13, direction: 'ltr', display: 'inline-block' }}>[DONE]</code> مشخص می‌شود.
            </p>

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#e4e4e7' }}>Python (Streaming)</h3>
            <CodeBlock code={pythonStreaming} language="Python" />

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 12, color: '#e4e4e7' }}>JavaScript (Streaming)</h3>
            <CodeBlock code={jsStreaming} language="JavaScript" />
          </section>

          {/* Error Codes */}
          <section id="errors" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              ❌ کدهای خطا
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24, lineHeight: 1.8 }}>
              API از کدهای وضعیت استاندارد HTTP استفاده می‌کند. در صورت خطا، پاسخ شامل یک شی JSON با فیلد <code style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', padding: '2px 8px', borderRadius: 4, fontSize: 13, direction: 'ltr', display: 'inline-block' }}>error</code> خواهد بود.
            </p>

            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>کد</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>نام</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>توضیح</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>راه‌حل</th>
                  </tr>
                </thead>
                <tbody>
                  {errorCodes.map((err, i) => (
                    <tr key={err.code} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                    }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: err.code === '401' ? 'rgba(239,68,68,0.15)' : err.code === '429' ? 'rgba(234,179,8,0.15)' : err.code === '500' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                          color: err.code === '401' ? '#ef4444' : err.code === '429' ? '#fbbf24' : err.code === '500' ? '#ef4444' : '#a1a1aa',
                          padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12, fontFamily: 'monospace',
                        }}>
                          {err.code}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#e4e4e7', fontWeight: 600, direction: 'ltr', textAlign: 'left' }}>{err.message}</td>
                      <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>{err.desc}</td>
                      <td style={{ padding: '12px 16px', color: '#a1a1aa', fontSize: 12 }}>
                        {err.code === '401' && 'API Key را بررسی و در صورت نیاز مجدداً تولید کنید'}
                        {err.code === '429' && 'چند ثانیه صبر کنید و دوباره تلاش کنید'}
                        {err.code === '500' && 'دوباره تلاش کنید یا با پشتیبانی تماس بگیرید'}
                        {err.code === '400' && 'پارامترهای درخواست را بررسی کنید'}
                        {err.code === '402' && 'کیف پول خود را شارژ کنید'}
                        {err.code === '503' && 'چند دقیقه صبر کنید و دوباره تلاش کنید'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Rate Limits */}
          <section id="rate-limits" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              🚦 محدودیت نرخ (Rate Limits)
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24, lineHeight: 1.8 }}>
              برای حفظ پایداری سرویس، محدودیت‌هایی روی تعداد درخواست‌ها اعمال می‌شود.
              در صورت عبور از محدودیت، خطای <code style={{ background: 'rgba(234,179,8,0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: 4, fontSize: 13, direction: 'ltr', display: 'inline-block' }}>429 Too Many Requests</code> دریافت خواهید کرد.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'پلن رایگان', rpm: '۱۰', tpm: '۵۰,۰۰۰', color: '#22c55e' },
                { label: 'پلن پیش‌پرداخت', rpm: '۶۰', tpm: '۲۰۰,۰۰۰', color: '#8b5cf6' },
              ].map(p => (
                <div key={p.label} style={{
                  background: 'rgba(24,24,27,0.8)', border: `1px solid ${p.color}22`,
                  borderRadius: 14, padding: 20,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: p.color }}>{p.label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#71717a' }}>درخواست در دقیقه</span>
                      <span style={{ fontWeight: 700, direction: 'ltr' }}>{p.rpm}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#71717a' }}>توکن در دقیقه</span>
                      <span style={{ fontWeight: 700, direction: 'ltr' }}>{p.tpm}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)',
              borderRadius: 12, padding: 16, fontSize: 13, color: '#67e8f9', lineHeight: 1.8,
            }}>
              💡 <strong>توصیه:</strong> برای مدیریت بهتر، از{' '}
              <span style={{ direction: 'ltr', display: 'inline-block', fontFamily: 'monospace' }}>exponential backoff</span> استفاده کنید
              و هدرهای <code style={{ background: 'rgba(6,182,212,0.15)', padding: '2px 6px', borderRadius: 3 }}>X-RateLimit-*</code> را در پاسخ‌ها بررسی کنید.
            </div>
          </section>

          {/* Models Reference */}
          <section id="models" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              📚 مرجع مدل‌ها
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24, lineHeight: 1.8 }}>
              لیست کامل مدل‌های در دسترس. برای دریافت لیست به‌روز مدل‌ها از{' '}
              <code style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', padding: '2px 8px', borderRadius: 4, fontSize: 13, direction: 'ltr', display: 'inline-block' }}>GET /v1/models</code> استفاده کنید.
            </p>

            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>شناسه مدل</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>نام</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>سطح</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>پنجره متن</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>قیمت ورودی (ریال/1M)</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600, fontSize: 12 }}>قیمت خروجی (ریال/1M)</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m, i) => (
                    <tr key={m.alias} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                    }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', direction: 'ltr', textAlign: 'left', color: '#c4b5fd' }}>{m.alias}</td>
                      <td style={{ padding: '12px 16px', color: '#e4e4e7', fontWeight: 600 }}>{m.name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: `${tierColors[m.tier]}22`, color: tierColors[m.tier],
                          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        }}>
                          {tierLabels[m.tier]}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#a1a1aa', direction: 'ltr', textAlign: 'left' }}>{m.ctx}</td>
                      <td style={{ padding: '12px 16px', color: '#a1a1aa', direction: 'ltr', textAlign: 'left' }}>{m.input}</td>
                      <td style={{ padding: '12px 16px', color: '#a1a1aa', direction: 'ltr', textAlign: 'left' }}>{m.output}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer note */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 32, marginTop: 16,
            textAlign: 'center', color: '#71717a', fontSize: 13, lineHeight: 1.8,
          }}>
            سوالی دارید؟ با{' '}
            <a href="mailto:support@multiapi.ir" style={{ color: '#8b5cf6', textDecoration: 'none' }}>support@multiapi.ir</a> تماس بگیرید
            یا به{' '}
            <a href="/app" style={{ color: '#8b5cf6', textDecoration: 'none' }}>پنل کاربری</a> مراجعه کنید.
          </div>

        </div>
      </main>
    </div>
  );
}