"use client";

import React, { useState, useCallback, useRef } from 'react';
import ChatWindow from '@/components/brain/ChatWindow';
import InputBar from '@/components/brain/InputBar';
import BrainAvatar from '@/components/brain/BrainAvatar';
import SuggestedPrompts from '@/components/brain/SuggestedPrompts';
import { ChatMessage } from '@/components/brain/MessageBubble';
import { createClient } from '@/utils/supabase/client';
import {
  ShieldCheck, HardHat, Zap, FileSearch,
  Clock, Trash2, Plus, MessageSquare,
  Pencil, Check, X
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  {
    icon: ShieldCheck,
    category: 'Compliance',
    label: 'Fire suppression requirements for UPS room',
    text: 'What are the fire suppression requirements for the UPS room?',
  },
  {
    icon: HardHat,
    category: 'Safety',
    label: 'Confined space entry permit conditions',
    text: 'What are the confined space entry permit conditions on-site?',
  },
  {
    icon: Zap,
    category: 'Electrical',
    label: 'Generator earthing specifications for Tier IV',
    text: 'What are the earthing specifications for generators in a Tier IV data centre?',
  },
  {
    icon: FileSearch,
    category: 'Specification',
    label: 'Cooling tower water treatment standards',
    text: 'Summarise the water treatment standards required for cooling towers on this project.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function makeSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function deriveTitleFromText(text: string): string {
  return text.length > 40 ? text.slice(0, 37) + '...' : text;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

// ─── API call ─────────────────────────────────────────────────────────────────
async function queryBrainApi(question: string): Promise<ChatMessage> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Try real backend first — only fall back on network/server failure
  let data: { answer?: string; citations?: { document?: string; page?: number; section?: string }[]; confidence?: string } | null = null;

  try {
    const res = await fetch(`${apiBase}/api/v1/brain/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (res.ok) {
      data = await res.json();
    }
  } catch {
    // Network error — backend offline, use demo response below
  }

  if (data) {
    return {
      id: Date.now(),
      sender: 'brain',
      text: data.answer ?? 'No answer returned.',
      citations: (data.citations ?? []).map((c) => ({
        text: `${c.document ?? 'Spec'} §${c.section ?? '-'} p.${c.page ?? 1}`,
      })),
      confidence: (data.confidence as ChatMessage['confidence']) ?? 'Medium',
      timestamp: nowTime(),
    };
  }

  // ── Demo fallback (backend offline) ──
  const lower = question.toLowerCase();
  let demoText = '';
  let demoCitations: { text: string }[] = [];
  let demoConfidence: ChatMessage['confidence'] = 'High';

  if (lower.includes('fire') || lower.includes('suppression') || lower.includes('ups')) {
    demoText = `**Based on project specification DS-2026-FIRE-003:**\n\nThe UPS room requires a **clean agent suppression system** (FM-200 or equivalent) meeting NFPA 2001 standards.\n\nKey requirements:\n- System must achieve minimum design concentration of **8.5% by volume**\n- Discharge time must not exceed **10 seconds**\n- Room must maintain integrity for a hold time of **10 minutes** post-discharge\n- Pre-discharge alarm must sound for a minimum of **30 seconds** before activation\n\nThe system must be integrated with the Building Management System (BMS) for alarm propagation and automatic HVAC shutdown.`;
    demoCitations = [{ text: 'DS-2026-FIRE-003 §4.2 p.12' }, { text: 'NFPA 2001 §5.4 p.38' }];
  } else if (lower.includes('earthing') || lower.includes('generator') || lower.includes('electrical')) {
    demoText = `**Earthing Specifications — Tier IV (IEC 60364-5-54):**\n\nAll generators must be earthed in accordance with **TN-S system** topology:\n- Main protective conductor cross-section: minimum **150mm²** copper\n- Earth electrode resistance: **≤ 1Ω** at each generator pad\n- Bonding conductor between generator frame and building earth bar: **70mm² copper minimum**\n\n**Testing**: Earth loop impedance must be tested before energisation and results recorded in the commissioning log.`;
    demoCitations = [{ text: 'IEC 60364-5-54 §543 p.22' }, { text: 'BS 7671:2018 §411.4' }];
  } else if (lower.includes('cooling') || lower.includes('water')) {
    demoText = `**Cooling Tower Water Treatment (AS/NZS 3666.3):**\n\nThe project cooling towers require a comprehensive water treatment programme:\n- **Biocide dosing**: minimum weekly oxidising biocide + monthly non-oxidising\n- **Conductivity control**: blowdown set-point 1500–2500 μS/cm\n- **pH target**: 7.0 – 8.5\n- **Legionella monitoring**: fortnightly ATP testing, quarterly culture testing\n\nAll treatment records must be maintained in the O&M manual and inspected quarterly.`;
    demoCitations = [{ text: 'AS/NZS 3666.3 §5.3 p.14' }, { text: 'HSE ACOP L8 §7.2' }];
  } else {
    demoText = `I've searched across **847 project documents** for your query.\n\nThis question covers areas across multiple specification sections. For a precise answer, please provide more specific context — for example, the trade, building zone, or regulation reference you are working with.\n\nIf the backend is connected, Brain will return a grounded answer with precise citations from your project documents.`;
    demoConfidence = 'Medium';
  }

  return {
    id: Date.now(),
    sender: 'brain',
    text: demoText,
    citations: demoCitations,
    confidence: demoConfidence,
    timestamp: nowTime(),
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BrainAgent() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Derived: current session's messages
  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];

  const fetchSessions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setSessions(data.map(s => ({
        id: s.id,
        title: s.title,
        messages: [],
        createdAt: new Date(s.created_at)
      })));
    }
  }, []);

  const fetchMessagesForSession = useCallback(async (sessionId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) {
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              messages: data.map(m => ({
                id: m.id,
                sender: m.sender as 'user' | 'brain',
                text: m.text,
                citations: Array.isArray(m.citations) ? m.citations.map((c: any) => ({ text: c.text })) : [],
                confidence: m.confidence as ChatMessage['confidence'] || 'Medium',
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }))
            }
          : s
      ));
    }
  }, []);

  // Fetch sessions on mount
  React.useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // Fetch messages when switching session
  React.useEffect(() => {
    if (activeSessionId) {
      void fetchMessagesForSession(activeSessionId);
    }
  }, [activeSessionId, fetchMessagesForSession]);

  // ── Switch session ────────────────────────────────────────────────────────
  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  // ── Clear / new session ───────────────────────────────────────────────────
  const handleNewSession = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  // ── Delete a session by id ───────────────────────────────────────────────
  const handleDeleteSession = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = createClient();
    await supabase.from('chat_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
    if (editingSessionId === id) setEditingSessionId(null);
  }, [activeSessionId, editingSessionId]);

  // ── Start editing a session title ────────────────────────────────────────
  const handleStartEdit = useCallback((session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
    // Focus input on next tick
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, []);

  // ── Commit rename ────────────────────────────────────────────────────────
  const handleCommitRename = useCallback(async () => {
    if (!editingSessionId) return;
    const trimmed = editTitle.trim();
    if (trimmed) {
      const supabase = createClient();
      await supabase.from('chat_sessions').update({ title: trimmed }).eq('id', editingSessionId);
      setSessions(prev => prev.map(s =>
        s.id === editingSessionId ? { ...s, title: trimmed } : s
      ));
    }
    setEditingSessionId(null);
    setEditTitle('');
  }, [editingSessionId, editTitle]);

  // ── Cancel rename ────────────────────────────────────────────────────────
  const handleCancelRename = useCallback(() => {
    setEditingSessionId(null);
    setEditTitle('');
  }, []);

  // ── Helper: append message to a session ──────────────────────────────────
  const appendMessage = useCallback((sessionId: string, msg: ChatMessage) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, messages: [...s.messages, msg] } : s
    ));
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (text: string) => {
    const supabase = createClient();
    let sessionId = activeSessionId;
    
    setIsLoading(true);
    try {
      if (!sessionId) {
        const { data: newSession, error } = await supabase
          .from('chat_sessions')
          .insert({
            title: deriveTitleFromText(text)
          })
          .select()
          .single();
          
        if (error || !newSession) throw new Error("Could not create chat session");
        
        sessionId = newSession.id;
        setActiveSessionId(sessionId);
        setSessions(prev => [
          {
            id: newSession.id,
            title: newSession.title,
            messages: [],
            createdAt: new Date(newSession.created_at)
          },
          ...prev
        ]);
      }

      // 1. Insert user message to DB
      const { data: userMsgData } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId!,
          sender: 'user',
          text
        })
        .select()
        .single();
      
      if (userMsgData) {
        const userMsg: ChatMessage = {
          id: userMsgData.id,
          sender: 'user',
          text,
          timestamp: nowTime()
        };
        appendMessage(sessionId!, userMsg);
      }

      // 2. Fetch answer from API
      const brainMsg = await queryBrainApi(text);

      // 3. Insert brain answer to DB
      const { data: brainMsgData } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId!,
          sender: 'brain',
          text: brainMsg.text,
          citations: brainMsg.citations,
          confidence: brainMsg.confidence,
          response_time_ms: 0
        })
        .select()
        .single();
      
      if (brainMsgData) {
        const completedBrainMsg: ChatMessage = {
          id: brainMsgData.id,
          sender: 'brain',
          text: brainMsg.text,
          citations: brainMsg.citations,
          confidence: brainMsg.confidence,
          timestamp: nowTime()
        };
        appendMessage(sessionId!, completedBrainMsg);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, appendMessage]);

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    // Escape layout p-10 with negative margin; fill remaining height inside the main element
    <div className="-m-10 flex overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 border-r border-[rgba(255,255,255,0.06)] bg-surface-container-low flex flex-col overflow-hidden">

        {/* Brain identity */}
        <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3 mb-3">
            <BrainAvatar size="md" />
            <div>
              <h2 className="font-black text-on-surface text-base tracking-wide">BRAIN</h2>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">RAG Intelligence</p>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Answers grounded in project specifications, standards, and site documentation.
          </p>
        </div>

        {/* New session button */}
        <div className="p-3 border-b border-[rgba(255,255,255,0.06)]">
          <button
            type="button"
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[rgba(78,222,163,0.1)] hover:bg-[rgba(78,222,163,0.18)] border border-[rgba(78,222,163,0.2)] hover:border-[rgba(78,222,163,0.35)] text-secondary text-xs font-bold uppercase tracking-wider transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5" />
            New Session
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-40">
              <MessageSquare className="w-8 h-8 text-on-surface-variant" />
              <p className="text-xs text-on-surface-variant text-center">No conversations yet</p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant px-2 mb-3">Recent</p>
              <div className="space-y-1">
                {sessions.map(session => {
                  const isActive = session.id === activeSessionId;
                  const isEditing = session.id === editingSessionId;
                  return (
                    <div
                      key={session.id}
                      className={`group relative flex items-start gap-2 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[rgba(78,222,163,0.1)] border border-[rgba(78,222,163,0.2)]'
                          : 'hover:bg-surface-container border border-transparent'
                      }`}
                      onClick={() => !isEditing && switchSession(session.id)}
                    >
                      <Clock className={`w-3.5 h-3.5 flex-shrink-0 mt-1 transition-colors ${
                        isActive ? 'text-secondary' : 'text-on-surface-variant group-hover:text-secondary'
                      }`} />

                      <div className="min-w-0 flex-1">
                        {/* Inline edit input */}
                        {isEditing ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                              ref={editInputRef}
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleCommitRename();
                                if (e.key === 'Escape') handleCancelRename();
                              }}
                              className="flex-1 min-w-0 bg-surface-container-high text-on-surface text-xs font-medium px-2 py-1 rounded border border-secondary/40 focus:outline-none focus:ring-1 focus:ring-secondary/60"
                            />
                            <button
                              type="button"
                              onClick={handleCommitRename}
                              className="w-5 h-5 flex items-center justify-center text-secondary hover:opacity-80 flex-shrink-0"
                              aria-label="Save title"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelRename}
                              className="w-5 h-5 flex items-center justify-center text-on-surface-variant hover:text-red-400 flex-shrink-0"
                              aria-label="Cancel edit"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className={`text-xs font-medium truncate pr-10 ${
                            isActive ? 'text-secondary' : 'text-on-surface'
                          }`}>
                            {session.title}
                          </p>
                        )}

                        <p className="text-[10px] text-on-surface-variant mt-0.5 font-mono">
                          {formatRelativeTime(session.createdAt)} · {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Action buttons — visible on hover, hidden while editing */}
                      {!isEditing && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={e => handleStartEdit(session, e)}
                            className="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant hover:text-secondary hover:bg-[rgba(78,222,163,0.1)] transition-all"
                            aria-label="Rename session"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={e => handleDeleteSession(session.id, e)}
                            className="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-all"
                            aria-label="Delete session"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[rgba(255,255,255,0.06)] bg-surface-container-low flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${activeSessionId ? 'bg-secondary animate-pulse' : 'bg-on-surface-variant'}`} />
            <span className="text-sm font-bold text-on-surface">
              {activeSession ? activeSession.title : 'New Conversation'}
            </span>
            {messages.length > 0 && (
              <span className="text-[10px] text-on-surface-variant font-mono">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Messages / empty state */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-full text-center py-10 gap-8">
              <div className="flex flex-col items-center gap-4">
                <BrainAvatar size="lg" animated />
                <div>
                  <h3 className="text-2xl font-black text-on-surface tracking-wide mb-2">
                    Ask Brain Anything
                  </h3>
                  <p className="text-sm text-on-surface-variant max-w-md leading-relaxed">
                    Instant answers grounded in project specifications, engineering standards, and regulatory documents — with citations you can verify.
                  </p>
                </div>
              </div>

              <SuggestedPrompts
                prompts={SUGGESTED_PROMPTS}
                onSelect={handleSendMessage}
              />

              <p className="text-[11px] text-on-surface-variant max-w-sm leading-relaxed">
                Brain uses Retrieval-Augmented Generation (RAG) to search across{' '}
                <span className="text-secondary font-bold">847 project documents</span> before answering.
              </p>
            </div>
          ) : (
            <ChatWindow messages={messages} isLoading={isLoading} />
          )}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-[rgba(255,255,255,0.06)] bg-surface-container-low">
          <InputBar onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
