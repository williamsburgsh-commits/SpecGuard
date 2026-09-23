export function truncateHash(hash: string | null | undefined) {
  if (!hash || hash.length < 16) return hash || "—";
  return hash.slice(0, 8) + "…" + hash.slice(-8);
}

export function formatUsd(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${Number(n).toFixed(2)}`;
}

export function formatPct(
  n: number | null | undefined,
  { digits = 1, sign = true } = {},
) {
  if (n == null || Number.isNaN(n)) return "—";
  const v = Number(n);
  const prefix = sign && v > 0 ? "+" : "";
  return `${prefix}${v.toFixed(digits)}%`;
}

export function computeTradingReturnPct(pnl: Record<string, unknown> = {}) {
  if (pnl.return_pct != null && !Number.isNaN(Number(pnl.return_pct))) {
    return Number(pnl.return_pct);
  }
  const trading = Number(pnl.trading_pnl_usd);
  const equity = Number(pnl.current_equity_usd);
  if (Number.isFinite(trading) && equity > 0) {
    return (trading / equity) * 100;
  }
  return null;
}

export function capPctFrom(pnl: Record<string, unknown>, key: string) {
  const stored = pnl?.[`${key}_pct_of_cap`];
  if (stored != null && !Number.isNaN(Number(stored))) return Number(stored);
  const limits = (pnl?.spec_limits ?? {}) as Record<string, number>;
  if (key === "drawdown")
    return limitPct(Number(pnl.drawdown_usd ?? 0), limits.max_drawdown_usd ?? 40);
  if (key === "inventory")
    return limitPct(Number(pnl.inventory_usd ?? 0), limits.max_inventory_usd ?? 100);
  if (key === "leverage")
    return limitPct(Number(pnl.leverage ?? 0), limits.max_leverage ?? 2);
  return 0;
}

export function formatAge(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

export type PhoenixStatusData = Record<string, unknown> & {
  status?: string;
  heartbeat_ttl_seconds?: number;
  last_heartbeat_at?: string;
};

export function computeDisplay(statusData: PhoenixStatusData) {
  const ttl = statusData.heartbeat_ttl_seconds || 300;
  const operatorStatus = statusData.status || "UNKNOWN";
  const last = statusData.last_heartbeat_at
    ? Date.parse(statusData.last_heartbeat_at)
    : NaN;
  const ageSec = Number.isNaN(last) ? null : (Date.now() - last) / 1000;
  const isStale =
    !statusData.last_heartbeat_at || (ageSec != null && ageSec > ttl);
  let displayStatus = operatorStatus;
  if (operatorStatus === "GREEN" && isStale) displayStatus = "STALE";
  const copyEligible = operatorStatus === "GREEN" && !isStale;
  return { ttl, operatorStatus, last, ageSec, isStale, displayStatus, copyEligible };
}

export function statusBadgeClass(displayStatus: string) {
  if (displayStatus === "GREEN") return "badge-success";
  if (displayStatus === "RED") return "badge-error";
  if (displayStatus === "STALE") return "badge-warning";
  return "badge-neutral";
}

export function heroHint(
  computed: ReturnType<typeof computeDisplay>,
  pnl: Record<string, unknown>,
) {
  if (computed.displayStatus === "GREEN") {
    if (Number(pnl?.trading_pnl_usd) > 0 || Number(pnl?.return_pct) > 0) {
      return "Operator live — book profitable, copy-trade eligible.";
    }
    return "Operator live — heartbeat fresh, copy-trade eligible.";
  }
  if (computed.displayStatus === "STALE") {
    return `Heartbeat age ${formatAge(computed.ageSec)} (TTL ${computed.ttl}s). Operator may be restarting — check back shortly.`;
  }
  if (computed.displayStatus === "RED") {
    return "Operator in breach or flatten state — copy-trade not eligible.";
  }
  return "Loading operator state…";
}

export function limitProgressClass(pct: number) {
  if (pct >= 90) return "progress-error";
  if (pct >= 70) return "progress-warning";
  return "progress-success";
}

export function limitPct(value: number, max: number) {
  if (max == null || max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}
