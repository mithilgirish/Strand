"use client";

import React, { useState } from 'react';
import { CheckCircle2, FileSignature, Loader2, Send } from 'lucide-react';

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
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/api/v1/guardian/rfi/${encodeURIComponent(violationId)}/approve`, {
        method: 'POST',
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
    <div className="h-full flex flex-col bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
      <div className="p-4 border-b border-outline-variant bg-surface-container-high flex items-center justify-between">
        <h3 className="font-bold text-on-surface flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-primary" />
          RFI Draft
        </h3>
        <span className="text-xs font-bold text-on-surface-variant label-caps">Auto-Generated</span>
      </div>
      
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="bg-surface-container-lowest p-4 rounded-md border border-outline-variant text-sm text-on-surface leading-relaxed font-sans shadow-inner whitespace-pre-wrap">
          {rfiDraft || 'No RFI draft available.'}
        </div>
      </div>
      
      <div className="p-4 border-t border-outline-variant bg-surface-container-high">
        {message && (
          <p className={`mb-3 text-xs font-semibold ${status === 'error' ? 'text-tertiary' : 'text-secondary'}`}>
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={handleApprove}
          disabled={!rfiDraft || status === 'sending' || status === 'sent'}
          className="w-full py-3 bg-primary text-on-primary rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md"
        >
          {status === 'sending' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : status === 'sent' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {status === 'sent' ? 'RFI Approved' : status === 'sending' ? 'Sending RFI...' : 'Approve & Send RFI'}
        </button>
      </div>
    </div>
  );
}
