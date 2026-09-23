import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAgentSummary } from "../status/fetchAgentSummary";

export interface StatusEventRow {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  proofSig: string | null;
  occurredAt: string;
  detail: Record<string, unknown>;
}

export interface PolicyHistoryRow {
  id: string;
  version: number;
  memoSig: string;
  blocktime: string;
  name: string;
  policyHash: string;
}

export interface AgentDetail extends NonNullable<
  Awaited<ReturnType<typeof fetchAgentSummary>>
> {
  isSpecguard: boolean;
  statusEvents: StatusEventRow[];
  policyHistory: PolicyHistoryRow[];
}

export async function fetchAgentDetail(
  supabase: SupabaseClient,
  wallet: string,
): Promise<AgentDetail | null> {
  const { data: agentRow } = await supabase
    .from("agents")
    .select("is_specguard")
    .eq("wallet", wallet)
    .maybeSingle();

  if (!agentRow) return null;

  const summary = await fetchAgentSummary(supabase, wallet);
  if (!summary) return null;

  const { data: events } = await supabase
    .from("status_events")
    .select("id, from_status, to_status, reason, proof_sig, occurred_at, detail")
    .eq("wallet", wallet)
    .order("occurred_at", { ascending: false })
    .limit(100);

  const { data: policies } = await supabase
    .from("policies")
    .select("id, version, memo_sig, blocktime, name, policy_hash")
    .eq("wallet", wallet)
    .order("version", { ascending: false });

  return {
    ...summary,
    isSpecguard: agentRow.is_specguard,
    statusEvents: (events ?? []).map((e) => ({
      id: e.id,
      fromStatus: e.from_status,
      toStatus: e.to_status,
      reason: e.reason,
      proofSig: e.proof_sig,
      occurredAt: e.occurred_at,
      detail: (e.detail as Record<string, unknown>) ?? {},
    })),
    policyHistory: (policies ?? []).map((p) => ({
      id: p.id,
      version: p.version,
      memoSig: p.memo_sig,
      blocktime: p.blocktime,
      name: p.name,
      policyHash: p.policy_hash,
    })),
  };
}
