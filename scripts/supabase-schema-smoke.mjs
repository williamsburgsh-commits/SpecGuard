/**
 * Slice 11 DoD: required tables + agent #1 policy link.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const wallet =
  process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET ??
  "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";

const REQUIRED_TABLES = [
  "agents",
  "policies",
  "transactions",
  "status_events",
  "pnl_snapshots",
  "webhook_events",
  "verify_requests",
];

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

for (const table of REQUIRED_TABLES) {
  const { error: tErr } = await supabase.from(table).select("*").limit(1);
  if (tErr) {
    console.error(`table ${table}:`, tErr.message);
    process.exit(1);
  }
}

const { data, error: sqlErr } = await supabase
  .from("agents")
  .select("wallet, registration_sig, current_policy_id")
  .eq("wallet", wallet)
  .maybeSingle();

if (sqlErr) {
  console.error("agents read:", sqlErr.message);
  process.exit(1);
}

if (!data?.registration_sig) {
  console.error("agent #1 missing registration_sig");
  process.exit(1);
}

if (!data?.current_policy_id) {
  console.error("agent #1 missing current_policy_id (run 0010_seed_agent1_policy)");
  process.exit(1);
}

console.log("PASS: schema tables readable; agent #1 linked to policy");
console.log(
  "NOTE: Dashboard → Database → Publications → supabase_realtime must list agents + status_events",
);
