/**
 * Slice 18: cron webhook-sync (Helius PUT + list check).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  fetchHeliusWebhookAddresses,
  listAgentWallets,
  syncHeliusWebhookAddresses,
} from "../web/lib/helius/syncWebhookAddresses.ts";

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
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const agents = await listAgentWallets(supabase);
  console.log("agents", agents.length, agents);

  const synced = await syncHeliusWebhookAddresses(supabase);
  console.log("synced", synced.webhookId, synced.addresses.length);

  const helius = await fetchHeliusWebhookAddresses();
  const missing = agents.filter((w) => !helius.includes(w));
  if (missing.length > 0) {
    console.error("Helius still missing:", missing);
    process.exit(1);
  }

  console.log("PASS slice18 webhook-sync cron");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
