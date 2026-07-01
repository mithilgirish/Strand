"use client";

import React from 'react';
import CitationBadge from './CitationBadge';
import ConfidenceBadge from './ConfidenceBadge';

interface MessageBubbleProps {
  message: {
    sender: 'user' | 'brain';
    text: string;
    citations?: { text: string }[];
    confidence?: 'High' | 'Medium' | 'Low';
    timestamp: string;
  };
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}> 
      <div className={`p-4 rounded-2xl ${isUser ? 'bg-primary text-on-primary rounded-tr-sm' : 'bg-surface-container-high text-on-surface rounded-tl-sm border border-outline-variant shadow-md'}`}>
        <p className="text-sm">{message.text}</p>
        
        {!isUser && message.citations && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.citations.map((c, i) => (
              <CitationBadge key={i} text={c.text} />
            ))}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 mt-1 px-1">
        {!isUser && message.confidence && <ConfidenceBadge level={message.confidence} />}
        <span className="text-xs text-on-surface-variant mono-data">{message.timestamp}</span>
      </div>
    </div>
  );
}
