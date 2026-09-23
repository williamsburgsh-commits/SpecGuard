import type { AgentMetrics } from "@specguard/core";
import { fetchSolUsdcMidPrice } from "../jupiter/trigger.js";
import {
  getSolBalanceLamports,
  getUsdcBalanceRaw,
  type AgentBalanceRpc,
} from "../jupiter/preflight.js";
import type { Address } from "@solana/kit";

export interface MetricsContext {
  metrics: AgentMetrics;
  equityUsdc: number;
}

/**
 * Build metrics for quote pre-check.
 * Until Slice 9 heartbeat cron exists, missing heartbeat env defaults to "now" (fresh).
 */
export async function buildQuoteMetrics(
  rpc: AgentBalanceRpc,
  wallet: Address,
  options?: { simulateBreach?: boolean; nowSec?: number },
): Promise<MetricsContext> {
  const nowSec = options?.nowSec ?? Math.floor(Date.now() / 1000);
  const mid = await fetchSolUsdcMidPrice();
  const [solLamports, usdcRaw] = await Promise.all([
    getSolBalanceLamports(rpc, wallet),
    getUsdcBalanceRaw(rpc, wallet),
  ]);
  const sol = Number(solLamports) / 1e9;
  const usdc = Number(usdcRaw) / 1e6;
  const equityUsdc = sol * mid + usdc;

  const peakEnv = process.env.AGENT_PEAK_EQUITY_USDC;
  /** Until PnL snapshots exist, peak defaults to current equity (no false drawdown). */
  const peakEquityUsdc = peakEnv ? Number(peakEnv) : equityUsdc;

  let currentEquityUsdc = equityUsdc;
  if (options?.simulateBreach) {
    currentEquityUsdc = peakEquityUsdc * 0.5;
  }

  const hbEnv = process.env.AGENT_LAST_HEARTBEAT_SEC;
  const lastHeartbeatAtSec =
    hbEnv !== undefined && hbEnv !== ""
      ? Number(hbEnv)
      : nowSec;

  return {
    equityUsdc,
    metrics: {
      peakEquityUsdc,
      currentEquityUsdc,
      lastHeartbeatAtSec,
      nowSec,
    },
  };
}
