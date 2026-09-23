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
  const sig =
    process.argv[2] ??
    "oaHjSUfe58SzGcqi4mWuUNtbFxvzADEp44pkNRPzgEdVThQYucis7mY2RN5ojnJust1zEZjYJGLmy4LjZLZD1Uf";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const sb = createClient(url, key);
  const { data, error } = await sb
    .from("transactions")
    .select("signature, kind, wallet, blocktime, created_at")
    .eq("signature", sig)
    .maybeSingle();
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(data ? JSON.stringify(data, null, 2) : "NOT FOUND");
  process.exit(data ? 0 : 1);
}

main();
