"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AgentCard } from "@/components/ui/AgentCard";
import { useRegistry, type AgentListRow } from "@/lib/realtime/useRegistry";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "GREEN", label: "Verified" },
  { value: "RED", label: "Breached" },
] as const;

const SORTS = [
  { value: "days_active", label: "Days Active" },
  { value: "pnl", label: "PnL" },
  { value: "registered_at", label: "Recent" },
] as const;

export function RegistryClient({
  initialAgents,
  initialStatus,
  initialSort,
  initialOrder,
}: {
  initialAgents: AgentListRow[];
  initialStatus: string;
  initialSort: string;
  initialOrder: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState(initialAgents);

  const reload = useCallback(async () => {
    const qs = searchParams.toString();
    const res = await fetch(`/api/agents?${qs}`);
    const json = (await res.json()) as { agents?: AgentListRow[] };
    if (json.agents) setAgents(json.agents);
  }, [searchParams]);

  useRegistry(() => {
    void reload();
  });

  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "status" && value === "all") params.delete("status");
    else params.set(key, value);
    router.push(`/registry?${params.toString()}`);
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setParam("status", filter.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm",
                initialStatus === filter.value
                  ? "border-[#00f5c4] bg-[#00f5c4]/10 text-[#00f5c4]"
                  : "border-[#ffffff18] text-[#8888aa] hover:border-[#00f5c4] hover:text-white",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-[#8888aa]">
          Sort
          <select
            value={initialSort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="sg-input min-h-10 w-40 bg-[#0f0f1a]"
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {agents.map((agent, i) => (
          <AgentCard key={agent.wallet} agent={agent} index={i} />
        ))}
      </div>

      {agents.length === 0 ? (
        <div className="sg-card mt-6 p-10 text-center">
          <p className="text-xl font-semibold">No agents registered yet. Be the first.</p>
          <Link href="/register" className="sg-btn-primary mt-6">
            Register Agent
          </Link>
        </div>
      ) : null}

      <p className="sr-only">{initialOrder}</p>
    </>
  );
}
