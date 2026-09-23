"use client";

import { useCallback, useState } from "react";
import { GUARD_BUY_URL } from "@/lib/phoenix/constants";

export interface GuardBalancePayload {
  balanceRaw: string;
  decimals: number;
  balanceDisplay: string;
  minBalanceRaw: string;
  minBalanceDisplay: string;
  minWholeTokens: number;
  meetsMinimum: boolean;
  mint: string;
}

export function GuardBalanceGate({
  wallet,
  onBalance,
}: {
  wallet: string;
  onBalance?: (payload: GuardBalancePayload | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GuardBalancePayload | null>(null);

  const check = useCallback(async () => {
    const trimmed = wallet.trim();
    if (!trimmed) {
      setError("Enter a wallet address first.");
      setData(null);
      onBalance?.(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guard/balance?wallet=${encodeURIComponent(trimmed)}`);
      const json = (await res.json()) as GuardBalancePayload & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const payload: GuardBalancePayload = {
        balanceRaw: json.balanceRaw,
        decimals: json.decimals,
        balanceDisplay: json.balanceDisplay,
        minBalanceRaw: json.minBalanceRaw,
        minBalanceDisplay: json.minBalanceDisplay,
        minWholeTokens: json.minWholeTokens,
        meetsMinimum: json.meetsMinimum,
        mint: json.mint,
      };
      setData(payload);
      onBalance?.(payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setData(null);
      onBalance?.(null);
    } finally {
      setLoading(false);
    }
  }, [wallet, onBalance]);

  return (
    <div className="sg-card p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-[#8888aa]">Step 2</p>
      <h2 className="mt-2 text-2xl font-bold">Check $GUARD balance</h2>
      <p className="mt-3 text-sm text-[#8888aa]">
        You need{" "}
        <strong className="text-white">
          {(data?.minWholeTokens ?? 5_000_000).toLocaleString()} $GUARD
        </strong>{" "}
        to register. Your balance: {data ? `${data.balanceDisplay} $GUARD` : "—"}
      </p>
      <button
        type="button"
        className="sg-btn-primary mt-6 w-full"
        onClick={() => void check()}
        disabled={loading || !wallet.trim()}
      >
        {loading ? "Checking…" : "Check $GUARD balance"}
      </button>
      {error ? (
        <p className="mt-4 text-sm text-[#ff3b3b]">{error}</p>
      ) : null}
      {data ? (
        <div
          className={`mt-6 rounded-2xl border p-4 ${
            data.meetsMinimum
              ? "border-[#00ff88]/40 bg-[#00ff88]/8"
              : "border-[#ff3b3b]/40 bg-[#ff3b3b]/8"
          }`}
        >
          <p className={`font-semibold ${data.meetsMinimum ? "text-[#00ff88]" : "text-[#ff3b3b]"}`}>
            {data.meetsMinimum
              ? "Balance meets the 5M $GUARD gate."
              : `You need 5,000,000 $GUARD to register. Your balance: ${data.balanceDisplay} $GUARD`}
          </p>
          {!data.meetsMinimum ? (
            <a
              href={GUARD_BUY_URL}
              target="_blank"
              rel="noreferrer"
              className="sg-btn-ghost mt-4"
            >
              Buy $GUARD
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
