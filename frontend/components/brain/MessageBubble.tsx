"use client";

import React from 'react';
import CitationBadge from './CitationBadge';
import ConfidenceBadge from './ConfidenceBadge';
import BrainAvatar from './BrainAvatar';
import { User } from 'lucide-react';

export interface ChatMessage {
  id: number;
  sender: 'user' | 'brain';
  text: string;
  citations?: { text: string }[];
  confidence?: 'High' | 'Medium' | 'Low';
  timestamp: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isLatest?: boolean;
}

// Render text with newlines preserved and basic bold support (**text**)
function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        // Bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-sm leading-relaxed">
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j} className="font-bold text-on-surface">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function MessageBubble({ message, isLatest = false }: MessageBubbleProps) {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex gap-3 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}>
      
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 rounded-xl bg-surface-container-high border border-[rgba(255,255,255,0.08)] flex items-center justify-center flex-shrink-0 mb-5">
          <User className="w-4 h-4 text-on-surface-variant" />
        </div>
      ) : (
        <div className="flex-shrink-0 mb-5">
          <BrainAvatar size="sm" animated={isLatest} />
        </div>
      )}

      {/* Bubble + metadata */}
      <div className={`flex flex-col gap-1.5 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Sender label */}
        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant px-1">
          {isUser ? 'You' : 'Brain'}
        </span>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-primary text-on-primary rounded-br-sm'
              : 'bg-surface-container border border-[rgba(255,255,255,0.07)] text-on-surface rounded-bl-sm shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
          }`}
        >
          <FormattedText text={message.text} />

          {/* Citations */}
          {!isUser && message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap gap-1.5">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mr-1 self-center">Sources</span>
              {message.citations.map((c, i) => (
                <CitationBadge key={i} text={c.text} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom metadata row */}
        <div className="flex items-center gap-2 px-1">
          {!isUser && message.confidence && (
            <ConfidenceBadge level={message.confidence} />
          )}
          <span className="text-[10px] text-on-surface-variant font-mono">
            {message.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
}
