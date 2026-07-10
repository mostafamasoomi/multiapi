'use client';
import { useRef, useEffect, useState } from 'react';

type Props = {
  onSend: (text: string) => void;
  onCancel: () => void;
  streaming: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  estimatedCost: number;
  models?: string[];
};

export function ChatComposer({ onSend, onCancel, streaming, selectedModel, onModelChange, estimatedCost, models = [] }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(160, textareaRef.current.scrollHeight)}px`;
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!streaming && text.trim()) {
        onSend(text.trim());
        setText('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    }
  };

  const handleSendClick = () => {
    if (!streaming && text.trim()) {
      onSend(text.trim());
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const isEmpty = !text.trim();

  return (
    <div className="composer-wrap" dir="rtl">
      <div className="composer-box">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="پیام خود را بنویسید... (Enter برای ارسال، Shift+Enter برای خط جدید)"
          value={text}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={streaming}
        />
        <div className="composer-actions">
          {models.length > 0 && (
            <select
              className="model-select"
              value={selectedModel}
              onChange={e => onModelChange(e.target.value)}
              disabled={streaming}
              title="انتخاب مدل"
            >
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
          {estimatedCost > 0 && !isEmpty && (
            <span className="cost-estimate" title="هزینه تخمینی">
              ≈ {estimatedCost.toLocaleString('fa-IR')} ریال
            </span>
          )}
          {streaming ? (
            <button className="cancel-btn" onClick={onCancel} title="لغو" type="button">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="10" height="10" rx="1" fill="currentColor"/>
              </svg>
            </button>
          ) : (
            <button
              className="send-btn"
              onClick={handleSendClick}
              disabled={isEmpty || streaming}
              title="ارسال"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9l14-7-7 14-2-5-5-2z" fill="currentColor"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}