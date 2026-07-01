"use client";

import React from 'react';
import { BookOpen } from 'lucide-react';

export default function CitationBadge({ text }: { text: string }) {
  return (
    <button className="flex items-center gap-1.5 px-3 py-1 bg-[rgba(78,222,163,0.1)] hover:bg-[rgba(78,222,163,0.2)] border border-[rgba(78,222,163,0.3)] text-secondary rounded-full transition-colors duration-200">
      <BookOpen className="w-3 h-3" />
      <span className="text-[11px] font-bold tracking-wide label-caps">{text}</span>
    </button>
  );
}
