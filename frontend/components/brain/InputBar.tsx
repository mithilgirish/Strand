"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

interface InputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea (up to ~5 lines)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
  }, [input]);

  // Focus on mount
  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setInput('');
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charLimit = 2000;
  const charCount = input.length;
  const nearLimit = charCount > charLimit * 0.8;

  return (
    <div className="flex flex-col gap-2">
      <div className={`flex items-end gap-3 rounded-xl border transition-all duration-200 bg-surface-container ${
        disabled
          ? 'border-[rgba(255,255,255,0.04)] opacity-60'
          : 'border-[rgba(255,255,255,0.1)] focus-within:border-secondary focus-within:shadow-[0_0_0_2px_rgba(78,222,163,0.12)]'
      }`}>
        <textarea
          ref={textareaRef}
          className="flex-1 bg-transparent px-4 py-3.5 text-on-surface text-sm focus:outline-none resize-none font-sans leading-relaxed min-h-[52px] max-h-[148px] custom-scrollbar"
          placeholder="Ask Brain anything about the project specs, regulations, or risk data…"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, charLimit))}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        <div className="flex items-center gap-2 px-3 pb-3">
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            aria-label="Send message"
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0 ${
              input.trim() && !disabled
                ? 'bg-secondary text-on-secondary hover:opacity-90 shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                : 'bg-[rgba(255,255,255,0.05)] text-on-surface-variant cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Bottom hint row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
          <CornerDownLeft className="w-3 h-3" />
          <span>Enter to send · Shift+Enter for new line</span>
        </div>
        {charCount > 0 && (
          <span className={`text-[10px] font-mono ${nearLimit ? 'text-yellow-500' : 'text-on-surface-variant'}`}>
            {charCount}/{charLimit}
          </span>
        )}
      </div>
    </div>
  );
}
