import type { SupabaseClient } from "@supabase/supabase-js";
import type { PnlInitialBalances } from "@specguard/core";
import { tokenDeltasForWallet, tokenDeltasToJson } from "../helius/tokenDeltas";
import { computePnlFromTransactionRows } from "./computeFromTransactions";
import type { TransactionRowForPnl } from "./buildEvents";
import { fetchSolUsdcMark } from "./markPrice";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function enrichTokenDeltas(
  row: TransactionRowForPnl & { raw?: unknown; wallet?: string },
): TransactionRowForPnl {
  const existing = row.token_deltas ?? {};
  if (Object.keys(existing).length > 0) return row;
  const raw = asRecord(row.raw);
  const wallet = row.wallet;
  if (!raw || !wallet) return row;
  return {
    ...row,
    token_deltas: tokenDeltasToJson(tokenDeltasForWallet(raw, wallet)),
  };
}

function initialBalancesFromEnv(): PnlInitialBalances {
  const usdc = Number(process.env.PNL_BASELINE_USDC ?? "0");
  const sol = Number(process.env.PNL_BASELINE_SOL ?? "0");
  return {
    usdc: Number.isFinite(usdc) ? usdc : 0,
    sol: Number.isFinite(sol) ? sol : 0,
  };
}

export interface RefreshPnlResult {
  wallet: string;
  inserted: boolean;
  snapshotId?: string;
  realizedUsdc: number;
  throughSig: string | null;
  tradeEventCount: number;
  markUsdc: number;
}

export async function refreshPnlSnapshot(
  supabase: SupabaseClient,
  wallet: string,
  options?: { markUsdcPerSol?: number },
): Promise<RefreshPnlResult> {
  const mark =
    options?.markUsdcPerSol ?? (await fetchSolUsdcMark());
  const initial = initialBalancesFromEnv();

  const { data: rows, error } = await supabase
    .from("transactions")
    .select(
      "signature, kind, sol_delta_lamports, fee_lamports, token_deltas, success, raw, wallet",
    )
    .eq("wallet", wallet)
    .order("blocktime", { ascending: true });

  if (error) throw new Error(`transactions load: ${error.message}`);

  const enriched = (rows ?? []).map((r) =>
    enrichTokenDeltas(r as TransactionRowForPnl & { raw: unknown; wallet: string }),
  );

  const { snapshot, throughSig, tradeEventCount } =
    computePnlFromTransactionRows(enriched, initial, mark);

  const { data: inserted, error: insErr } = await supabase
    .from("pnl_snapshots")
    .insert({
      wallet,
      realized_usdc: snapshot.realizedUsdc,
      inventory_sol: snapshot.inventorySol,
      avg_cost_usdc: snapshot.avgCostUsdcPerSol,
      baseline_usdc: initial.usdc,
      peak_equity_usdc: snapshot.peakEquityUsdc,
      drawdown_pct: snapshot.drawdownPct,
      mark_usdc: mark,
      through_sig: throughSig,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(`pnl_snapshots insert: ${insErr.message}`);

  return {
    wallet,
    inserted: true,
    snapshotId: inserted?.id,
    realizedUsdc: snapshot.realizedUsdc,
    throughSig,
    tradeEventCount,
    markUsdc: mark,
  };
}

export async function refreshPnlForWalletsWithRecentTrades(
  supabase: SupabaseClient,
): Promise<RefreshPnlResult[]> {
  const { data: agents, error } = await supabase
    .from("agents")
    .select("wallet")
    .not("last_tx_at", "is", null);

  if (error) throw new Error(`agents load: ${error.message}`);

  const mark = await fetchSolUsdcMark();
  const results: RefreshPnlResult[] = [];
  for (const agent of agents ?? []) {
    results.push(
      await refreshPnlSnapshot(supabase, agent.wallet, {
        markUsdcPerSol: mark,
      }),
    );
  }
  return results;
}
