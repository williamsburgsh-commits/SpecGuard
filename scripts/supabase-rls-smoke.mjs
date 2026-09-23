/**
 * Slice 11 DoD: anon SELECT on public registry tables; INSERT denied; webhook internal.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const PUBLIC_READ_TABLES = [
  "agents",
  "policies",
  "status_events",
  "transactions",
  "pnl_snapshots",
];

function isRlsDenied(error) {
  const code = error?.code ?? "";
  const msg = error?.message ?? "";
  return (
    code === "42501" ||
    msg.toLowerCase().includes("row-level security") ||
    msg.toLowerCase().includes("permission denied")
  );
}

for (const table of PUBLIC_READ_TABLES) {
  const { data, error: selectError } = await supabase.from(table).select("*").limit(1);
  if (selectError) {
    console.error(`SELECT ${table} failed:`, selectError.message);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error(`SELECT ${table} did not return an array`);
    process.exit(1);
  }

  const { error: insertError } = await supabase.from(table).insert({
    wallet: "11111111111111111111111111111111",
  });
  if (!insertError) {
    console.error(`INSERT ${table} should have been denied by RLS`);
    process.exit(1);
  }
  if (!isRlsDenied(insertError)) {
    console.error(`Unexpected INSERT error on ${table}:`, insertError);
    process.exit(1);
  }
}

const internalInserts = {
  webhook_events: {
    signature: "1111111111111111111111111111111111111111111111111111111111111111111111111111111111",
    payload: {},
  },
  verify_requests: {
    wallet: "11111111111111111111111111111111",
    ip_hash: "smoke",
  },
};

for (const table of ["webhook_events", "verify_requests"]) {
  const { error: insertError } = await supabase
    .from(table)
    .insert(internalInserts[table]);
  if (!insertError) {
    console.error(`INSERT ${table} should have been denied by RLS`);
    process.exit(1);
  }
  if (!isRlsDenied(insertError)) {
    console.error(`Unexpected INSERT error on ${table}:`, insertError);
    process.exit(1);
  }
}

console.log(
  "PASS: anon SELECT on registry tables; INSERT blocked; webhook/verify internal-only",
);
