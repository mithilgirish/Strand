"use client";

import React, { useState } from 'react';
import { CheckCircle2, FileSignature, Loader2, Send } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import RfiMarkdownViewer from './RfiMarkdownViewer';

interface RfiPreviewProps {
  rfiDraft: string;
  violationId: string;
}

export default function RfiPreview({ rfiDraft, violationId }: RfiPreviewProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleApprove = async () => {
    if (!violationId || status === 'sending' || status === 'sent') {
      return;
    }

    setStatus('sending');
    setMessage('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/api/v1/guardian/rfi/${encodeURIComponent(violationId)}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `RFI approval failed: ${response.status}`);
      }

      const result = await response.json();
      setStatus('sent');
      setMessage(result.message || 'RFI approved and queued for sending.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'RFI approval failed.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#14171d] rounded-2xl border border-[#2b313d] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-[#222733] bg-[#0e1014] flex items-center justify-between font-mono">
        <h3 className="font-bold text-[#f5f5f5] flex items-center gap-2 text-sm font-sans">
          <FileSignature className="w-4 h-4 text-primary" />
          <span>RFI Letter & Specification Challenge</span>
        </h3>
        <span className="text-[10px] font-bold text-[#4edea3] bg-[#4edea3]/10 px-2 py-0.5 rounded border border-[#4edea3]/20">
          AI-Drafted • HITL Gate
        </span>
      </div>
      
      {/* Markdown Content Viewer */}
      <div className="flex-1 p-4 overflow-y-auto">
        <RfiMarkdownViewer
          content={rfiDraft}
          violationId={violationId}
          className="h-full min-h-[320px]"
        />
      </div>
      
      {/* Footer Action */}
      <div className="p-4 border-t border-[#222733] bg-[#0e1014]">
        {message && (
          <p className={`mb-3 text-xs font-semibold font-mono ${status === 'error' ? 'text-red-400' : 'text-[#4edea3]'}`}>
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={handleApprove}
          disabled={!rfiDraft || status === 'sending' || status === 'sent'}
          className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer"
        >
          {status === 'sending' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : status === 'sent' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {status === 'sent' ? 'RFI Transmitted to Outbox' : status === 'sending' ? 'Sending via Procore Gateway...' : 'Approve & Transmit RFI'}
        </button>
      </div>
    </div>
  );
}
