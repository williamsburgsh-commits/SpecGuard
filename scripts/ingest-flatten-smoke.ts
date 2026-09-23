/**
 * Slice 8: ingest FLATTEN memo payload → agents RED + status_events.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ingestHeliusPayload } from "../web/lib/helius/ingest.ts";

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
  const signature =
    process.argv[2] ??
    "Fsb8oWnmGamVXcpc93ZVo8PUeo5tSSbbaKSocKmYV38v2A8iKkqUr1GDhxbazM1rzaxqWw9ADFqAHQBN3oXsAL1";
  const memoText =
    'SPECGUARD:v1:FLATTEN:{"reason":"slice7_drill","sigs":["ijqg67WH6dVwFRbfXNdvdBifex2EBcyrv2r4pKBaj7xY7nAqNCCdcbqvWXQoJn5KunQPBV67B5Z9qC7UqsQxBuC","3ctmzsmwUkRwhsXioT4CPzDJGykQqA28o4U2cPuRBCY9VcyWAenR2n5G9B6TLt5FwBYtSUndBLU6YEtEaK89ieVq"]}';

  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const payload = {
    signature,
    timestamp: Math.floor(Date.now() / 1000),
    feePayer: wallet,
    logMessages: [`Program log: Memo ${memoText}`],
  };

  const result = await ingestHeliusPayload(supabase, [payload], {
    fallbackWallet: wallet,
  });
  console.log("ingest", result);

  const { data: agent } = await supabase
    .from("agents")
    .select("status, first_breach_event_id")
    .eq("wallet", wallet)
    .single();
  const { data: ev } = await supabase
    .from("status_events")
    .select("reason, proof_sig")
    .eq("proof_sig", signature)
    .maybeSingle();

  console.log("agent", agent);
  console.log("event", ev);

  if (agent?.status !== "RED" || !ev) {
    process.exit(1);
  }
  console.log("PASS flatten → RED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
