"use client";

import { useCallback, useState } from "react";

export function VerifyButton({ wallet }: { wallet: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    reasons: string[];
    markedRed: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(wallet)}/verify`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        status?: string;
        reasons?: string[];
        markedRed?: boolean;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Verify failed (${res.status})`);
      }
      setResult({
        status: json.status ?? "UNKNOWN",
        reasons: json.reasons ?? [],
        markedRed: json.markedRed === true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [wallet]);

  return (
    <div className="mt-4">
      <button type="button" className="sg-btn-ghost h-10 min-h-10" disabled={busy} onClick={() => void run()}>
        {busy ? "Verifying…" : "Re-verify policy"}
      </button>
      {result ? (
        <p className="mt-2 text-sm text-[#8888aa]">
          Status:{" "}
          <strong className={result.status === "RED" ? "text-[#ff3b3b]" : "text-[#00ff88]"}>
            {result.status}
          </strong>
          {result.reasons.length > 0 ? ` — ${result.reasons.join(", ")}` : " — no breaches detected"}
          {result.markedRed ? " (marked RED)" : ""}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-[#ff3b3b]">{error}</p> : null}
    </div>
  );
}
