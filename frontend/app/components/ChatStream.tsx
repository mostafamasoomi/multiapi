'use client';
import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { TypingDots } from './TypingDots';
import { UsagePill } from './UsagePill';

/* ── Types ──────────────────────────────────────────────────────────────────── */

export type Msg = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  error?: string;
  cost_irr?: number;
  token_count?: number;
};

interface ChatStreamProps {
  messages: Msg[];
  streaming: boolean;
  onCancel?: () => void;
  onRetry?: (messageId: string) => void;
  onRegenerate?: () => void;
  onPresetClick?: (preset: string) => void;
}

/* ── Presets ────────────────────────────────────────────────────────────────── */

const PRESETS = [
  { id: 'summarize', icon: '📝', label: 'خلاصه‌سازی', prompt: 'لطفاً متن زیر را خلاصه کن:' },
  { id: 'code',      icon: '💻', label: 'کدنویسی',          prompt: 'یک کد برای' },
  { id: 'translate', icon: '🌐', label: 'ترجمه',            prompt: 'لطفاً متن زیر را ترجمه کن:' },
  { id: 'analyze',   icon: '🔍', label: 'تحلیل فایل',        prompt: 'لطفاً این فایل را تحلیل کن:' },
];

/* ── Sub-components ─────────────────────────────────────────────────────────── */

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

function MessageActions({
  content,
  isLastAssistant,
  onRegenerate,
}: {
  content: string;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="message-actions">
      <button
        className={`msg-action-btn ${copied ? 'copied' : ''}`}
        onClick={handleCopy}
        title="کپی"
      >
        {copied ? '✓' : '📋'}
      </button>
      {isLastAssistant && onRegenerate && (
        <button
          className="msg-action-btn"
          onClick={onRegenerate}
          title="بازسازی پاسخ"
        >
          🔄
        </button>
      )}
    </div>
  );
}

function EmptyState({ onPresetClick }: { onPresetClick?: (preset: string) => void }) {
  return (
    <div className="empty-state">
      <div className="big">⚡</div>
      <h2>به multiapi خوش آمدید</h2>
      <p>از منوی سمت راست مدل مورد نظرتان را انتخاب کنید و شروع به چت کنید.</p>

      <div className="preset-cards">
        <p className="preset-cards-label">یا با یکی از گزینه‌های زیر شروع کنید:</p>
        <div className="preset-cards-grid">
          {PRESETS.map(p => (
            <button
              key={p.id}
              className="preset-card"
              onClick={() => onPresetClick?.(p.prompt)}
            >
              <span className="preset-card-icon">{p.icon}</span>
              <span className="preset-card-label">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

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
  );
}

/* ── Markdown code renderer ─────────────────────────────────────────────────── */

function markdownComponents() {
  return {
    code({ node, className, children, ...props }: any) {
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
  };
}

/* ── Main Component ─────────────────────────────────────────────────────────── */

export function ChatStream({
  messages,
  streaming,
  onCancel,
  onRetry,
  onRegenerate,
  onPresetClick,
}: ChatStreamProps) {
  // Empty state
  if (!messages.length && !streaming) {
    return <EmptyState onPresetClick={onPresetClick} />;
  }

  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  return (
    <div className="stream-inner">
      {/* Cancel button during streaming */}
      {streaming && onCancel && (
        <div className="cancel-bar">
          <button className="cancel-stream-btn" onClick={onCancel}>
            ⏹ توقف تولید
          </button>
        </div>
      )}

      {messages.map((m, i) => {
        const isLastAssistant = i === lastAssistantIndex;
        const isError = !!m.error;

        return (
          <div key={m.id || i} className={`bubble ${m.role}${isError ? ' error' : ''}`}>
            <div className="avatar">
              {m.role === 'user' ? '🧑' : '⚡'}
            </div>
            <div className="content" style={{ position: 'relative' }}>
              {/* Actions: copy + regenerate */}
              {m.role === 'assistant' && !isError && m.content && (
                <MessageActions
                  content={m.content}
                  isLastAssistant={isLastAssistant && !streaming}
                  onRegenerate={onRegenerate}
                />
              )}

              {/* Error state */}
              {isError ? (
                <div className="error-msg">
                  <div className="error-icon">⚠️</div>
                  <div className="error-text">
                    {m.error || 'خطا در دریافت پاسخ'}
                  </div>
                  {onRetry && (
                    <button
                      className="retry-btn"
                      onClick={() => onRetry(m.id || String(i))}
                    >
                      ↻ تلاش مجدد
                    </button>
                  )}
                </div>
              ) : m.role === 'assistant' ? (
                /* Assistant markdown */
                m.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents()}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  <span className="empty-content">{' '}</span>
                )
              ) : (
                /* User message */
                <div>{m.content}</div>
              )}
            </div>

            {/* Bubble footer: usage + retry */}
            {m.role === 'assistant' && !isError && (
              <div className="bubble-footer">
                {m.cost_irr != null && <UsagePill cost_irr={m.cost_irr} token_count={m.token_count} />}
                {!streaming && onRetry && m.content && (
                  <button
                    className="retry-btn"
                    onClick={() => onRetry(m.id || String(i))}
                    title="تلاش مجدد"
                  >
                    ↻
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Streaming indicator */}
      {streaming && (
        <div className="bubble assistant">
          <div className="avatar">⚡</div>
          <div className="content">
            <TypingDots />
          </div>
        </div>
      )}
    </div>
  );
}