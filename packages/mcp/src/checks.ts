import {
  evaluatePolicy,
  PolicySchema,
  type Policy,
  type TxSnapshot,
} from "@specguardxyz/core";

const DAY_SECONDS = 86_400;

export interface HistorySpendRow {
  signature: string;
  blocktime: string;
  success: boolean;
  solDeltaLamports: number;
  feeLamports: number;
}

export interface PrecheckRequest {
  action?: {
    type: string;
    tool?: string;
    platform?: string;
  };
  spendSol?: number;
  programIds?: string[];
}

export interface PrecheckOutcome {
  allowed: boolean;
  reasons: string[];
  policyName: string;
  /** False when no PnL snapshot exists, so drawdown was not judged. */
  drawdownJudged: boolean;
  /** False when a daily cap exists but history could not be loaded. */
  dailySpendChecked: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function policyFromAgentResponse(body: Record<string, unknown>): Policy {
  const agent = asRecord(body.agent);
  if (!agent) throw new Error("Registry response did not include an agent");
  const policy = asRecord(agent.policy);
  if (!policy) throw new Error("Agent has no current policy — register it first");
  const parsed = PolicySchema.safeParse(policy.raw);
  if (!parsed.success) {
    throw new Error(
      "Agent's stored policy could not be parsed — it may predate the current policy schema",
    );
  }
  return parsed.data;
}

function heartbeatSec(agent: Record<string, unknown>): number | null {
  const at = agent.lastHeartbeatAt;
  if (typeof at !== "string") return null;
  const ms = Date.parse(at);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

/** Peak 100 / current 100-dd so a stored drawdown percent can fail the policy. */
export function equityFromDrawdown(drawdownPct: unknown): {
  peakEquityUsdc: number;
  currentEquityUsdc: number;
  judged: boolean;
} {
  if (typeof drawdownPct !== "number" || !Number.isFinite(drawdownPct) || drawdownPct < 0) {
    return { peakEquityUsdc: 0, currentEquityUsdc: 0, judged: false };
  }
  return {
    peakEquityUsdc: 100,
    currentEquityUsdc: Math.max(0, 100 - drawdownPct),
    judged: true,
  };
}

export function historyToSpendSnapshots(
  items: readonly HistorySpendRow[],
  nowSec: number,
): TxSnapshot[] {
  const snapshots: TxSnapshot[] = [];
  for (const item of items) {
    if (!item.success) continue;
    const timestampSec = Math.floor(Date.parse(item.blocktime) / 1000);
    if (!Number.isFinite(timestampSec) || nowSec - timestampSec > DAY_SECONDS) continue;
    let spendSol = 0;
    if (item.solDeltaLamports < 0) spendSol += -item.solDeltaLamports / 1e9;
    spendSol += item.feeLamports / 1e9;
    if (spendSol <= 0) continue;
    snapshots.push({
      signature: item.signature,
      spendSol,
      programIds: [],
      timestampSec,
    });
  }
  return snapshots;
}

/**
 * History page for the daily window. Null when a later page still falls inside
 * the last 24 hours, so a truncated list cannot pass a daily cap.
 */
export function spendHistoryFromResponse(
  body: Record<string, unknown>,
  nowSec: number,
): HistorySpendRow[] | null {
  const rows = historyRowsFromResponse(body);
  if (body.nextBefore == null) return rows;
  let oldestMs = Infinity;
  for (const row of rows) {
    const ms = Date.parse(row.blocktime);
    if (Number.isFinite(ms) && ms < oldestMs) oldestMs = ms;
  }
  if (!Number.isFinite(oldestMs)) return null;
  if (nowSec - oldestMs / 1000 > DAY_SECONDS) return rows;
  return null;
}

export function historyRowsFromResponse(body: Record<string, unknown>): HistorySpendRow[] {
  if (!Array.isArray(body.items)) return [];
  const rows: HistorySpendRow[] = [];
  for (const item of body.items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.signature !== "string" || typeof row.blocktime !== "string") continue;
    rows.push({
      signature: row.signature,
      blocktime: row.blocktime,
      success: row.success !== false,
      solDeltaLamports: typeof row.solDeltaLamports === "number" ? row.solDeltaLamports : 0,
      feeLamports: typeof row.feeLamports === "number" ? row.feeLamports : 0,
    });
  }
  return rows;
}

export function evaluatePrecheck(
  body: Record<string, unknown>,
  history: readonly HistorySpendRow[] | null,
  request: PrecheckRequest,
  nowSec = Math.floor(Date.now() / 1000),
): PrecheckOutcome {
  const agent = asRecord(body.agent);
  if (!agent) throw new Error("Registry response did not include an agent");
  const policy = policyFromAgentResponse(body);
  const equity = equityFromDrawdown(agent.drawdownPct);
  const dailyCap =
    policy.version === 2 && policy.spendLimits.dailySol != null;
  const dailySpendChecked = !dailyCap || history != null;

  const transactions: TxSnapshot[] = history
    ? historyToSpendSnapshots(history, nowSec)
    : [];
  if (request.spendSol != null || request.programIds != null) {
    transactions.push({
      signature: "pending",
      spendSol: request.spendSol ?? 0,
      programIds: request.programIds ?? [],
      timestampSec: nowSec,
    });
  }

  const actions = request.action
    ? [
        {
          type: request.action.type,
          ...(request.action.tool != null ? { tool: request.action.tool } : {}),
          ...(request.action.platform != null ? { platform: request.action.platform } : {}),
          timestampSec: nowSec,
        },
      ]
    : [];

  const result = evaluatePolicy(policy, {
    metrics: {
      peakEquityUsdc: equity.peakEquityUsdc,
      currentEquityUsdc: equity.currentEquityUsdc,
      lastHeartbeatAtSec: heartbeatSec(agent),
      nowSec,
    },
    transactions,
    actions,
  });

  const reasons: string[] = [...result.breachReasons];
  if (agent.status === "RED") {
    const prior =
      typeof agent.breachReason === "string" && agent.breachReason.length > 0
        ? agent.breachReason
        : "already_red";
    if (!reasons.includes(prior)) reasons.unshift(prior);
  }
  if (!dailySpendChecked) reasons.push("daily_spend_unverified");

  return {
    allowed: reasons.length === 0 && result.status === "GREEN",
    reasons,
    policyName: policy.name,
    drawdownJudged: equity.judged,
    dailySpendChecked,
  };
}

export function assertGuardMinimum(prepared: Record<string, unknown>): void {
  if (prepared.meetsMinimum === true) return;
  const held = prepared.guardBalanceRaw ?? "0";
  const min = prepared.minGuardRaw ?? "unknown";
  throw new Error(
    `Wallet holds ${String(held)} raw $GUARD; minimum to register is ${String(min)}`,
  );
}
