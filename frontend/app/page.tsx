'use client';
import { useState } from 'react';
import axios from 'axios';

const API = '/v1';

export default function ChatPage() {
  const [model, setModel] = useState('gc/gemini-2.5-flash');
  const [msgs, setMsgs] = useState<{role:string;content:string}[]>([{role:'user',content:''}]);
  const [input, setInput] = useState('');
  const [out, setOut] = useState('');

  async function send() {
    if (!input.trim()) return;
    const payload = { model, messages: [{ role: 'user', content: input }], max_tokens: 1024, stream: true };
    setOut('');
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value);
      chunk.split('\n').forEach(line => {
        if (line.startsWith('data:') && !line.includes('[DONE]')) {
          try {
            const d = JSON.parse(line.slice(5));
            const c = d.choices?.[0]?.delta?.content || '';
            if (c) setOut(o => o + c);
          } catch {}
        }
      });
    }
    setMsgs([...msgs, {role:'user',content:input},{role:'assistant',content:out}]);
    setInput('');
  }

  return (
    <div className="container">
      <h1>چت با مدل‌ها</h1>
      <div className="card">
        <select value={model} onChange={e => setModel(e.target.value)} style={{ padding: 8, borderRadius: 6, background: '#0f1117', color: '#fff' }}>
          <option>gc/gemini-2.5-flash</option>
          <option>kr/claude-haiku-4.5</option>
          <option>kr/deepseek-3.2</option>
          <option>qd/qmodel_latest</option>
        </select>
        <div style={{ marginTop: 12, minHeight: 120, background: '#0f1117', padding: 12, borderRadius: 8 }}>
          {out || <span className="muted">پاسخ اینجا نمایش داده میشه…</span>}
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="پیام خود را بنویسید…"
          style={{ width: '100%', marginTop: 12, minHeight: 60, background: '#0f1117', color: '#fff', border: '1px solid #2a2e3a', borderRadius: 6 }} />
        <button onClick={send} style={{ marginTop: 8 }}>ارسال</button>
      </div>
    </div>
  );
}
