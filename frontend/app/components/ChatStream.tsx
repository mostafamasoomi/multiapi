'use client';
import { TypingDots } from './TypingDots';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type Msg = { role: 'user' | 'assistant'; content: string };

export function ChatStream({ messages, streaming }: { messages: Msg[]; streaming: boolean }) {
  if (!messages.length && !streaming) {
    return (
      <div className="empty-state">
        <div className="big">⚡</div>
        <h2>به multiapi خوش آمدید</h2>
        <p>از منوی سمت راست مدل مورد نظرتان را انتخاب کنید و شروع به چت کنید. همه مدلها از یک دروازه واحد در دسترساند.</p>
      </div>
    );
  }

  return (
    <div className="stream-inner">
      {messages.map((m, i) => (
        <div key={i} className={'bubble ' + m.role}>
          <div className="avatar">{m.role === 'user' ? '🧑' : '⚡'}</div>
          <div className="content">
            {m.role === 'assistant' ? (
              <div className="markdown-body">
                <Markdown remarkPlugins={[remarkGfm]}>{m.content || ' '}</Markdown>
              </div>
            ) : (
              m.content || ' '
            )}
          </div>
        </div>
      ))}
      {streaming && (
        <div className="bubble assistant">
          <div className="avatar">⚡</div>
          <div className="content"><TypingDots /></div>
        </div>
      )}
    </div>
  );
}
