/**
 * Slice 4: ingest twice with same signature → second skipped, one transactions row.
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

  if (!url || !key) {
    console.error(
      "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const signature = `ingest-smoke-${Date.now()}`;
  const payload = {
    signature,
    timestamp: Math.floor(Date.now() / 1000),
    slot: 42,
    fee: 5000,
    feePayer: wallet,
    type: "TRANSFER",
    nativeTransfers: [
      { fromUserAccount: wallet, toUserAccount: wallet, amount: 1_000_000 },
    ],
  };

  const first = await ingestHeliusPayload(supabase, [payload], {
    fallbackWallet: wallet,
  });
  const second = await ingestHeliusPayload(supabase, [payload], {
    fallbackWallet: wallet,
  });

  const { data: row } = await supabase
    .from("transactions")
    .select("signature, kind")
    .eq("signature", signature)
    .maybeSingle();

  console.log("first", first);
  console.log("second", second);
  console.log("row", row);

  if (first.processed !== 1 || second.skipped !== 1 || !row) {
    console.error("FAIL ingest smoke");
    process.exit(1);
  }
  console.log("PASS ingest smoke (idempotent + transactions row)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
