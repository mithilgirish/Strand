"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Prompt {
  icon: LucideIcon;
  label: string;
  text: string;
  category: string;
}

interface SuggestedPromptsProps {
  prompts: Prompt[];
  onSelect: (text: string) => void;
}

export default function SuggestedPrompts({ prompts, onSelect }: SuggestedPromptsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
      {prompts.map((prompt, i) => {
        const Icon = prompt.icon;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(prompt.text)}
            className="group flex items-start gap-3 p-4 rounded-xl bg-surface-container border border-[rgba(255,255,255,0.06)] hover:border-[rgba(78,222,163,0.3)] hover:bg-[rgba(78,222,163,0.04)] transition-all duration-200 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-[rgba(78,222,163,0.1)] border border-[rgba(78,222,163,0.2)] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[rgba(78,222,163,0.2)] transition-colors">
              <Icon className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">{prompt.category}</p>
              <p className="text-sm font-medium text-on-surface leading-snug">{prompt.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
