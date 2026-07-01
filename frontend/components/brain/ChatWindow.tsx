"use client";

import React from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: number;
  sender: 'user' | 'brain';
  text: string;
  citations?: { text: string }[];
  confidence?: 'High' | 'Medium' | 'Low';
  timestamp: string;
}

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
}

export default function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  return (
    <div className="flex flex-col space-y-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-surface-container-high text-on-surface rounded-2xl rounded-tl-sm p-4 w-16 flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
