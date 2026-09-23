"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { computeDisplay, type PhoenixStatusData } from "./statusDisplay";

export function usePhoenixStatus(pollMs = 15000) {
  const [data, setData] = useState<PhoenixStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/status.json?${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load status.json: HTTP ${res.status}`);
      const json = (await res.json()) as PhoenixStatusData;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  const computed = useMemo(() => (data ? computeDisplay(data) : null), [data]);

  return { data, computed, error, loading, reload: load };
}
