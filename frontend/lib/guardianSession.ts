import type { GuardianViolation } from "@/components/guardian/types";

export interface GuardianResult {
  submittal_id: string;
  violations: GuardianViolation[];
  r0_max: number;
  rfi_draft: string;
  spec_dna_chain: Record<string, Array<Record<string, unknown>>>;
  violation_count: number;
  status: string;
}

export interface GuardianSessionState {
  analysis: GuardianResult | null;
  selectedViolation: GuardianViolation | null;
  fileName: string;
}

let session: GuardianSessionState = {
  analysis: null,
  selectedViolation: null,
  fileName: "",
};

export function getGuardianSession(): GuardianSessionState {
  return session;
}

export function setGuardianSession(patch: Partial<GuardianSessionState>): void {
  session = { ...session, ...patch };
}

export function clearGuardianSession(): void {
  session = {
    analysis: null,
    selectedViolation: null,
    fileName: "",
  };
}
