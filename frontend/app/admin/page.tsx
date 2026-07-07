'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = '/admin';

type Model = {
  alias: string; tier: string; active: boolean; auto_disabled: boolean;
  free_tier_eligible: boolean; up_in: number; up_out: number;
  in_margin: number; out_margin: number; max_tokens_cap: number;
};

export default function AdminDashboard() {
  const [models, setModels] = useState<Model[]>([]);
  const [userId, setUserId] = useState('1');
  const [usage, setUsage] = useState<any>(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await axios.get(`${API}/models`);
    setModels(r.data);
  }
  useEffect(() => { load(); }, []);

  async function saveMargin(m: Model) {
    await axios.post(`${API}/models/margin`, {
      alias: m.alias, input_margin_factor: m.in_margin, output_margin_factor: m.out_margin,
    });
    setMsg(`✅ margin ${m.alias} ذخیره شد`);
    load();
  }
  async function toggle(m: Model) {
    await axios.post(`${API}/models/${m.alias}/toggle`);
    setMsg(`🔄 ${m.alias} تغییر وضعیت داد`);
    load();
  }
  async function viewUsage() {
    const r = await axios.get(`${API}/users/${userId}/usage`);
    setUsage(r.data);
  }

  return (
    <div className="container">
      <h1>پنل ادمین — multiai2</h1>
      {msg && <div className="card" style={{ color: '#6ee7a0' }}>{msg}</div>}

      <div className="card">
        <h3>📊 مانیتورینگ توکن کاربر</h3>
        <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="user_id" />
        <button onClick={viewUsage} style={{ marginRight: 8 }}>مشاهده مصرف</button>
        {usage && (
          <div style={{ marginTop: 12 }}>
            <p>موجودی کیف پول: <b>{usage.balance_irr.toLocaleString()} ریال</b></p>
            <p className="muted">مصرف توکن بر اساس مدل:</p>
            <pre>{JSON.stringify(usage.token_usage_by_model, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="card">
        <h3>💰 مدیریت قیمت‌گذاری (مشتق از نرخ ارز)</h3>
        <p className="muted">فرمول: قیمت فروش = هزینه بالادستی × نرخ ارز × بافر × ضریب حاشیه</p>
        <table>
          <thead>
            <tr><th>مدل</th><th>وضعیت</th><th>free</th><th>حاشیه ورودی</th><th>حاشیه خروجی</th><th>max_tokens</th><th></th></tr>
          </thead>
          <tbody>
            {models.map(m => (
              <tr key={m.alias}>
                <td>{m.alias}</td>
                <td><span className={`badge ${m.active ? 'on' : 'off'}`}>{m.active ? 'فعال' : 'غیرفعال'}</span></td>
                <td>{m.free_tier_eligible ? '✅' : '❌'}</td>
                <td><input type="number" step="0.1" value={m.in_margin}
                      onChange={e => setModels(models.map(x => x.alias === m.alias ? { ...x, in_margin: +e.target.value } : x))} /></td>
                <td><input type="number" step="0.1" value={m.out_margin}
                      onChange={e => setModels(models.map(x => x.alias === m.alias ? { ...x, out_margin: +e.target.value } : x))} /></td>
                <td>{m.max_tokens_cap}</td>
                <td>
                  <button onClick={() => saveMargin(m)}>ذخیره</button>{' '}
                  <button onClick={() => toggle(m)} style={{ background: '#5a2226' }}>toggle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
