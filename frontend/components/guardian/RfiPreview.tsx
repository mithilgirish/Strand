"use client";

import React from 'react';
import { Send, FileSignature } from 'lucide-react';

export default function RfiPreview() {
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
{`Project: Strand Facility Upgrade
Date: July 2, 2026
To: CoolTech Industrial
Submittal: DEMO-CT-01

SUBJECT: Critical Deviation in Cooling Tower Specification

We have identified a deviation in the recently submitted equipment specifications that violates the Tier III facility requirements.

PARAMETER            | REQUIRED | SUBMITTED | STATUS
------------------------------------------------------
Max Ambient Temp     | 50°C     | 45°C      | FAIL

REGULATORY CITATION:
TIA-942-B §6.7.1 dictates a minimum operating threshold of 50°C for all external cooling infrastructure to maintain redundancy during peak summer conditions.

IMPACT:
This deviation results in an R0 Contagion Score of 4.2. Failure to comply will jeopardize the Tier III certification.

REQUESTED ACTION:
Please resubmit compliance documentation for a model supporting the 50°C requirement within 5 business days.`}
        </div>
      </div>
      
      <div className="p-4 border-t border-outline-variant bg-surface-container-high">
        <button className="w-full py-3 bg-primary text-on-primary rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors shadow-md">
          <Send className="w-4 h-4" />
          Approve & Send RFI
        </button>
      </div>
    </div>
  );
}
