import { fetchAgentTxCount, fetchAgentTxHistory } from "@/lib/agents/fetchAgentHistory";
import { SPEC_URL } from "@/lib/marketingCopy";
import { computeDisplay } from "@/lib/phoenix/statusDisplay";
import { solscanTx } from "@/lib/solana/explorer";
import { fetchAgentSummary, type AgentSummary } from "@/lib/status/fetchAgentSummary";
import { getSupabasePublic } from "@/lib/supabase/public";
import statusFile from "../../public/status.json";

/** Phoenix operator. The landing receipt is this wallet, not a stand-in. */
export const REFERENCE_WALLET = "2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk";

/** Published in spec/reference-spec.json. Used only when the registry memo has no field. */
const REFERENCE_SPEC = {
  maxDrawdownUsd: 40,
  maxNotionalUsd: 200,
  maxInventoryUsd: 100,
  maxLeverage: 2,
  market: "SOL-PERP",
} as const;

export type Signal = "GREEN" | "RED" | "STALE";

export interface LimitRow {
  label: string;
  value: string;
  /** memo = signed registry policy. spec = reference-spec.json. */
  source: "memo" | "spec";
}

export interface LandingEvent {
  text: string;
}

export interface LandingData {
  wallet: string;
  name: string;
  signal: Signal;
  market: string;
  policyTag: string;
  limits: LimitRow[];
  proofLabel: string;
  proofDisplay: string;
  proofHref: string | null;
  checkedAt: string | null;
  secondary: { label: string; value: string }[];
  events: LandingEvent[];
  /** registry = indexed txs. recorded = status.json. demo = labeled sample. */
  eventSource: "registry" | "recorded" | "demo";
  /** Agent page when this wallet is registered. Phoenix terminal otherwise. */
  profileHref: string;
}

const KIND_LABEL: Record<string, string> = {
  swap: "swap checked",
  limit_create: "limit created",
  limit_cancel: "limit canceled",
  limit_fill: "fill",
  memo_policy: "policy signed",
  memo_heartbeat: "heartbeat",
  memo_flatten: "flatten",
  memo_action: "action logged",
  transfer: "transfer",
  other: "tx checked",
};

function utcClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(11, 19);
}

