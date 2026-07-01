"use client";

import React, { useState } from 'react';
import ChatWindow from '@/components/brain/ChatWindow';
import InputBar from '@/components/brain/InputBar';

export default function BrainAgent() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'user',
      text: 'What are the fire suppression requirements for the UPS room?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = (text: string) => {
    const newMessage = {
      id: messages.length + 1,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    // Mock API Call
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        sender: 'brain',
        text: 'The UPS rooms must be protected by a clean agent fire suppression system such as FM-200 or Novec 1230 for rooms larger than 500kVA.',
        citations: [{ text: "Spec Rev-3 §7.4.2 p.47" }],
        confidence: "High",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsLoading(false);
    }, 1500);
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
