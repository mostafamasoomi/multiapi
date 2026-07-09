'use client';
import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { TypingDots } from './TypingDots';

export type Msg = { role: 'user' | 'assistant'; content: string };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
      {copied ? '✓ کپی شد' : 'کپی'}
    </button>
  );
}

function MessageActions({ content }: { content: string }) {
  return (
    <div className="message-actions">
      <button
        className="msg-action-btn"
        onClick={async () => {
          await navigator.clipboard.writeText(content);
        }}
        title="کپی"
      >
        📋
      </button>
    </div>
  );
}

export function ChatStream({ messages, streaming }: { messages: Msg[]; streaming: boolean }) {
  if (!messages.length && !streaming) {
    return (
      <div className="empty-state">
        <div className="big">⚡</div>
        <h2>به multiapi خوش آمدید</h2>
        <p>از منوی سمت راست مدل مورد نظرتان را انتخاب کنید و شروع به چت کنید.</p>
        <div className="features">
          <div className="feature">
            <div className="icon">🚀</div>
            <div className="label">سریع و قدرتمند</div>
            <div className="desc">پاسخ‌های آنی با بهترین مدلها</div>
          </div>
          <div className="feature">
            <div className="icon">💰</div>
            <div className="label">ارزان و منصفانه</div>
            <div className="desc">پرداخت به ازای مصرف واقعی</div>
          </div>
          <div className="feature">
            <div className="icon">🔒</div>
            <div className="label">امن و خصوصی</div>
            <div className="desc">داده‌های شما محافظت می‌شوند</div>
          </div>
          <div className="feature">
            <div className="icon">🤖</div>
            <div className="label">چندین مدل</div>
            <div className="desc">دسترسی به بهترین مدل‌های AI</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stream-inner">
      {messages.map((m, i) => (
        <div key={i} className={`bubble ${m.role}`}>
          <div className="avatar">{m.role === 'user' ? '🧑' : '⚡'}</div>
          <div className="content" style={{ position: 'relative' }}>
            <MessageActions content={m.content} />
            {m.role === 'assistant' ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const isInline = !match;

                    if (!isInline && codeString.includes('\n')) {
                      return (
                        <div>
                          <div className="code-header">
                            <span className="lang">{match?.[1] || 'code'}</span>
                            <CopyButton text={codeString} />
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match?.[1] || 'text'}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderRadius: '0 0 12px 12px',
                              background: '#0d1117',
                            }}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {m.content || ' '}
              </ReactMarkdown>
            ) : (
              <div>{m.content}</div>
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
