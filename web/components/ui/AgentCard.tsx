"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { generateIdenticon, shortPubkey, timeAgo } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import type { AgentListRow } from "@/lib/agents/listAgents";

function formatPnl(value: number | null | undefined) {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function AgentCard({
  agent,
  index = 0,
}: {
  agent: AgentListRow;
  index?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [copied, setCopied] = useState(false);
  const breached = agent.status === "RED";
  const pnlTone =
    agent.realizedUsdc == null
      ? "text-[#8888aa]"
      : agent.realizedUsdc >= 0
        ? "text-[#00ff88]"
        : "text-[#ff3b3b]";

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={reduced ? undefined : { y: -4, boxShadow: "0 18px 40px #00000080" }}
      className={cn(
        "sg-card relative overflow-hidden p-5",
        breached && "bg-[#ff3b3b08]",
      )}
    >
      {breached ? (
        <motion.span
          className="absolute inset-y-0 left-0 w-1 bg-[#ff3b3b]"
          initial={reduced ? false : { opacity: 0.3 }}
          animate={reduced ? undefined : { opacity: [0.3, 1, 0.55] }}
          transition={{ duration: 0.8, times: [0, 0.4, 1] }}
        />
      ) : (
        <span className="absolute inset-y-0 left-0 w-1 bg-[#00ff8822]" />
      )}

      <div className="flex flex-col gap-4 pl-2 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={generateIdenticon(agent.wallet, 44)}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="truncate text-base font-semibold">{agent.name}</h3>
            <StatusBadge status={agent.status} size="sm" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-[#8888aa]">
            <span>{shortPubkey(agent.wallet, 4)}</span>
            <button
              type="button"
              className="rounded-full border border-[#ffffff18] px-2 py-0.5 text-[10px] uppercase tracking-wider hover:border-[#00f5c4] hover:text-[#00f5c4]"
              onClick={async (e) => {
                e.preventDefault();
                await navigator.clipboard.writeText(agent.wallet);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#8888aa]">
            {agent.policySummary ?? "Policy unpublished"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm sm:w-72 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#8888aa]">Days</p>
            <p className="mt-1 font-semibold">{agent.daysActive ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#8888aa]">Verified</p>
            <p className="mt-1 text-xs">
              {agent.lastVerifiedAt ? timeAgo(agent.lastVerifiedAt) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#8888aa]">PnL</p>
            <p className={cn("mt-1 font-semibold", pnlTone)}>
              {formatPnl(agent.realizedUsdc)}
            </p>
          </div>
        </div>
        <Link
          href={`/agent/${agent.wallet}`}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ffffff18] text-[#8888aa] hover:border-[#00f5c4] hover:text-[#00f5c4]"
          aria-label={`Open ${agent.name}`}
        >
          →
        </Link>
      </div>
    </motion.article>
  );
}
