"use client";

import React, { useState } from 'react';
import ChatWindow from '@/components/brain/ChatWindow';
import InputBar from '@/components/brain/InputBar';

type ChatMessage = {
  id: number;
  sender: 'user' | 'brain';
  text: string;
  citations?: { text: string }[];
  confidence?: 'High' | 'Medium' | 'Low';
  timestamp: string;
};

export default function BrainAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'user',
      text: 'What are the fire suppression requirements for the UPS room?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text: string) => {
    const newMessage = {
      id: messages.length + 1,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } as ChatMessage;
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/api/v1/brain/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });

      if (!response.ok) {
        throw new Error(`Brain request failed: ${response.status}`);
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        sender: 'brain',
        text: data.answer,
        citations: (data.citations || []).map((citation: { document?: string; page?: number; section?: string }) => ({
          text: `${citation.document || 'Spec'} §${citation.section || '-'} p.${citation.page || 1}`
        })),
        confidence: data.confidence || 'Medium',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        sender: 'brain',
        text: error instanceof Error ? error.message : 'Brain request failed.',
        confidence: 'Low',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-lg border border-outline-variant">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant bg-surface-container flex items-center justify-between">
        <h2 className="text-xl font-bold text-on-surface">Brain Intelligence</h2>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-background">
        <ChatWindow messages={messages} isLoading={isLoading} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-outline-variant bg-surface-container">
        <InputBar onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
