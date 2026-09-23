"use client";

import { useAgentStatus, type LiveAgentStatus } from "@/lib/realtime/useAgentStatus";
import { StatusBadge } from "./StatusBadge";
import { solscanTx } from "@/lib/solana/explorer";

export function AgentStatusChip({
  wallet,
  initial,
  proofSig,
  breachReason,
}: {
  wallet: string;
  initial: LiveAgentStatus;
  proofSig: string | null;
  breachReason: string | null;
}) {
  const live = useAgentStatus(wallet, initial);
  const isRed = live.status === "RED";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <StatusBadge status={live.status} size="md" />
        <span className="font-mono text-sm text-[#8888aa]">
          since {new Date(live.statusSince).toLocaleString()}
        </span>
      </div>
      {isRed && (
        <div className="border border-[#ff3b3b]/30 bg-[#ff3b3b]/10 px-3 py-2.5">
          <p className="flex flex-wrap items-center gap-2 text-sm text-[#ff3b3b]">
            <span>{breachReason ? breachReason.replace(/_/g, " ") : "Breach recorded"}</span>
            {proofSig && (
              <a
                href={solscanTx(proofSig)}
                target="_blank"
                rel="noreferrer"
                className="font-mono underline"
              >
                Proof tx
              </a>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