function shortHash(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function limitsFromSummary(summary: AgentSummary): LimitRow[] {
  const policy = summary.policy;
  const rows: LimitRow[] = [];
  if (policy?.maxDrawdownPct != null) {
    rows.push({
      label: "Max drawdown",
      value: `${policy.maxDrawdownPct}%`,
      source: "memo",
    });
  } else {
    rows.push({
      label: "Max drawdown",
      value: money(REFERENCE_SPEC.maxDrawdownUsd),
      source: "spec",
    });
  }
  if (policy) {
    rows.push({
      label: "Spend cap",
      value: `${policy.maxSpendPerTxSol} SOL / tx`,
      source: "memo",
    });
  }
  if (policy?.allowedVenues?.length) {
    rows.push({
      label: "Allowed venues",
      value: policy.allowedVenues.join(" · "),
      source: "memo",
    });
  } else {
    rows.push({
      label: "Allowed venues",
      value: REFERENCE_SPEC.market,
      source: "spec",
    });
  }
  rows.push({
    label: "Max position",
    value: money(REFERENCE_SPEC.maxNotionalUsd),
    source: "spec",
  });
  return rows;
}

function limitsFromSpec(): LimitRow[] {
  return [
    { label: "Max drawdown", value: money(REFERENCE_SPEC.maxDrawdownUsd), source: "spec" },
    { label: "Max position", value: money(REFERENCE_SPEC.maxNotionalUsd), source: "spec" },
    { label: "Inventory cap", value: money(REFERENCE_SPEC.maxInventoryUsd), source: "spec" },
    { label: "Allowed venues", value: REFERENCE_SPEC.market, source: "spec" },
  ];
}

function recordedEvents(): LandingEvent[] {
  const status = statusFile.status === "RED" ? "RED" : "GREEN";
  const mark = status === "RED" ? "✕" : "✓";
  const rows: { iso: string; text: string }[] = [
    {
      iso: statusFile.last_heartbeat_at,
      text: `${mark} heartbeat · ${statusFile.market} · ${utcClock(statusFile.last_heartbeat_at)}`,
    },
  ];
  if (statusFile.quoting?.last_cycle_at) {
    rows.push({
      iso: statusFile.quoting.last_cycle_at,
      text: `✓ quoted · ${statusFile.market} · ${utcClock(statusFile.quoting.last_cycle_at)}`,
    });
  }
  if (statusFile.fills?.last_fill_at) {
    rows.push({
      iso: statusFile.fills.last_fill_at,
      text: `✓ fill · ${statusFile.market} · ${utcClock(statusFile.fills.last_fill_at)}`,
    });
  }
  return rows.map((row) => ({ text: row.text }));
}

function demoEvents(): LandingEvent[] {
  return [
    { text: "EXAMPLE · precheck passed · SOL-PERP · 14:02:11" },
    { text: "EXAMPLE · heartbeat · SOL-PERP · 14:07:11" },
    { text: "EXAMPLE · spend within cap · SOL-PERP · 14:12:02" },
  ];
}

function secondaryFromStatus(summary: AgentSummary | null): { label: string; value: string }[] {
  const pnl =
    summary?.realizedUsdc != null
      ? money(summary.realizedUsdc)
      : statusFile.pnl?.realized_pnl_usd != null
        ? money(statusFile.pnl.realized_pnl_usd)
        : null;
  const fills = statusFile.fills?.count;
  const quotes = statusFile.quoting?.cycles_total;
  const rows: { label: string; value: string }[] = [];
  if (pnl) rows.push({ label: "Realized", value: pnl });
  if (typeof fills === "number") rows.push({ label: "Fills", value: String(fills) });
  if (typeof quotes === "number") rows.push({ label: "Quotes", value: String(quotes) });
  return rows;
}

function viewFromSummary(
  summary: AgentSummary,
  events: LandingEvent[],
  txCount: number | null,
): LandingData {
  const memoSig = summary.policy?.memoSig ?? summary.registrationSig;
  const checkedAt =
    summary.pnlComputedAt ?? summary.lastTxAt ?? summary.lastHeartbeatAt ?? summary.statusSince;
  const secondary = secondaryFromStatus(summary);
  if (txCount != null) secondary.push({ label: "Indexed txs", value: String(txCount) });

  return {
    wallet: summary.wallet,
    name: summary.name || "Phoenix",
    signal: summary.status,
    market: REFERENCE_SPEC.market,
    policyTag:
      summary.policy != null
        ? `POLICY · v${summary.policy.schemaVersion} · SIGNED`
        : "REFERENCE SPEC · PUBLISHED",
    limits: summary.policy ? limitsFromSummary(summary) : limitsFromSpec(),
    proofLabel: memoSig ? "Policy tx" : "Spec hash",
    proofDisplay: memoSig ? shortHash(memoSig) : shortHash(statusFile.spec_sha256),
    proofHref: memoSig ? solscanTx(memoSig) : SPEC_URL,
    checkedAt,
    secondary,
    events: events.length > 0 ? events : recordedEvents(),
    eventSource: events.length > 0 ? "registry" : "recorded",
    profileHref: `/agent/${summary.wallet}`,
  };
}

function viewFromStatusFile(): LandingData {
  const computed = computeDisplay(statusFile);
  const signal: Signal =
    computed.displayStatus === "RED"
      ? "RED"
      : computed.displayStatus === "GREEN"
        ? "GREEN"
        : "STALE";
  const recorded = recordedEvents();
  return {
    wallet: statusFile.wallet_address || REFERENCE_WALLET,
    name: "Phoenix",
    signal,
    market: statusFile.market || REFERENCE_SPEC.market,
    policyTag: "REFERENCE SPEC",
    limits: [
      ...limitsFromSpec(),
      { label: "Max leverage", value: `${REFERENCE_SPEC.maxLeverage}×`, source: "spec" },
    ],
    proofLabel: "Spec hash",
    proofDisplay: shortHash(statusFile.spec_sha256),
    proofHref: statusFile.spec_url || SPEC_URL,
    checkedAt: statusFile.pnl?.updated_at ?? statusFile.last_heartbeat_at ?? null,
    secondary: secondaryFromStatus(null),
    events: recorded.length > 0 ? recorded : demoEvents(),
    eventSource: recorded.length > 0 ? "recorded" : "demo",
    profileHref: "/phoenix",
  };
}

export async function loadLanding(): Promise<LandingData> {
  try {
    const supabase = getSupabasePublic();
    const summary = await fetchAgentSummary(supabase, REFERENCE_WALLET);
    if (!summary) return viewFromStatusFile();
    const [history, txCount] = await Promise.all([
      fetchAgentTxHistory(supabase, summary.wallet, { limit: 12 }),
      fetchAgentTxCount(supabase, summary.wallet),
    ]);
    const events = history.items.map((tx) => {
      const mark = tx.success ? "✓" : "✕";
      const label = KIND_LABEL[tx.kind] ?? tx.kind;
      return { text: `${mark} ${label} · ${REFERENCE_SPEC.market} · ${utcClock(tx.blocktime)}` };
    });
    return viewFromSummary(summary, events, txCount);
  } catch {
    return viewFromStatusFile();
  }
}
