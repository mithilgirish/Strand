"use client";

import React from 'react';
import { BookOpen } from 'lucide-react';

export default function CitationBadge({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="group flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(78,222,163,0.08)] hover:bg-[rgba(78,222,163,0.18)] border border-[rgba(78,222,163,0.2)] hover:border-[rgba(78,222,163,0.4)] text-secondary rounded-full transition-all duration-200"
    >
      <BookOpen className="w-3 h-3 opacity-70 group-hover:opacity-100" />
      <span className="text-[10px] font-bold tracking-wide label-caps">{text}</span>
    </button>
  );
}
