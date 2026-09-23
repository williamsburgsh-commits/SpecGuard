import type { PolicyV1 } from "./schema.js";
import type { AgentStatus, CoreBreachReason } from "../status/types.js";
import { findDisallowedPrograms } from "../solana/venues.js";

export interface TxSnapshot {
  signature: string;
  /** Outgoing SOL + SOL-equivalent of USDC spent in this tx (precomputed by ingest). */
  spendSol: number;
  programIds: readonly string[];
}

export interface AgentMetrics {
  peakEquityUsdc: number;
  currentEquityUsdc: number;
  lastHeartbeatAtSec: number | null;
  nowSec: number;
}

export interface EvaluateInput {
  metrics: AgentMetrics;
  /** New transactions to check (e.g. the webhook batch or pending quote). */
  transactions?: readonly TxSnapshot[];
}

export interface EvaluateResult {
  status: AgentStatus;
  breachReasons: CoreBreachReason[];
}

function evaluateDrawdown(
  policy: PolicyV1,
  metrics: AgentMetrics,
): CoreBreachReason | null {
  const { peakEquityUsdc, currentEquityUsdc } = metrics;
  if (peakEquityUsdc <= 0) return null;
  const ddPct =
    ((peakEquityUsdc - currentEquityUsdc) / peakEquityUsdc) * 100;
  if (ddPct > policy.maxDrawdownPct) return "max_drawdown";
  return null;
}

function evaluateHeartbeat(
  policy: PolicyV1,
  metrics: AgentMetrics,
): CoreBreachReason | null {
  const { lastHeartbeatAtSec, nowSec } = metrics;
  if (lastHeartbeatAtSec == null) return "heartbeat_missed";
  if (nowSec - lastHeartbeatAtSec > policy.heartbeatIntervalSec) {
    return "heartbeat_missed";
  }
  return null;
}

function evaluateTransactions(
  policy: PolicyV1,
  transactions: readonly TxSnapshot[],
): CoreBreachReason[] {
  const reasons = new Set<CoreBreachReason>();
  for (const tx of transactions) {
    if (tx.spendSol > policy.maxSpendPerTxSol) {
      reasons.add("max_spend_per_tx");
    }
    if (
      findDisallowedPrograms(tx.programIds, policy.allowedVenues).length > 0
    ) {
      reasons.add("disallowed_venue");
    }
  }
  return [...reasons];
}

export function evaluate(
  policy: PolicyV1,
  input: EvaluateInput,
): EvaluateResult {
  const breachReasons: CoreBreachReason[] = [];
  const dd = evaluateDrawdown(policy, input.metrics);
  if (dd) breachReasons.push(dd);
  const hb = evaluateHeartbeat(policy, input.metrics);
  if (hb) breachReasons.push(hb);
  if (input.transactions?.length) {
    breachReasons.push(...evaluateTransactions(policy, input.transactions));
  }
  const unique = [...new Set(breachReasons)];
  return {
    status: unique.length === 0 ? "GREEN" : "RED",
    breachReasons: unique,
  };
}
