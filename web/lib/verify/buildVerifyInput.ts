import {
  DAY_SECONDS,
  decodeMemo,
  parsePolicy,
  parsePolicyV1,
  parsePolicyV2,
  type ActionSnapshot,
  type AgentType,
  type Policy,
  type TxSnapshot,
  type VenueSlug,
} from "@specguardxyz/core";
import { extractMemoFromNormalizedRaw } from "../helius/registryStatus";
import { txRowToSnapshot, type TxRow } from "./txSnapshot";

/** Match evaluateV2 daily and social windows. */
export const VERIFY_LOOKBACK_SEC = DAY_SECONDS;

/** Cap rows per verify pass; enough for heavy trading days without unbounded scans. */
export const VERIFY_TX_ROW_LIMIT = 2000;

export function verifyLookbackIso(nowSec: number): string {
  return new Date((nowSec - VERIFY_LOOKBACK_SEC) * 1000).toISOString();
}

export function actionSnapshotsFromTxRows(rows: readonly TxRow[]): ActionSnapshot[] {
  const actions: ActionSnapshot[] = [];
  for (const row of rows) {
    const raw = row.raw;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const memo = extractMemoFromNormalizedRaw(raw as Record<string, unknown>);
    if (!memo) continue;
    const decoded = decodeMemo(memo);
    if (decoded?.kind !== "action") continue;
    actions.push({
      type: decoded.type,
      ...(decoded.tool != null ? { tool: decoded.tool } : {}),
      ...(decoded.platform != null ? { platform: decoded.platform } : {}),
      timestampSec: decoded.ts,
    });
  }
  return actions;
}

export function txSnapshotsFromRows(
  rows: readonly TxRow[],
  markUsdcPerSol: number,
): TxSnapshot[] {
  return rows.map((r) => txRowToSnapshot(r, markUsdcPerSol));
}

export interface PolicyRow {
  name: string;
  schema_version?: number | null;
  agent_type?: string | null;
  max_drawdown_pct?: number | string | null;
  max_spend_per_tx_sol: number | string;
  allowed_venues?: string[] | null;
  heartbeat_interval_sec: number;
  daily_spend_sol?: number | string | null;
  social_limits?: Record<string, unknown> | null;
  allowed_tools?: string[] | null;
  denied_actions?: string[] | null;
  raw_json?: unknown;
}

const AGENT_TYPES = new Set<AgentType>([
  "trader",
  "social",
  "data",
  "infra",
  "general",
]);

function agentTypeFromRow(value: string | null | undefined): AgentType {
  if (value != null && AGENT_TYPES.has(value as AgentType)) {
    return value as AgentType;
  }
  return "trader";
}

/** Reconstruct a policy from DB columns when `raw_json` is missing or corrupt. */
export function policyFromPolicyRow(pol: PolicyRow): Policy | null {
  if (pol.raw_json) {
    try {
      return parsePolicy(pol.raw_json);
    } catch {
      /* fall through to columns */
    }
  }

  const schemaVersion = pol.schema_version ?? 1;
  if (schemaVersion === 2) {
    try {
      return parsePolicyV2({
        version: 2,
        name: pol.name,
        type: agentTypeFromRow(pol.agent_type),
        heartbeatIntervalSec: pol.heartbeat_interval_sec,
        spendLimits: {
          perTxSol: Number(pol.max_spend_per_tx_sol),
          ...(pol.daily_spend_sol != null
            ? { dailySol: Number(pol.daily_spend_sol) }
            : {}),
        },
        ...(pol.max_drawdown_pct != null
          ? { maxDrawdownPct: Number(pol.max_drawdown_pct) }
          : {}),
        ...(pol.allowed_venues != null && pol.allowed_venues.length > 0
          ? { allowedVenues: pol.allowed_venues as VenueSlug[] }
          : {}),
        ...(pol.social_limits != null ? { socialLimits: pol.social_limits } : {}),
        ...(pol.allowed_tools != null && pol.allowed_tools.length > 0
          ? { allowedTools: pol.allowed_tools }
          : {}),
        ...(pol.denied_actions != null && pol.denied_actions.length > 0
          ? { deniedActions: pol.denied_actions }
          : {}),
      });
    } catch {
      return null;
    }
  }

  try {
    return parsePolicyV1({
      version: 1,
      name: pol.name,
      maxDrawdownPct: Number(pol.max_drawdown_pct),
      maxSpendPerTxSol: Number(pol.max_spend_per_tx_sol),
      allowedVenues: (pol.allowed_venues ?? []) as VenueSlug[],
      heartbeatIntervalSec: pol.heartbeat_interval_sec,
    });
  } catch {
    return null;
  }
}
