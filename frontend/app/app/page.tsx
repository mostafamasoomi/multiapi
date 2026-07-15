'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AuthPanel } from '../components/AuthPanel';
import { ModelSidebar } from '../components/ModelSidebar';
import { ChatStream, Msg } from '../components/ChatStream';
import { ChatComposer } from '../components/ChatComposer';
import { WalletDisplay } from '../components/WalletDisplay';
import { SettingsPanel } from '../components/SettingsPanel';
import { Toast } from '../components/Toast';
import { ConversationList, Conversation, Message } from '../components/ConversationList';
import { UsagePill } from '../components/UsagePill';
import { NotificationBell } from '../components/NotificationBell';

// ── Server-side conversation sync ──────────────────────────────────────────────
async function fetchConversations(token: string): Promise<ConversationData[]> {
  try {
    const res = await fetch('/api/conversations', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((c: any) => ({
      id: String(c.id),
      title: c.title,
      model: c.model,
      messages: c.messages || [],
      createdAt: new Date(c.updated_at || c.created_at).getTime(),
      serverSynced: true,
    }));
  } catch { return []; }
}

async function saveConversation(token: string, conv: ConversationData) {
  try {
    const method = conv.serverSynced ? 'PUT' : 'POST';
    const url = conv.serverSynced ? `/api/conversations/${conv.id}` : '/api/conversations';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: conv.title, model: conv.model, messages: conv.messages }),
    });
    if (res.ok && method === 'POST') {
      const data = await res.json();
      return String(data.id);
    }
  } catch {}
  return null;
}

