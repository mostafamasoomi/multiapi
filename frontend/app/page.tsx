'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AuthPanel } from './components/AuthPanel';
import { ModelSidebar } from './components/ModelSidebar';
import { ChatStream, Msg } from './components/ChatStream';
import { WalletDisplay } from './components/WalletDisplay';
import { SettingsPanel } from './components/SettingsPanel';
import { Toast } from './components/Toast';

type Model = { alias: string; tier: string; active: boolean; auto_disabled: boolean; context_window?: number };

export default function Page() {
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletRefresh, setWalletRefresh] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const streamRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check for existing API key on mount
  useEffect(() => {
    const existing = localStorage.getItem('api_key');
    if (existing) setApiKey(existing);
  }, []);

  // Load models when authenticated
  useEffect(() => {
    if (!apiKey) return;
    fetch('/api/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then(r => r.json())
      .then((data: Model[]) => {
        const list = (data || []).filter(m => m.active && !m.auto_disabled);
        setModels(data || []);
        if (list.length) setSelected(list[0].alias);
      })
      .catch(() => {
        setErr('خطا در بارگذاری مدلها');
        setShowToast(true);
      });
  }, [apiKey]);

  // Auto-scroll
  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(200, textareaRef.current.scrollHeight)}px`;
    }
  }, [input]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        if (mobileOpen) setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSettings, mobileOpen]);

  function handleAuth(key: string) {
    setApiKey(key);
  }

  const send = useCallback(async () => {
    if (!input.trim() || !selected || streaming || !apiKey) return;
    const text = input.trim();
    setInput('');
    setStreaming(true);
    setErr('');
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(m => [...m, userMsg]);

    try {
      const res = await fetch('/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selected,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          max_tokens: 2048,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'unknown' }));
        throw new Error(e.error || 'HTTP ' + res.status);
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let acc = '';
      setMessages(m => [...m, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value);
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const d = JSON.parse(payload);
            if (d.error) throw new Error(d.error);
            const c = d.choices?.[0]?.delta?.content || '';
            if (c) {
              acc += c;
              setMessages(m => {
                const copy = [...m];
                copy[copy.length - 1] = { role: 'assistant', content: acc };
                return copy;
              });
            }
          } catch (e: any) {
            if (e.message) throw e;
          }
        }
      }
      setChatCount(c => c + 1);
      setWalletRefresh(r => r + 1);
    } catch (e: any) {
      setErr(e.message || 'خطا در ارتباط');
      setShowToast(true);
    } finally {
      setStreaming(false);
    }
  }, [input, selected, streaming, apiKey, messages]);

  function logout() {
    localStorage.removeItem('api_key');
    localStorage.removeItem('user_id');
    setApiKey('');
    setModels([]);
    setSelected('');
    setMessages([]);
    setChatCount(0);
  }

  function newChat() {
    setMessages([]);
    setChatCount(0);
  }

  // Auth gate
  if (!apiKey) {
    return (
      <>
        <AuthPanel onAuth={handleAuth} />
        <Toast message={err} show={showToast} onClose={() => setShowToast(false)} />
      </>
    );
  }

  const selectedModel = models.find(m => m.alias === selected);

  return (
    <div className={`app${mobileOpen ? ' mobile-open' : ''}`}>
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

      <ModelSidebar
        models={models}
        selected={selected}
        onSelect={a => { setSelected(a); setMobileOpen(false); }}
        query={query}
        setQuery={setQuery}
      >
        <WalletDisplay apiKey={apiKey} refreshTrigger={walletRefresh} />
      </ModelSidebar>

      <main className="main">
        <div className="topbar">
          <button className="menu-btn" onClick={() => setMobileOpen(o => !o)}>☰</button>
          <span className="model-name">
            <span className="model-icon">⚡</span>
            {selected || 'انتخاب مدل'}
          </span>
          <div className="topbar-right">
            <span className="status">
              <span className="pulse" /> آماده
            </span>
            {chatCount > 0 && (
              <button className="icon-btn" onClick={newChat} title="چت جدید">
                ➕
              </button>
            )}
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="تنظیمات">
              ⚙️
            </button>
            <button className="icon-btn danger" onClick={logout} title="خروج">
              🚪
            </button>
          </div>
        </div>

        <div className="stream" ref={streamRef}>
          <ChatStream messages={messages} streaming={streaming} />
        </div>

        <div className="composer">
          <div className="composer-inner">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="پیام خود را بنویسید... (Enter برای ارسال، Shift+Enter برای خط جدید)"
              rows={1}
            />
            <button className="send-btn" onClick={send} disabled={streaming || !selected || !input.trim()}>
              {streaming ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </main>

      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        apiKey={apiKey}
        selectedModel={selected}
      />

      <Toast message={err} show={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
}
