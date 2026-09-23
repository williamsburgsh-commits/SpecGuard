import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
  const wallet =
    process.argv[2] ??
    process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET ??
    "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const sb = createClient(url, key);
  const { data: agent, error } = await sb
    .from("agents")
    .select(
      "wallet, status, status_since, first_breach_event_id, last_tx_sig",
    )
    .eq("wallet", wallet)
    .maybeSingle();
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log("agent:", JSON.stringify(agent, null, 2));

  const { data: events } = await sb
    .from("status_events")
    .select("id, from_status, to_status, reason, proof_sig, occurred_at")
    .eq("wallet", wallet)
    .order("occurred_at", { ascending: false })
    .limit(5);
  console.log("status_events:", JSON.stringify(events, null, 2));

  if (agent?.status !== "RED") process.exit(1);
}

main();
