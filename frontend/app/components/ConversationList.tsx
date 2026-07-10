'use client';
import { useState } from 'react';

export type Message = { role: 'user' | 'assistant'; content: string };

export type Conversation = {
  id: string;
  title: string;
  date: string;
  model: string;
  messages: Message[];
};

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
};

const STORAGE_KEY = 'multiapi_conversations';

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveConversations(list: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function ConversationList({ conversations, activeId, onSelect, onNewChat }: Props) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.model.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <aside className="conv-list open" dir="rtl">
      <div className="conv-header">
        <span className="conv-title">مکالمات</span>
        <button className="conv-new-btn" onClick={onNewChat} title="چت جدید">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ marginRight: 6 }}>چت جدید</span>
        </button>
      </div>
      <div className="conv-search">
        <input
          type="text"
          placeholder="جستجو در مکالمات..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="conv-items">
        {filtered.length === 0 ? (
          <div className="conv-empty">مکالمهای یافت نشد</div>
        ) : (
          filtered.map(c => (
            <div
              key={c.id}
              className={`conv-item${c.id === activeId ? ' active' : ''}`}
              onClick={() => onSelect(c.id)}
              onKeyDown={e => { if (e.key === 'Enter') onSelect(c.id); }}
              tabIndex={0}
              role="button"
            >
              <div className="conv-item-title">
                {c.title.length > 40 ? c.title.slice(0, 40) + '...' : c.title}
              </div>
              <div className="conv-item-meta">
                <span className="conv-item-model">{c.model}</span>
                <span className="conv-item-date">{formatDate(c.date)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}