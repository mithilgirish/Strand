"use client";

import { useEffect, useState } from "react";
import ProvenanceBadge from "@/components/shared/ProvenanceBadge";

export default function DemoModeBanner() {
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiBase}/api/v1/project/summary`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.demo_mode) setDemo(true);
      })
      .catch(() => {});
  }, []);

  if (!demo) return null;
  return (
    <ProvenanceBadge
      source="demo"
      note="DEMO MODE — labeled fallbacks may appear"
      corner
    />
  );
}
