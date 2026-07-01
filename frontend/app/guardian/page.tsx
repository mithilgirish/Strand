"use client";

import React, { useState } from 'react';
import UploadZone from '@/components/guardian/UploadZone';
import ViolationList from '@/components/guardian/ViolationList';
import RfiPreview from '@/components/guardian/RfiPreview';
import { ShieldAlert } from 'lucide-react';

export default function GuardianAgent() {
  const [hasUploaded, setHasUploaded] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(false);

  const handleUpload = () => {
    setHasUploaded(true);
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
          {!hasUploaded ? (
            <div className="bg-surface-container rounded-xl p-6 border border-outline-variant shadow-lg">
              <UploadZone onUpload={handleUpload} />
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
                    <p className="text-xs text-on-surface-variant">vendor_submittal_cooling_tower.pdf</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setHasUploaded(false); setSelectedViolation(false); }}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest transition-colors"
                >
                  New Scan
                </button>
              </div>
              
              <ViolationList onSelectViolation={() => setSelectedViolation(true)} />
            </div>
          )}
        </div>

        {/* Right Column: RFI Preview */}
        {selectedViolation && (
          <div className="w-[450px] flex-shrink-0 animate-in slide-in-from-right-8 duration-300">
            <RfiPreview />
          </div>
        )}
      </div>
    </div>
  );
}
