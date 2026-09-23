import {
  evaluate,
  parsePolicyV1,
  USDC_MINT,
  type CoreBreachReason,
  type PolicyV1,
  type TxSnapshot,
} from "@specguard/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshPnlSnapshot } from "../pnl/refreshSnapshot";

interface TxRow {
  signature: string;
  program_ids: string[] | null;
  sol_delta_lamports: number | string;
  fee_lamports: number | string;
  token_deltas: Record<string, string> | null;
  success: boolean;
}

export function txRowToSnapshot(
  row: TxRow,
  markUsdcPerSol: number,
): TxSnapshot {
  const programIds = row.program_ids ?? [];
  if (!row.success) {
    return { signature: row.signature, spendSol: 0, programIds };
  }

  let spendSol = 0;
  const solDelta = Number(row.sol_delta_lamports);
  if (solDelta < 0) spendSol += -solDelta / 1e9;
  spendSol += Number(row.fee_lamports) / 1e9;

  const mark = markUsdcPerSol > 0 ? markUsdcPerSol : 1;
  for (const [mint, raw] of Object.entries(row.token_deltas ?? {})) {
    if (mint !== USDC_MINT) continue;
    try {
      const delta = BigInt(raw);
      if (delta < 0n) {
        spendSol += Number(-delta) / 1e6 / mark;
      }
    } catch {
      /* skip */
    }
  }

  return { signature: row.signature, spendSol, programIds };
}

export async function loadCurrentPolicy(
  supabase: SupabaseClient,
  wallet: string,
): Promise<PolicyV1 | null> {
  const { data: agent } = await supabase
    .from("agents")
    .select("current_policy_id")
    .eq("wallet", wallet)
    .maybeSingle();

  if (!agent?.current_policy_id) return null;

  const { data: pol } = await supabase
    .from("policies")
    .select(
      "name, max_drawdown_pct, max_spend_per_tx_sol, allowed_venues, heartbeat_interval_sec, raw_json",
    )
    .eq("id", agent.current_policy_id)
    .maybeSingle();

  if (!pol) return null;

  try {
    return parsePolicyV1({
      version: 1,
      name: pol.name,
      maxDrawdownPct: Number(pol.max_drawdown_pct),
      maxSpendPerTxSol: Number(pol.max_spend_per_tx_sol),
      allowedVenues: pol.allowed_venues,
      heartbeatIntervalSec: pol.heartbeat_interval_sec,
    });
  } catch {
    if (pol.raw_json) {
      return parsePolicyV1(pol.raw_json);
    }
    return null;
  }
}

export async function applyEvaluateBreachIfNeeded(
  supabase: SupabaseClient,
  wallet: string,
  agent: {
    status: string;
    first_breach_event_id: string | null;
    last_tx_sig: string | null;
  },
  reasons: CoreBreachReason[],
  detail: Record<string, unknown>,
  now: Date,
): Promise<boolean> {
  if (agent.status !== "GREEN" || reasons.length === 0) {
    return false;
  }

  const reason = reasons[0]!;
  const proofSig = reason === "heartbeat_missed" ? null : agent.last_tx_sig;

  const { data: inserted, error: insertErr } = await supabase
    .from("status_events")
    .insert({
      wallet,
      from_status: "GREEN",
      to_status: "RED",
      reason,
      proof_sig: proofSig,
      detail: { ...detail, evaluateReasons: reasons },
      occurred_at: now.toISOString(),
    })
    .select("id")
    .single();

  if (insertErr) {
    throw new Error(`status_events insert: ${insertErr.message}`);
  }

  const patch: Record<string, unknown> = {
    status: "RED",
    status_since: now.toISOString(),
  };
  if (!agent.first_breach_event_id && inserted?.id) {
    patch.first_breach_event_id = inserted.id;
  }

  const { error: updateErr } = await supabase
    .from("agents")
    .update(patch)
    .eq("wallet", wallet)
    .eq("status", "GREEN");

  if (updateErr) {
    throw new Error(`agents RED update: ${updateErr.message}`);
  }

  return true;
}

export interface RunAgentVerifyResult {
  status: "GREEN" | "RED";
  reasons: CoreBreachReason[];
  checkedThroughSig: string | null;
  computedAt: string;
  markedRed: boolean;
  drawdownPct: number | null;
  realizedUsdc: number | null;
}

export async function runAgentVerify(
  supabase: SupabaseClient,
  wallet: string,
): Promise<RunAgentVerifyResult> {
  const now = new Date();

  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select(
      "wallet, status, first_breach_event_id, last_heartbeat_at, last_tx_sig",
    )
    .eq("wallet", wallet)
    .maybeSingle();

  if (agentErr) throw new Error(agentErr.message);
  if (!agent) throw new Error("Agent not registered");

  const policy = await loadCurrentPolicy(supabase, wallet);
  if (!policy) throw new Error("No active policy for agent");

  const pnl = await refreshPnlSnapshot(supabase, wallet);

  const { data: snapRow } = await supabase
    .from("pnl_snapshots")
    .select(
      "peak_equity_usdc, drawdown_pct, realized_usdc, inventory_sol, baseline_usdc",
    )
    .eq("id", pnl.snapshotId ?? "")
    .maybeSingle();

  const peakEquity = Number(snapRow?.peak_equity_usdc ?? 0);
  const inventory = Number(snapRow?.inventory_sol ?? 0);
  const realized = Number(snapRow?.realized_usdc ?? pnl.realizedUsdc);
  const baseline = Number(snapRow?.baseline_usdc ?? 0);
  const currentEquity = baseline + realized + inventory * pnl.markUsdc;

  const { data: txRows, error: txErr } = await supabase
    .from("transactions")
    .select(
      "signature, program_ids, sol_delta_lamports, fee_lamports, token_deltas, success",
    )
    .eq("wallet", wallet)
    .order("blocktime", { ascending: false })
    .limit(100);

  if (txErr) throw new Error(`transactions load: ${txErr.message}`);

  const snapshots = (txRows ?? []).map((r) =>
    txRowToSnapshot(r as TxRow, pnl.markUsdc),
  );

  const lastHbSec = agent.last_heartbeat_at
    ? Math.floor(new Date(agent.last_heartbeat_at).getTime() / 1000)
    : null;

  const evaluation = evaluate(policy, {
    metrics: {
      peakEquityUsdc: Math.max(peakEquity, currentEquity),
      currentEquityUsdc: currentEquity,
      lastHeartbeatAtSec: lastHbSec,
      nowSec: Math.floor(now.getTime() / 1000),
    },
    transactions: snapshots,
  });

  let markedRed = false;
  if (agent.status === "GREEN" && evaluation.status === "RED") {
    markedRed = await applyEvaluateBreachIfNeeded(
      supabase,
      wallet,
      agent,
      evaluation.breachReasons,
      {
        drawdownPct: snapRow?.drawdown_pct ?? null,
        throughSig: pnl.throughSig,
        markUsdc: pnl.markUsdc,
      },
      now,
    );
  }

  const finalStatus: "GREEN" | "RED" =
    markedRed || agent.status === "RED" ? "RED" : "GREEN";

  return {
    status: finalStatus,
    reasons: evaluation.breachReasons,
    checkedThroughSig: pnl.throughSig,
    computedAt: now.toISOString(),
    markedRed,
    drawdownPct:
      snapRow?.drawdown_pct != null ? Number(snapRow.drawdown_pct) : null,
    realizedUsdc: realized,
  };
}
