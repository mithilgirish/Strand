"use client";

import React, { useState } from 'react';
import UploadZone from '@/components/guardian/UploadZone';
import ViolationList from '@/components/guardian/ViolationList';
import RfiPreview from '@/components/guardian/RfiPreview';
import { ShieldAlert } from 'lucide-react';
import type { GuardianViolation } from '@/components/guardian/types';

interface GuardianResult {
  submittal_id: string;
  violations: GuardianViolation[];
  r0_max: number;
  rfi_draft: string;
  spec_dna_chain: Record<string, Array<Record<string, unknown>>>;
  violation_count: number;
  status: string;
}

export default function GuardianAgent() {
  const [analysis, setAnalysis] = useState<GuardianResult | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<GuardianViolation | null>(null);
  const [error, setError] = useState('');

  const handleUpload = async (file: File) => {
    setError('');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      const lowerName = file.name.toLowerCase();
      formData.append('file', file);
      formData.append(
        'submittal_id',
        lowerName.includes('ups')
          ? 'DEMO-UPS-01'
          : lowerName.includes('generator')
            ? 'DEMO-GEN-01'
            : 'DEMO-CT-01'
      );

      const response = await fetch(`${apiBase}/api/v1/guardian/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `Guardian request failed: ${response.status}`);
      }

      const result = await response.json();
      setAnalysis(result);
      setSelectedViolation(result.violations?.[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guardian analysis failed.');
      throw err;
    }
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
                    <p className="text-xs text-on-surface-variant">{analysis.submittal_id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setAnalysis(null); setSelectedViolation(null); setError(''); }}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest transition-colors"
                >
                  New Scan
                </button>
              </div>
              
              <ViolationList
                violations={analysis.violations}
                specDnaChain={analysis.spec_dna_chain}
                onSelectViolation={setSelectedViolation}
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
