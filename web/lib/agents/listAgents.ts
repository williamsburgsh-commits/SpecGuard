import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentSort = "days_active" | "registered_at" | "name" | "pnl";
export type AgentOrder = "asc" | "desc";
export type AgentStatusFilter = "GREEN" | "RED" | "all";

export interface AgentListRow {
  wallet: string;
  name: string;
  status: "GREEN" | "RED";
  statusSince: string;
  registeredAt: string | null;
  daysActive: number | null;
  isSpecguard: boolean;
  lastTxAt: string | null;
  lastVerifiedAt: string | null;
  realizedUsdc: number | null;
  policySummary: string | null;
}

function policySummaryFromRow(policy: {
  max_drawdown_pct: number;
  max_spend_per_tx_sol: number;
  heartbeat_interval_sec: number;
  allowed_venues: string[] | null;
} | null): string | null {
  if (!policy) return null;
  const venues = (policy.allowed_venues ?? []).join(", ");
  const jupiter =
    venues.includes("jupiter") || venues.length > 0 ? "Jupiter" : "—";
  const venueList = (policy.allowed_venues ?? [])
    .map((v) => (v.toLowerCase().includes("phoenix") ? "Phoenix" : v.toLowerCase().includes("jupiter") ? "Jupiter" : v))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(" / ") || jupiter;
  return `Max DD: ${policy.max_drawdown_pct}% | Max TX: ${policy.max_spend_per_tx_sol} SOL | Venues: ${venueList}`;
}

function daysActive(registeredAt: string | null): number | null {
  if (!registeredAt) return null;
  const ms = Date.now() - new Date(registeredAt).getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / 86_400_000);
}

export async function listAgents(
  supabase: SupabaseClient,
  options: {
    status?: AgentStatusFilter;
    sort?: AgentSort;
    order?: AgentOrder;
  },
): Promise<AgentListRow[]> {
  const status = options.status ?? "all";
  const sort = options.sort ?? "days_active";
  const order = options.order ?? "desc";

  let query = supabase.from("agents").select(
    "wallet, name, status, status_since, registered_at, is_specguard, last_tx_at, last_heartbeat_at, current_policy_id",
  );

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: agents, error } = await query;
  if (error) throw new Error(error.message);

  const policyIds = [
    ...new Set(
      (agents ?? [])
        .map((a) => a.current_policy_id)
        .filter((id): id is string => !!id),
    ),
  ];

  const policyById = new Map<
    string,
    {
      max_drawdown_pct: number;
      max_spend_per_tx_sol: number;
      heartbeat_interval_sec: number;
      allowed_venues: string[] | null;
    }
  >();

  if (policyIds.length > 0) {
    const { data: policies } = await supabase
      .from("policies")
      .select(
        "id, max_drawdown_pct, max_spend_per_tx_sol, heartbeat_interval_sec, allowed_venues",
      )
      .in("id", policyIds);
    for (const p of policies ?? []) {
      policyById.set(p.id, p);
    }
  }

  const wallets = (agents ?? []).map((a) => a.wallet);
  const pnlByWallet = new Map<string, number>();
  if (wallets.length > 0) {
    const { data: snapshots } = await supabase
      .from("pnl_snapshots")
      .select("wallet, realized_usdc, computed_at")
      .in("wallet", wallets)
      .order("computed_at", { ascending: false });
    for (const snap of snapshots ?? []) {
      if (!pnlByWallet.has(snap.wallet)) {
        pnlByWallet.set(snap.wallet, Number(snap.realized_usdc));
      }
    }
  }

  const rows: AgentListRow[] = (agents ?? []).map((a) => {
    const pol = a.current_policy_id
      ? policyById.get(a.current_policy_id) ?? null
      : null;
    return {
      wallet: a.wallet,
      name: a.name,
      status: a.status as "GREEN" | "RED",
      statusSince: a.status_since,
      registeredAt: a.registered_at,
      daysActive: daysActive(a.registered_at),
      isSpecguard: a.is_specguard,
      lastTxAt: a.last_tx_at,
      lastVerifiedAt: a.last_heartbeat_at ?? a.last_tx_at ?? a.status_since,
      realizedUsdc: pnlByWallet.get(a.wallet) ?? null,
      policySummary: policySummaryFromRow(pol),
    };
  });

  rows.sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "pnl":
        cmp = (a.realizedUsdc ?? Number.NEGATIVE_INFINITY) - (b.realizedUsdc ?? Number.NEGATIVE_INFINITY);
        break;
      case "registered_at": {
        const ta = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
        const tb = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
        cmp = ta - tb;
        break;
      }
      case "days_active":
      default: {
        const da = a.daysActive ?? -1;
        const db = b.daysActive ?? -1;
        cmp = da - db;
        break;
      }
    }
    return order === "asc" ? cmp : -cmp;
  });

  return rows;
}
