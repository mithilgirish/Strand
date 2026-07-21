"use client";

import React, { useEffect, useState } from "react";
import { Send, Clock, CheckCircle, FileText } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Approval {
  violation_id: string;
  tenant_id: string;
  status: string;
  approved_at: string;
  delivery_channel: string;
  message: string;
}

export default function OutboxPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOutbox() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiBase}/api/v1/guardian/rfi/outbox`, {
          cache: "no-store",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch approvals");
        }

        const data = await response.json();
        setApprovals(data.approvals || []);
      } catch (err) {
        console.error("Error fetching outbox:", err);
        setError("Could not load outgoing box.");
      } finally {
        setLoading(false);
      }
    }

    fetchOutbox();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-on-surface-variant font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-on-surface flex items-center gap-3">
            <Send className="w-8 h-8 text-primary" />
            Outgoing Box
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
            History of AI-drafted Requests for Information (RFIs) that have passed the Human-In-The-Loop gate and are queued for delivery.
          </p>
        </header>

        {error ? (
          <div className="bg-error/10 border border-error/20 p-4 rounded-xl text-error text-sm font-semibold">
            {error}
          </div>
        ) : approvals.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant p-12 rounded-xl text-center flex flex-col items-center">
            <FileText className="w-12 h-12 text-on-surface-variant mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-on-surface">No Approvals Found</h3>
            <p className="text-sm text-on-surface-variant mt-2">
              When you approve an RFI in the Guardian Control center, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {approvals.map((approval) => (
              <div 
                key={approval.violation_id}
                className="bg-surface-container-low border border-outline-variant rounded-xl p-5 hover:border-primary/30 transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-on-surface">
                        {approval.violation_id.replace(/DEMO-?/gi, "").split(":").join(" ")}
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                        {approval.delivery_channel.replace(/demo_?/gi, "System ")}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant">
                      {approval.message}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 text-xs font-semibold text-on-surface-variant">
                    <span className="flex items-center gap-1.5 bg-surface-container-high px-2.5 py-1 rounded-md border border-outline-variant">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(approval.approved_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-secondary">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {approval.status === "approved_sent" ? "Approved & Queued" : approval.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
