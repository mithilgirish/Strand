"use client";

import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface InputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-surface-container-low rounded-lg border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-inner transition-all duration-200">
        <textarea
          className="w-full bg-transparent p-3 text-on-surface text-sm focus:outline-none resize-none h-[52px] font-sans"
          placeholder="Ask a question about the project specifications..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
      </div>
      <button
        onClick={handleSend}
        disabled={!input.trim() || disabled}
        className="w-[52px] h-[52px] flex items-center justify-center rounded-lg bg-primary text-on-primary hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}
