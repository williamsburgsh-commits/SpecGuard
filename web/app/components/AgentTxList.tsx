"use client";

import { useState } from "react";
import { shortPubkey } from "@/lib/format";
import { solscanTx } from "@/lib/solana/explorer";
import type { TxHistoryRow } from "@/lib/agents/fetchAgentHistory";
import { cn } from "@/lib/utils";

function formatAmount(tx: TxHistoryRow) {
  const sol = tx.solDeltaLamports / 1_000_000_000;
  if (Math.abs(sol) < 0.000001) return "—";
  return `${sol > 0 ? "+" : ""}${sol.toFixed(4)} SOL`;
}

function isBreach(tx: TxHistoryRow) {
  const kind = tx.kind.toLowerCase();
  return kind.includes("flatten") || kind.includes("breach") || !tx.success;
}

export function AgentTxList({
  wallet,
  initialItems,
  initialCursor,
}: {
  wallet: string;
  initialItems: TxHistoryRow[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/agents/${wallet}/history?before=${encodeURIComponent(cursor)}&limit=50`,
      );
      const json = (await res.json()) as {
        items?: TxHistoryRow[];
        nextBefore?: string | null;
      };
      if (json.items) setItems((prev) => [...prev, ...json.items!]);
      setCursor(json.nextBefore ?? null);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-[#8888aa]">No indexed transactions yet.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-[#ffffff0f]">
        {items.map((tx) => {
          const breach = isBreach(tx);
          return (
            <li
              key={tx.signature}
              className={cn("flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between", breach && "text-[#ff3b3b]")}
            >
              <div>
                <p className="text-sm">{new Date(tx.blocktime).toLocaleString()}</p>
                <p className="font-mono text-xs uppercase text-[#8888aa]">{tx.kind}</p>
              </div>
              <p className="font-mono text-sm">{formatAmount(tx)}</p>
              <p className="text-xs uppercase tracking-wider">
                {breach ? "breach" : "within policy"}
              </p>
              <a
                href={solscanTx(tx.signature)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-[#00f5c4] hover:underline"
              >
                {shortPubkey(tx.signature, 6)}
              </a>
            </li>
          );
        })}
      </ul>
      {cursor ? (
        <button type="button" className="sg-btn-ghost mt-4" onClick={() => void loadMore()} disabled={loading}>
          {loading ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
