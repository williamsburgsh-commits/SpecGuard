import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSolUsdcMark } from "../pnl/markPrice";
import { refreshPnlSnapshot } from "../pnl/refreshSnapshot";
import {
  applyEvaluateBreachIfNeeded,
  loadCurrentPolicy,
} from "../verify/runAgentVerify";

export interface PnlRefreshCronRow {
  wallet: string;
  drawdownPct: number | null;
  markedRed: boolean;
  snapshotId?: string;
  realizedUsdc: number;
}

export async function runPnlRefreshCron(
  supabase: SupabaseClient,
): Promise<PnlRefreshCronRow[]> {
  const { data: agents, error } = await supabase
    .from("agents")
    .select("wallet, status, first_breach_event_id, last_tx_sig")
    .eq("status", "GREEN");

  if (error) throw new Error(`agents load: ${error.message}`);

  const mark = await fetchSolUsdcMark();
  const now = new Date();
  const results: PnlRefreshCronRow[] = [];

  for (const agent of agents ?? []) {
    const pnl = await refreshPnlSnapshot(supabase, agent.wallet, {
      markUsdcPerSol: mark,
    });

    const { data: snap } = await supabase
      .from("pnl_snapshots")
      .select("drawdown_pct")
      .eq("id", pnl.snapshotId ?? "")
      .maybeSingle();

    const drawdownPct =
      snap?.drawdown_pct != null ? Number(snap.drawdown_pct) : null;
    const policy = await loadCurrentPolicy(supabase, agent.wallet);

    let markedRed = false;
    if (
      policy &&
      drawdownPct != null &&
      drawdownPct > policy.maxDrawdownPct
    ) {
      markedRed = await applyEvaluateBreachIfNeeded(
        supabase,
        agent.wallet,
        agent,
        ["max_drawdown"],
        {
          drawdownPct,
          throughSig: pnl.throughSig,
          markUsdc: mark,
          source: "pnl-refresh-cron",
        },
        now,
      );
    }

    results.push({
      wallet: agent.wallet,
      drawdownPct,
      markedRed,
      snapshotId: pnl.snapshotId,
      realizedUsdc: pnl.realizedUsdc,
    });
  }

  return results;
}
