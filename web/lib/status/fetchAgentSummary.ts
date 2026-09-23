import type { SupabaseClient } from "@supabase/supabase-js";

export interface AgentSummary {
  wallet: string;
  name: string;
  status: "GREEN" | "RED";
  statusSince: string;
  proofSig: string | null;
  breachReason: string | null;
  registeredAt: string | null;
  registrationSig: string | null;
  lastTxAt: string | null;
  lastTxSig: string | null;
  lastHeartbeatAt: string | null;
  lastHeartbeatSig: string | null;
  realizedUsdc: number | null;
  drawdownPct: number | null;
  markUsdc: number | null;
  pnlComputedAt: string | null;
  policy: {
    name: string;
    maxDrawdownPct: number;
    maxSpendPerTxSol: number;
    heartbeatIntervalSec: number;
    allowedVenues: string[];
    memoSig: string;
  } | null;
}

export async function fetchAgentSummary(
  supabase: SupabaseClient,
  wallet: string,
): Promise<AgentSummary | null> {
  const { data: agent, error } = await supabase
    .from("agents")
    .select(
      "wallet, name, status, status_since, first_breach_event_id, registered_at, registration_sig, last_tx_at, last_tx_sig, last_heartbeat_at, last_heartbeat_sig, current_policy_id",
    )
    .eq("wallet", wallet)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!agent) return null;

  let policy: AgentSummary["policy"] = null;
  if (agent.current_policy_id) {
    const { data: pol } = await supabase
      .from("policies")
      .select(
        "name, max_drawdown_pct, max_spend_per_tx_sol, heartbeat_interval_sec, allowed_venues, memo_sig",
      )
      .eq("id", agent.current_policy_id)
      .maybeSingle();
    if (pol) {
      policy = {
        name: pol.name,
        maxDrawdownPct: Number(pol.max_drawdown_pct),
        maxSpendPerTxSol: Number(pol.max_spend_per_tx_sol),
        heartbeatIntervalSec: pol.heartbeat_interval_sec,
        allowedVenues: pol.allowed_venues ?? [],
        memoSig: pol.memo_sig,
      };
    }
  }

  const { data: pnl } = await supabase
    .from("pnl_snapshots")
    .select("realized_usdc, drawdown_pct, mark_usdc, computed_at")
    .eq("wallet", wallet)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let proofSig: string | null = null;
  let breachReason: string | null = null;
  if (agent.first_breach_event_id) {
    const { data: ev } = await supabase
      .from("status_events")
      .select("proof_sig, reason")
      .eq("id", agent.first_breach_event_id)
      .maybeSingle();
    proofSig = ev?.proof_sig ?? null;
    breachReason = ev?.reason ?? null;
  }

  return {
    wallet: agent.wallet,
    name: agent.name,
    status: agent.status as "GREEN" | "RED",
    statusSince: agent.status_since,
    proofSig,
    breachReason,
    registeredAt: agent.registered_at,
    registrationSig: agent.registration_sig,
    lastTxAt: agent.last_tx_at,
    lastTxSig: agent.last_tx_sig,
    lastHeartbeatAt: agent.last_heartbeat_at,
    lastHeartbeatSig: agent.last_heartbeat_sig,
    realizedUsdc: pnl ? Number(pnl.realized_usdc) : null,
    drawdownPct: pnl ? Number(pnl.drawdown_pct) : null,
    markUsdc: pnl ? Number(pnl.mark_usdc) : null,
    pnlComputedAt: pnl?.computed_at ?? null,
    policy,
  };
}
