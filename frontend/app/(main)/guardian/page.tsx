"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import UploadZone from '@/components/guardian/UploadZone';
import ViolationList from '@/components/guardian/ViolationList';
import RfiPreview from '@/components/guardian/RfiPreview';
import { ShieldAlert, Loader2 } from 'lucide-react';
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

function GuardianAgentContent() {
  const [analysis, setAnalysis] = useState<GuardianResult | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<GuardianViolation | null>(null);
  const [error, setError] = useState('');

  const searchParams = useSearchParams();

  useEffect(() => {
    const drawingParam = searchParams.get("drawingId") || searchParams.get("submittalId") || searchParams.get("refId");
    if (drawingParam === "cooling-tower-submittal" || drawingParam === "cooling-tower") {
      const seededResult = {
        submittal_id: "ACC_Submittal_CoolingTower_REV2.pdf",
        violation_count: 1,
        status: "violation",
        r0_max: 2.4,
        violations: [
          {
            id: "viol_ct_01",
            submittal_id: "ACC_Submittal_CoolingTower_REV2.pdf",
            parameter: "ambient_temperature_max",
            required: 50.0,
            actual: 45.0,
            unit: "°C",
            section: "5.3.1",
            r0_score: 3.5,
            severity: "Critical",
            deviation_type: "HVAC Thermal Threshold Limit"
          }
        ],
        rfi_draft: `REQUEST FOR INFORMATION (RFI)
Project: STRAND-DC-01
Subject: Cooling Tower Peak Temperature Threshold Mismatch

DESCRIPTION:
During STRAND AI review of Autodesk submittal "ACC_Submittal_CoolingTower_REV2.pdf", a specification mismatch was detected on TIA-942 HVAC requirements.

The submittal documentation specifies maximum operating ambient air temperature limit of 45.0°C. However, the project specification for thermal clearances (Section 5.3.1) mandates a minimum design threshold of 50.0°C.

IMPACT:
Running equipment under peak summer load with a 45°C limit increases the probability of thermal trip, introducing severe operational risk to the data hall critical path.

REQUESTED ACTION:
Please confirm if the manufacturer can supply cooling modules certified up to 50.0°C, or provide alternative compliance submittal records.`,
        spec_dna_chain: {
          nodes: [
            { id: "clause", label: "SpecClause", text: "TIA-942 Section 5.3.1", value: ">= 50°C" },
            { id: "submittal", label: "VendorSubmittal", text: "ACC_Submittal_CoolingTower_REV2.pdf", value: "45°C" },
            { id: "violation", label: "Violation", text: "ambient_temperature_max Mismatch" },
            { id: "rfi", label: "RfiDraft", text: "RFI-2026-042 (Air Temp Limit)" }
          ],
          edges: [
            { source: "clause", target: "violation" },
            { source: "submittal", target: "violation" },
            { source: "violation", target: "rfi" }
          ]
        }
      };
      setAnalysis(seededResult as any);
      setSelectedViolation(seededResult.violations[0] as any);
    } else if (drawingParam === "switchgear-layout" || drawingParam === "switchgear") {
      const seededResult = {
        submittal_id: "ACC_Electrical_Switchgear_Layout.dwg",
        violation_count: 0,
        status: "compliant",
        r0_max: 0,
        violations: [],
        rfi_draft: "",
        spec_dna_chain: {
          nodes: [
            { id: "clause", label: "SpecClause", text: "TIA-942 Spacing Guideline", value: "Clearance >= 3.0ft" },
            { id: "submittal", label: "VendorSubmittal", text: "ACC_Electrical_Switchgear_Layout.dwg", value: "3.2ft" },
            { id: "verdict", label: "Verdict", text: "Compliant Spacing Verification" }
          ],
          edges: [
            { source: "clause", target: "verdict" },
            { source: "submittal", target: "verdict" }
          ]
        }
      };
      setAnalysis(seededResult as any);
      setSelectedViolation(null);
    }
  }, [searchParams]);

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
