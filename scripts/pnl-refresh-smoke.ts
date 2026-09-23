/**
 * Slice 10: refresh PnL snapshot from Supabase transactions + compare to core hand calc.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { computeRealizedPnl } from "@specguard/core";
import { computePnlFromTransactionRows } from "../web/lib/pnl/computeFromTransactions.ts";
import { refreshPnlSnapshot } from "../web/lib/pnl/refreshSnapshot.ts";
import { fetchSolUsdcMark } from "../web/lib/pnl/markPrice.ts";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const wallet =
    process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET ??
    "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";

  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const mark = await fetchSolUsdcMark();
  console.log("mark_usdc", mark);

  const { data: rows, error } = await supabase
    .from("transactions")
    .select(
      "signature, kind, sol_delta_lamports, fee_lamports, token_deltas, success, raw, wallet, blocktime",
    )
    .eq("wallet", wallet)
    .order("blocktime", { ascending: true });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const initial = {
    usdc: Number(process.env.PNL_BASELINE_USDC ?? "0"),
    sol: Number(process.env.PNL_BASELINE_SOL ?? "0"),
  };

  const local = computePnlFromTransactionRows(rows ?? [], initial, mark);
  console.log("local_compute", {
    tradeEventCount: local.tradeEventCount,
    throughSig: local.throughSig,
    realizedUsdc: local.snapshot.realizedUsdc,
    inventorySol: local.snapshot.inventorySol,
    drawdownPct: local.snapshot.drawdownPct,
  });

  const refresh = await refreshPnlSnapshot(supabase, wallet, {
    markUsdcPerSol: mark,
  });
  console.log("refresh", refresh);

  const { data: snap, error: snapErr } = await supabase
    .from("pnl_snapshots")
    .select("*")
    .eq("wallet", wallet)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapErr || !snap) {
    console.error("no snapshot row", snapErr?.message);
    process.exit(1);
  }

  const diff = Math.abs(Number(snap.realized_usdc) - local.snapshot.realizedUsdc);
  if (diff > 0.01) {
    console.error("realized_usdc mismatch", diff);
    process.exit(1);
  }

  console.log("PASS slice10 pnl snapshot matches local hand calc within 0.01 USDC");

  // Sanity: core reference for synthetic two-leg (independent of chain data)
  const ref = computeRealizedPnl(
    [
      { kind: "swap", solDelta: 1, usdcDelta: -100, markUsdcPerSol: 100 },
      { kind: "swap", solDelta: -0.5, usdcDelta: 55, markUsdcPerSol: 110 },
    ],
    { usdc: 1000, sol: 0 },
    110,
  );
  console.log("reference_realized_usdc", ref.realizedUsdc);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
