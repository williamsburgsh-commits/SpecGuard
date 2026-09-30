import statusJson from "../../public/status.json";

export interface OperatorStatus {
  status: "GREEN" | "RED";
  wallet: string;
  market: string;
  realizedPnlUsd: number;
  fills: number;
  quotePosts: number;
  lastHeartbeatAt: string;
}

const raw = statusJson as {
  status: string;
  market: string;
  wallet_address: string;
  last_heartbeat_at: string;
  quoting?: { posts_total?: number };
  fills?: { count?: number };
  pnl?: { realized_pnl_usd?: number };
};

export function loadOperatorStatus(): OperatorStatus {
  return {
    status: raw.status === "RED" ? "RED" : "GREEN",
    wallet: raw.wallet_address,
    market: raw.market,
    realizedPnlUsd: raw.pnl?.realized_pnl_usd ?? 0,
    fills: raw.fills?.count ?? 0,
    quotePosts: raw.quoting?.posts_total ?? 0,
    lastHeartbeatAt: raw.last_heartbeat_at,
  };
}
