import { isPolicyV2, type Policy, type PolicyV1, type PolicyV2 } from "./schema.js";
import type { AgentStatus, CoreBreachReason } from "../status/types.js";
import { findDisallowedPrograms } from "../solana/venues.js";

export const DAY_SECONDS = 86_400;

export interface TxSnapshot {
  signature: string;
  /** Outgoing SOL + SOL-equivalent of USDC spent in this tx (precomputed by ingest). */
  spendSol: number;
  programIds: readonly string[];
  /**
   * Unix seconds. Required for `spendLimits.dailySol` windowing — transactions
   * without a timestamp are excluded from the daily total, since callers often
   * pass long historical batches.
   */
  timestampSec?: number;
}

/** A non-trading agent action: a post, a tool call, an outbound message. */
export interface ActionSnapshot {
  /** e.g. "social_post", "social_dm", "api_call". */
  type: string;
  /** Tool or MCP tool name, checked against `allowedTools`. */
  tool?: string;
  /** e.g. "x", "telegram", checked against `socialLimits.platforms`. */
  platform?: string;
  /** Unix seconds. Required for `maxPostsPerDay` windowing. */
  timestampSec?: number;
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
  /** Non-trading actions to check against V2 capability limits. Ignored by V1. */
  actions?: readonly ActionSnapshot[];
}

export interface EvaluateResult {
  status: AgentStatus;
  breachReasons: CoreBreachReason[];
}

function evaluateDrawdown(
  maxDrawdownPct: number,
  metrics: AgentMetrics,
): CoreBreachReason | null {
  const { peakEquityUsdc, currentEquityUsdc } = metrics;
  if (peakEquityUsdc <= 0) return null;
  const ddPct = ((peakEquityUsdc - currentEquityUsdc) / peakEquityUsdc) * 100;
  if (ddPct > maxDrawdownPct) return "max_drawdown";
  return null;
}

function evaluateHeartbeat(
  heartbeatIntervalSec: number,
  metrics: AgentMetrics,
): CoreBreachReason | null {
  const { lastHeartbeatAtSec, nowSec } = metrics;
  if (lastHeartbeatAtSec == null) return "heartbeat_missed";
  if (nowSec - lastHeartbeatAtSec > heartbeatIntervalSec) {
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
    if (findDisallowedPrograms(tx.programIds, policy.allowedVenues).length > 0) {
      reasons.add("disallowed_venue");
    }
  }
  return [...reasons];
}

export function evaluate(policy: PolicyV1, input: EvaluateInput): EvaluateResult {
  const breachReasons: CoreBreachReason[] = [];
  const dd = evaluateDrawdown(policy.maxDrawdownPct, input.metrics);
  if (dd) breachReasons.push(dd);
  const hb = evaluateHeartbeat(policy.heartbeatIntervalSec, input.metrics);
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

function withinDay(timestampSec: number | undefined, nowSec: number): boolean {
  if (timestampSec == null) return false;
  return nowSec - timestampSec <= DAY_SECONDS;
}

function evaluateV2Transactions(
  policy: PolicyV2,
  transactions: readonly TxSnapshot[],
  nowSec: number,
): CoreBreachReason[] {
  const reasons = new Set<CoreBreachReason>();
  const { perTxSol, dailySol } = policy.spendLimits;
  let dayTotalSol = 0;

  for (const tx of transactions) {
    if (tx.spendSol > perTxSol) {
      reasons.add("max_spend_per_tx");
    }
    if (policy.allowedVenues != null &&
      findDisallowedPrograms(tx.programIds, policy.allowedVenues).length > 0) {
      reasons.add("disallowed_venue");
    }
    if (dailySol != null && withinDay(tx.timestampSec, nowSec)) {
      dayTotalSol += tx.spendSol;
    }
  }

  if (dailySol != null && dayTotalSol > dailySol) {
    reasons.add("daily_spend_exceeded");
  }
  return [...reasons];
}

function evaluateV2Actions(
  policy: PolicyV2,
  actions: readonly ActionSnapshot[],
  nowSec: number,
): CoreBreachReason[] {
  const reasons = new Set<CoreBreachReason>();
  const denied = new Set(policy.deniedActions ?? []);
  const allowedTools = policy.allowedTools != null
    ? new Set(policy.allowedTools)
    : null;
  const social = policy.socialLimits;
  const platforms = social?.platforms != null ? new Set(social.platforms) : null;
  let postsToday = 0;

  for (const action of actions) {
    if (denied.has(action.type)) {
      reasons.add("denied_action");
    }
    if (allowedTools != null && action.tool != null && !allowedTools.has(action.tool)) {
      reasons.add("disallowed_tool");
    }
    if (social != null) {
      if (social.allowDMs === false && action.type === "social_dm") {
        reasons.add("social_limit_exceeded");
      }
      if (platforms != null && action.platform != null && !platforms.has(action.platform)) {
        reasons.add("social_limit_exceeded");
      }
      if (
        social.maxPostsPerDay != null &&
        action.type === "social_post" &&
        withinDay(action.timestampSec, nowSec)
      ) {
        postsToday += 1;
      }
    }
  }

  if (social?.maxPostsPerDay != null && postsToday > social.maxPostsPerDay) {
    reasons.add("social_limit_exceeded");
  }
  return [...reasons];
}

export function evaluateV2(policy: PolicyV2, input: EvaluateInput): EvaluateResult {
  const breachReasons: CoreBreachReason[] = [];
  const { nowSec } = input.metrics;

  if (policy.maxDrawdownPct != null) {
    const dd = evaluateDrawdown(policy.maxDrawdownPct, input.metrics);
    if (dd) breachReasons.push(dd);
  }
  const hb = evaluateHeartbeat(policy.heartbeatIntervalSec, input.metrics);
  if (hb) breachReasons.push(hb);
  if (input.transactions?.length) {
    breachReasons.push(...evaluateV2Transactions(policy, input.transactions, nowSec));
  }
  if (input.actions?.length) {
    breachReasons.push(...evaluateV2Actions(policy, input.actions, nowSec));
  }

  const unique = [...new Set(breachReasons)];
  return {
    status: unique.length === 0 ? "GREEN" : "RED",
    breachReasons: unique,
  };
}

/** Version-dispatching entry point. Use this for anything policy-version agnostic. */
export function evaluatePolicy(policy: Policy, input: EvaluateInput): EvaluateResult {
  return isPolicyV2(policy) ? evaluateV2(policy, input) : evaluate(policy, input);
}