async function deleteConversationServer(token: string, id: string) {
  try { await fetch(`/api/conversations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); } catch {}
}


type Model = { alias: string; tier: string; active: boolean; auto_disabled: boolean; context_window?: number };

type ConversationData = {
  id: string;
  title: string;
  model: string;
  messages: Msg[];
  createdAt: number;
  serverSynced?: boolean;
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadConversations(): ConversationData[] {
  try {
    const raw = localStorage.getItem('conversations');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(list: ConversationData[]) {
  localStorage.setItem('conversations', JSON.stringify(list));
}

export default function AppPage() {
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletRefresh, setWalletRefresh] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [convListOpen, setConvListOpen] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  useEffect(() => {
    setConversations(loadConversations());
  }, []);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (activeConvId) {
      const conv = conversations.find(c => c.id === activeConvId);
      if (conv) {
        setMessages(conv.messages);
        setSelected(conv.model);
        setChatCount(conv.messages.length > 0 ? 1 : 0);
      }
    }
  }, [activeConvId]);

  useEffect(() => {
    const existing = localStorage.getItem('api_key');
    if (existing) {
      fetch('/api/me', {
        headers: { Authorization: `Bearer ${existing}` },
      })
        .then(r => {
          if (!r.ok) throw new Error('token_invalid');
          return r.json();
        })
        .then(async () => {
          setApiKey(existing);
          // Load server conversations
          const serverConvs = await fetchConversations(existing);
          if (serverConvs.length > 0) {
            setConversations(serverConvs);
          }
        })
        .catch(() => {
          localStorage.removeItem('api_key');
          localStorage.removeItem('user_id');
          setApiKey('');
        });
    }
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    fetch('/api/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then(r => r.json())
      .then((data: Model[]) => {
        const list = (data || []).filter(m => m.active && !m.auto_disabled);
        setModels(data || []);
        if (list.length && !selected) setSelected(list[0].alias);
      })
      .catch(() => {
        setErr('خطا در بارگذاری مدلها');
        setShowToast(true);
      });
  }, [apiKey]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        if (mobileOpen) setMobileOpen(false);
        if (convListOpen) setConvListOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSettings, mobileOpen, convListOpen]);

  function handleAuth(key: string) { setApiKey(key); }

  function createNewConversation() {
    const id = generateId();
    const newConv: ConversationData = {
      id,
      title: 'چت جدید',
      model: selected,
      messages: [],
      createdAt: Date.now(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(id);
    setMessages([]);
    setChatCount(0);
  }

  function deleteConversation(id: string) {
    if (apiKey) deleteConversationServer(apiKey, id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
      setChatCount(0);
    }
  }

  function updateActiveConvMessages(msgs: Msg[]) {
    if (!activeConvId) return;
    setConversations(prev =>
      prev.map(c =>
        c.id === activeConvId
          ? {
              ...c,
              messages: msgs,
              title: c.title === 'چت جدید'
                ? (msgs.find(m => m.role === 'user')?.content.slice(0, 30) || c.title)
                : c.title,
            }
          : c
      )
    );
  }

  const handleRetry = useCallback((messageId: string) => {
    const msgIndex = parseInt(messageId, 10);
    if (isNaN(msgIndex)) return;
    if (!apiKey || !selected || streaming) return;
    const newMessages = messages.slice(0, msgIndex);
    setMessages(newMessages);
    updateActiveConvMessages(newMessages);

    const lastUserMsg = newMessages[newMessages.length - 1];
    if (!lastUserMsg || lastUserMsg.role !== 'user') return;

    setStreaming(true);
    setErr('');
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      let acc = '';
      let buf = '';
      try {
        const res = await fetch('/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selected,
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            max_tokens: 2048,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({ error: 'unknown' }));
          throw new Error(e.error || 'HTTP ' + res.status);
        }
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        const withAssistant = [...newMessages, { role: 'assistant' as const, content: '' }];
        setMessages(withAssistant);
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
            } catch (e: any) { if (e.message) throw e; }
          }
        }
        const finalMessages = [...newMessages, { role: 'assistant' as const, content: acc }];
        setMessages(finalMessages);
        updateActiveConvMessages(finalMessages);
        setWalletRefresh(r => r + 1);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setErr(e.message || 'خطا در ارتباط');
          setShowToast(true);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    })();
  }, [apiKey, selected, streaming, messages, activeConvId]);

  function handlePreset(prompt: string) {
    setQuery(prompt + ' ');
  }

  function handleRegenerate() {
    if (!apiKey || !selected || streaming) return;
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = messages.length - 1 - lastUserIdx;
    const newMessages = messages.slice(0, actualIdx + 1);
    setMessages(newMessages);
    updateActiveConvMessages(newMessages);
    const lastUserMsg = newMessages[newMessages.length - 1];
    if (!lastUserMsg || lastUserMsg.role !== 'user') return;
    send(lastUserMsg.content);
  }

  const send = useCallback(async (text: string) => {
    if (!text || !selected || streaming || !apiKey) return;
    setStreaming(true);
    setErr('');

    let convId = activeConvId;
    if (!convId) {
      convId = generateId();
      const newConv: ConversationData = {
        id: convId,
        title: text.slice(0, 30),
        model: selected,
        messages: [],
        createdAt: Date.now(),
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(convId);
    }

    const userMsg: Msg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? {
              ...c,
              model: selected,
              title: c.title === 'چت جدید' ? text.slice(0, 30) : c.title,
              messages: newMessages,
            }
          : c
      )
    );

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = '';
    let buf = '';
    try {
      const res = await fetch('/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selected,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'unknown' }));
        throw new Error(e.error || 'HTTP ' + res.status);
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      const withAssistant = [...newMessages, { role: 'assistant' as const, content: '' }];
      setMessages(withAssistant);
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
          } catch (e: any) { if (e.message) throw e; }
        }
      }
      const finalMessages = [...newMessages, { role: 'assistant' as const, content: acc }];
      setMessages(finalMessages);
      setConversations(prev =>
        prev.map(c =>
          c.id === convId ? { ...c, messages: finalMessages } : c
        )
      );
      setChatCount(c => c + 1);
      setWalletRefresh(r => r + 1);
      // Server sync
      if (apiKey && convId) {
        const conv = conversations.find(c => c.id === convId) || { id: convId, title: text.slice(0, 30), model: selected, messages: newMessages, createdAt: Date.now(), serverSynced: false };
        conv.messages = finalMessages;
        const serverId = await saveConversation(apiKey, conv);
        if (serverId && !conv.serverSynced) {
          setConversations(prev => prev.map(c => c.id === convId ? { ...c, id: serverId, serverSynced: true } : c));
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setErr(e.message || 'خطا در ارتباط');
        setShowToast(true);
        if (acc) {
          const incomplete = [...newMessages, { role: 'assistant' as const, content: acc }];
          setMessages(incomplete);
          setConversations(prev =>
            prev.map(c =>
              c.id === convId ? { ...c, messages: incomplete } : c
            )
          );
        }
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [selected, streaming, apiKey, messages, activeConvId]);

  function handleCancel() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, content: last.content + '\n\n[لغو شد]' };
        updateActiveConvMessages(updated);
        return updated;
      }
      return prev;
    });
    setStreaming(false);
  }

  function handleSelectConversation(id: string) {
    setActiveConvId(id);
    setConvListOpen(false);
  }

  function newChat() {
    setActiveConvId(null);
    setMessages([]);
    setChatCount(0);
  }

  function logout() {
    localStorage.removeItem('api_key');
    localStorage.removeItem('user_id');
    setApiKey(''); setModels([]); setSelected(''); setMessages([]); setChatCount(0);
    setActiveConvId(null);
  }

  if (!apiKey) {
    return (
      <>
        <AuthPanel onAuth={handleAuth} />
        <Toast message={err} show={showToast} onClose={() => setShowToast(false)} />
      </>
    );
  }

  const conversationList: Conversation[] = conversations.map(c => ({
    id: c.id,
    title: c.title,
    date: new Date(c.createdAt).toISOString(),
    model: c.model,
    messages: c.messages as Message[],
  }));

  return (
    <div className={`app${mobileOpen ? ' mobile-open' : ''}`}>
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
      <ConversationList
        conversations={conversationList}
        activeId={activeConvId}
        onSelect={handleSelectConversation}
        onNewChat={() => { createNewConversation(); setConvListOpen(false); }}
      />
      <ModelSidebar
        models={models}
        selected={selected}
        onSelect={a => { setSelected(a); setMobileOpen(false); }}
        query={query}
        setQuery={setQuery}
        onNewChat={newChat}
      >
        <WalletDisplay apiKey={apiKey} refreshTrigger={walletRefresh} />
      </ModelSidebar>
      <main className="main">
        <div className="topbar">
          <button className="menu-btn" onClick={() => setMobileOpen(o => !o)}>☰</button>
          <button className="conv-toggle" onClick={() => setConvListOpen(o => !o)} title="مکالمات">💬</button>
          <span className="model-name"><span className="model-icon">⚡</span>{selected || 'انتخاب مدل'}</span>
          <div className="topbar-right">
            <span className="status"><span className="pulse" /> آماده</span>
            {chatCount > 0 && <button className="icon-btn" onClick={newChat} title="چت جدید">➕</button>}
            <NotificationBell />
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="تنظیمات">⚙️</button>
            <button className="icon-btn danger" onClick={logout} title="خروج">🚪</button>
          </div>
        </div>
        <div className="stream" ref={streamRef}>
          {messages.length === 0 && !streaming ? (
            <div className="empty-state">
              <div className="big">⚡</div>
              <h2>به multiapi خوش آمدید</h2>
              <p>از منوی سمت راست مدل مورد نظرتان را انتخاب کنید و شروع به چت کنید.</p>
              <div className="features">
                <div className="feature">
                  <div className="icon">🚀</div>
                  <div className="label">سریع و قدرتمند</div>
                  <div className="desc">پاسخهای آنی با بهترین مدلها</div>
                </div>
                <div className="feature">
                  <div className="icon">💰</div>
                  <div className="label">ارزان و منصفانه</div>
                  <div className="desc">پرداخت به ازای مصرف واقعی</div>
                </div>
                <div className="feature">
                  <div className="icon">🔒</div>
                  <div className="label">امن و خصوصی</div>
                  <div className="desc">دادههای شما محافظت میشوند</div>
                </div>
                <div className="feature">
                  <div className="icon">🤖</div>
                  <div className="label">چندین مدل</div>
                  <div className="desc">دسترسی به بهترین مدلهای AI</div>
                </div>
              </div>
            </div>
          ) : (
            <ChatStream
              messages={messages}
              streaming={streaming}
              onCancel={handleCancel}
              onRetry={handleRetry}
              onRegenerate={handleRegenerate}
              onPresetClick={handlePreset}
            />
          )}
        </div>
        <div className="composer">
          <div className="composer-inner" style={{ border: 'none', background: 'transparent', padding: 0 }}>
            <ChatComposer
              onSend={send}
              onCancel={handleCancel}
              streaming={streaming}
              selectedModel={selected}
              onModelChange={setSelected}
              estimatedCost={0}
              models={models.map(m => m.alias)}
            />
          </div>
        </div>
      </main>
      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} apiKey={apiKey} selectedModel={selected} />
      <Toast message={err} show={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
}