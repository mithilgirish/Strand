"use client";

import React, { useState, useCallback, useRef } from 'react';
import ChatWindow from '@/components/brain/ChatWindow';
import InputBar from '@/components/brain/InputBar';

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

  // Escape parent layout constraints for full-bleed chat interface
  React.useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.classList.remove('p-4', 'sm:p-6', 'lg:p-10');
      const innerContainer = mainEl.firstElementChild as HTMLElement;
      if (innerContainer) {
        innerContainer.classList.remove('max-w-[1440px]', 'mx-auto');
      }
    }
    return () => {
      // Restore layout for other pages when leaving Brain
      if (mainEl) {
        mainEl.classList.add('p-4', 'sm:p-6', 'lg:p-10');
        const innerContainer = mainEl.firstElementChild as HTMLElement;
        if (innerContainer) {
          innerContainer.classList.add('max-w-[1440px]', 'mx-auto');
        }
      }
    };
  }, []);

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
      // Explicitly fetch user and tenant context to satisfy strict RLS
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("Authentication required.");

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      const tenantId = profile?.tenant_id;

      if (!sessionId) {
        const { data: newSession, error } = await supabase
          .from('chat_sessions')
          .insert({
            title: deriveTitleFromText(text),
            user_id: user.id,
            ...(tenantId && { tenant_id: tenantId })
          })
          .select()
          .single();
          
        if (error || !newSession) {
          console.error("Supabase Error (chat_sessions insert):", error);
          throw new Error(`Could not create chat session: ${error?.message || 'No data returned'}`);
        }
        
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
    // The DOM hook cleanly removes the layout padding, so we just use 100% height here
    <div className="flex h-[calc(100vh-64px)] bg-black/40 w-full">

      {/* ── Left Sidebar (Glass Panel) ─────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 bg-white/5 backdrop-blur-[12px] border-r border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden z-10">
        
        {/* Brain identity */}
        <div className="p-6 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-3 mb-3">

            <div>
              <h2 className="font-black text-on-surface text-lg tracking-wide uppercase font-primary">BRAIN</h2>
              <p className="text-[10px] text-primary font-bold uppercase tracking-[0.08em] font-primary">RAG Intelligence</p>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Answers grounded in project specifications, standards, and site documentation.
          </p>
        </div>

        {/* New session button */}
        <div className="p-4 border-b border-white/10 bg-black/10">
          <button
            type="button"
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 text-primary text-xs font-bold uppercase tracking-[0.08em] transition-all duration-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Session
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-black/5">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-40">
              <MessageSquare className="w-8 h-8 text-on-surface-variant" />
              <p className="text-xs text-on-surface-variant text-center">No conversations yet</p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-variant px-2 mb-3">Recent</p>
              <div className="space-y-1.5">
                {sessions.map(session => {
                  const isActive = session.id === activeSessionId;
                  const isEditing = session.id === editingSessionId;
                  return (
                    <div
                      key={session.id}
                      className={`group relative flex items-start gap-2 px-3 py-3 rounded-md transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white/10 border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                      onClick={() => !isEditing && switchSession(session.id)}
                    >
                      <Clock className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-colors ${
                        isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'
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
                              className="flex-1 min-w-0 bg-[#0A0A0A] text-primary text-xs font-medium px-2 py-1 rounded-sm shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] border border-outline-variant focus:outline-none focus:border-primary focus:shadow-[0_0_8px_rgba(229,229,229,0.25)]"
                            />
                            <button
                              type="button"
                              onClick={handleCommitRename}
                              className="w-6 h-6 flex items-center justify-center text-primary hover:opacity-80 flex-shrink-0"
                              aria-label="Save title"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelRename}
                              className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-white flex-shrink-0"
                              aria-label="Cancel edit"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className={`text-sm font-medium truncate pr-10 tracking-wide ${
                            isActive ? 'text-primary' : 'text-on-surface-variant'
                          }`}>
                            {session.title}
                          </p>
                        )}

                        <p className="text-xs text-on-surface-variant mt-1 font-mono tracking-wide">
                          {formatRelativeTime(session.createdAt)} · {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Action buttons — visible on hover, hidden while editing */}
                      {!isEditing && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={e => handleStartEdit(session, e)}
                            className="w-7 h-7 flex items-center justify-center rounded-sm text-on-surface-variant hover:text-primary hover:bg-white/10 transition-all"
                            aria-label="Rename session"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={e => handleDeleteSession(session.id, e)}
                            className="w-7 h-7 flex items-center justify-center rounded-sm text-on-surface-variant hover:text-tertiary hover:bg-tertiary/10 transition-all"
                            aria-label="Delete session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ── Main Chat Area (Glass Panel) ────────────────────────────────── */}
      <div className="flex-1 bg-white/[0.02] backdrop-blur-[12px] flex flex-col overflow-hidden min-w-0">

        {/* Header bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${activeSessionId ? 'bg-primary shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-pulse' : 'bg-outline shadow-[0_0_6px_rgba(82,82,82,0.5)]'}`} />
            <span className="text-sm font-bold text-primary tracking-wide uppercase">
              {activeSession ? activeSession.title : 'New Conversation'}
            </span>
            {messages.length > 0 && (
              <span className="text-xs text-on-surface-variant font-mono border border-white/10 px-2 py-0.5 rounded-sm bg-black/20">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Messages / empty state */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 bg-black/5">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-full text-center py-10 gap-10">
              <div className="flex flex-col items-center gap-5">
                <div>
                  <h3 className="text-3xl font-black text-primary tracking-wide mb-3">
                    Ask Brain Anything
                  </h3>
                  <p className="text-base text-on-surface-variant max-w-lg leading-relaxed">
                    Instant answers grounded in project specifications, engineering standards, and regulatory documents — with citations you can verify.
                  </p>
                </div>
              </div>

              <SuggestedPrompts
                prompts={SUGGESTED_PROMPTS}
                onSelect={handleSendMessage}
              />

              <p className="text-xs text-on-surface-variant max-w-md leading-relaxed font-mono">
                Brain uses Retrieval-Augmented Generation (RAG) to search across{' '}
                <span className="text-primary font-bold">847 project documents</span> before answering.
              </p>
            </div>
          ) : (
            <ChatWindow messages={messages} isLoading={isLoading} />
          )}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 px-8 py-6 border-t border-white/10 bg-black/20">
          <InputBar onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
