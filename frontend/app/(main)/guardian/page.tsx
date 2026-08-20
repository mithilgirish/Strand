"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import UploadZone from '@/components/guardian/UploadZone';
import ViolationList from '@/components/guardian/ViolationList';
import RfiPreview from '@/components/guardian/RfiPreview';
import { ShieldAlert, Loader2 } from 'lucide-react';
import type { GuardianViolation } from '@/components/guardian/types';
import {
  clearGuardianSession,
  getGuardianSession,
  setGuardianSession,
  type GuardianResult,
} from '@/lib/guardianSession';

function GuardianAgentContent() {
  const remembered = getGuardianSession();
  const [analysis, setAnalysis] = useState<GuardianResult | null>(remembered.analysis);
  const [selectedViolation, setSelectedViolation] = useState<GuardianViolation | null>(remembered.selectedViolation);
  const [fileName, setFileName] = useState(remembered.fileName);
  const [error, setError] = useState('');
  const [loadingReference, setLoadingReference] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("drawingId") || searchParams.get("submittalId") || searchParams.get("refId");
    if (!ref) return;

    const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const refKey = normalise(ref);

    const loadLiveReference = async () => {
      setLoadingReference(true);
      setError("");
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBase}/api/v1/guardian/violations`);
        if (!response.ok) throw new Error(`Guardian lookup failed: ${response.status}`);
        const payload = await response.json();
        const violations = Array.isArray(payload.violations) ? payload.violations as GuardianViolation[] : [];
        const matches = violations.filter((violation) => {
          const haystack = [
            violation.id,
            violation.submittal_id,
            violation.parameter,
            violation.section,
          ].map((value) => normalise(String(value || ""))).join(" ");
          return haystack.includes(refKey);
        });

        if (!matches.length) {
          if (getGuardianSession().analysis) {
            return;
          }
          setAnalysis(null);
          setSelectedViolation(null);
          setError(`No live Guardian analysis found for "${ref}". Upload the source PDF to run the real agent.`);
          return;
        }

        const rfiResponse = await fetch(`${apiBase}/api/v1/guardian/rfi/${encodeURIComponent(matches[0].id)}`);
        const rfiPayload = rfiResponse.ok ? await rfiResponse.json() : {};
        setAnalysis({
          submittal_id: matches[0].submittal_id || ref,
          violation_count: matches.length,
          status: "analyzed",
          r0_max: Math.max(...matches.map((violation) => Number(violation.r0_score || 0))),
          violations: matches,
          rfi_draft: typeof rfiPayload.rfi_draft === "string" ? rfiPayload.rfi_draft : "",
          spec_dna_chain: {},
        });
        setSelectedViolation(matches[0]);
        setGuardianSession({
          analysis: {
            submittal_id: matches[0].submittal_id || ref,
            violation_count: matches.length,
            status: "analyzed",
            r0_max: Math.max(...matches.map((violation) => Number(violation.r0_score || 0))),
            violations: matches,
            rfi_draft: typeof rfiPayload.rfi_draft === "string" ? rfiPayload.rfi_draft : "",
            spec_dna_chain: {},
          },
          selectedViolation: matches[0],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Guardian lookup failed.');
      } finally {
        setLoadingReference(false);
      }
    };

    void loadLiveReference();
  }, [searchParams]);

  const handleUpload = async (file: File) => {
    setError('');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('submittal_id', `SUB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);

      const response = await fetch(`${apiBase}/api/v1/guardian/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `Guardian request failed: ${response.status}`);
      }

      const result = await response.json() as GuardianResult;
      const firstViolation = result.violations?.[0] || null;
      setAnalysis(result);
      setSelectedViolation(firstViolation);
      setFileName(file.name);
      setGuardianSession({
        analysis: result,
        selectedViolation: firstViolation,
        fileName: file.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guardian analysis failed.');
      throw err;
    }
  };

  const handleSelectViolation = (violation: GuardianViolation) => {
    setSelectedViolation(violation);
    setGuardianSession({ selectedViolation: violation });
  };

  const handleNewScan = () => {
    setAnalysis(null);
    setSelectedViolation(null);
    setFileName('');
    setError('');
    clearGuardianSession();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Guardian Analysis
          </h2>
          <p className="text-on-surface-variant mt-1">Upload submittals to scan for specification deviations against TIA-942-B standards.</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Column: Upload & Violations */}
        <div className="flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
          {!analysis ? (
            <div className="bg-surface-container rounded-xl p-6 border border-outline-variant shadow-lg">
              <UploadZone onUpload={handleUpload} />
              {loadingReference && <p className="mt-3 text-sm text-on-surface-variant">Loading live Guardian reference...</p>}
              {error && <p className="mt-3 text-sm text-tertiary">{error}</p>}
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="bg-surface-container rounded-xl p-4 border border-outline-variant shadow-lg mb-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[rgba(255,179,173,0.1)] text-tertiary flex items-center justify-center border border-[rgba(255,179,173,0.3)]">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Analysis Complete</h3>
                    <p className="text-xs text-on-surface-variant">
                      {fileName ? `${fileName} · ` : ""}{analysis.submittal_id}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleNewScan}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest transition-colors"
                >
                  New Scan
                </button>
              </div>
              
              <ViolationList
                violations={analysis.violations}
                specDnaChain={analysis.spec_dna_chain}
                onSelectViolation={handleSelectViolation}
              />
            </div>
          )}
        </div>

        {/* Right Column: RFI Preview */}
        {selectedViolation && (
          <div className="w-[450px] flex-shrink-0 animate-in slide-in-from-right-8 duration-300">
            <RfiPreview
              rfiDraft={analysis?.rfi_draft || ''}
              violationId={selectedViolation.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function GuardianAgent() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-6xl mx-auto flex items-center justify-center min-h-screen text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <GuardianAgentContent />
    </Suspense>
  );
}
