"use client";

type Provenance = "live" | "demo" | "unavailable" | "degraded" | "submittal";

export default function ProvenanceBadge({
  source = "live",
  note,
  corner = false,
}: {
  source?: Provenance | string;
  note?: string;
  corner?: boolean;
}) {
  const normalized = (source || "live").toLowerCase();
  const isTrusted = normalized === "live" || normalized === "submittal";
  const label =
    normalized === "demo"
      ? "DEMO DATA"
      : normalized === "unavailable"
        ? "UNAVAILABLE"
        : normalized === "degraded"
          ? "FALLBACK"
          : normalized === "submittal"
            ? "VENDOR SUBMITTAL"
            : "LIVE";
  const className = isTrusted
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : "border-amber-400/50 bg-amber-400/15 text-amber-200";

  return (
    <div
      className={`${corner ? "fixed bottom-3 right-3 z-50" : "inline-flex"} max-w-[min(90vw,22rem)] rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] uppercase ${className}`}
      title={note || label}
    >
      {note || label}
    </div>
  );
}
