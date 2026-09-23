/**
 * Slice 9 DoD: stale GREEN agent → sweep marks RED (heartbeat_missed).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { sweepStaleHeartbeats } from "../web/lib/cron/heartbeatSweep.ts";

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

  const staleAt = new Date(Date.now() - 700_000).toISOString();

  const { data: before } = await supabase
    .from("agents")
    .select("status, last_heartbeat_at, first_breach_event_id")
    .eq("wallet", wallet)
    .single();

  const priorBreach = before?.first_breach_event_id ?? null;

  await supabase
    .from("agents")
    .update({
      status: "GREEN",
      last_heartbeat_at: staleAt,
      last_heartbeat_sig: "sweep-smoke-stale",
    })
    .eq("wallet", wallet);

  const result = await sweepStaleHeartbeats(supabase, {
    wallet,
    now: new Date(),
  });
  console.log("sweep", result);

  const { data: after } = await supabase
    .from("agents")
    .select("status, first_breach_event_id")
    .eq("wallet", wallet)
    .single();

  const { data: ev } = await supabase
    .from("status_events")
    .select("reason, proof_sig")
    .eq("wallet", wallet)
    .eq("reason", "heartbeat_missed")
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("after", after);
  console.log("event", ev);

  if (result.markedRed !== 1 || after?.status !== "RED" || ev?.reason !== "heartbeat_missed") {
    process.exit(1);
  }
  if (priorBreach && after?.first_breach_event_id !== priorBreach) {
    console.error("first_breach_event_id should be preserved when already set");
    process.exit(1);
  }
  console.log("PASS heartbeat sweep → RED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
