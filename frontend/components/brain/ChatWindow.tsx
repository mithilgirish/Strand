"use client";

import React, { useEffect, useRef } from 'react';
import MessageBubble, { ChatMessage } from './MessageBubble';
import BrainAvatar from './BrainAvatar';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export default function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col gap-6 pb-2">
      {messages.map((msg, index) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLatest={index === messages.length - 1 && msg.sender === 'brain'}
        />
      ))}

      {/* Loading / thinking indicator */}
      {isLoading && (
        <div className="flex gap-3 items-end">
          <div className="flex-shrink-0">
            <BrainAvatar size="sm" animated />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant px-1">
              Brain
            </span>
            <div className="bg-surface-container border border-[rgba(255,255,255,0.07)] rounded-2xl rounded-bl-sm px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.18s' }} />
                <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.36s' }} />
                <span className="text-xs text-on-surface-variant ml-2 font-mono">Reasoning across specs...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
