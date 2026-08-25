import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeDisplay } from '../lib/statusDisplay';

const BASE = import.meta.env.BASE_URL;

export function useStatus(pollMs = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}status.json?${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load status.json: HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  const computed = useMemo(() => (data ? computeDisplay(data) : null), [data]);

  return { data, computed, error, loading, reload: load };
}
