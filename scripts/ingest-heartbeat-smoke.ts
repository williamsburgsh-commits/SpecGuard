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
  const ts = Math.floor(Date.now() / 1000);
  const signature = `ingest-hb-smoke-${ts}`;
  const memo = `SPECGUARD:v1:HB:${ts}`;

  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const before = await supabase
    .from("agents")
    .select("last_heartbeat_at, last_heartbeat_sig")
    .eq("wallet", wallet)
    .single();

  const result = await ingestHeliusPayload(
    supabase,
    [
      {
        signature,
        timestamp: ts,
        feePayer: wallet,
        logMessages: [`Program log: Memo ${memo}`],
      },
    ],
    { fallbackWallet: wallet },
  );

  const after = await supabase
    .from("agents")
    .select("last_heartbeat_at, last_heartbeat_sig")
    .eq("wallet", wallet)
    .single();

  console.log("ingest", result);
  console.log("before", before.data);
  console.log("after", after.data);

  if (after.data?.last_heartbeat_sig !== signature) {
    process.exit(1);
  }
  console.log("PASS heartbeat ingest");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
