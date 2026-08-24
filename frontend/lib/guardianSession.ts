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

const STORAGE_KEY = "strand_guardian_session";

const emptySession = (): GuardianSessionState => ({
  analysis: null,
  selectedViolation: null,
  fileName: "",
});

let memory: GuardianSessionState = emptySession();
let hydrated = false;

function consumeReloadClear(): boolean {
  if (typeof window === "undefined" || typeof performance === "undefined") return false;
  const entries = performance.getEntriesByType("navigation");
  const nav = entries[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type !== "reload") return false;
  const token = String(performance.timeOrigin);
  try {
    const seen = window.sessionStorage.getItem("strand_guardian_reload_token");
    if (seen === token) return false;
    window.sessionStorage.setItem("strand_guardian_reload_token", token);
  } catch {
    return true;
  }
  return true;
}

function readStorage(): GuardianSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuardianSessionState>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      analysis: parsed.analysis ?? null,
      selectedViolation: parsed.selectedViolation ?? null,
      fileName: parsed.fileName ?? "",
    };
  } catch {
    return null;
  }
}

function writeStorage(state: GuardianSessionState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private-mode failures
  }
}

function ensureHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  if (consumeReloadClear()) {
    memory = emptySession();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    return;
  }
  const stored = readStorage();
  if (stored?.analysis) {
    memory = stored;
  }
}

export function getGuardianSession(): GuardianSessionState {
  ensureHydrated();
  return memory;
}

export function setGuardianSession(patch: Partial<GuardianSessionState>): void {
  ensureHydrated();
  memory = { ...memory, ...patch };
  writeStorage(memory);
}

export function clearGuardianSession(): void {
  memory = emptySession();
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
