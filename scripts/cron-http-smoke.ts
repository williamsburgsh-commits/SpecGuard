/**
 * Hit local or production cron routes with CRON_SECRET (optional BASE_URL).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

async function hit(path: string) {
  const base =
    process.env.CRON_SMOKE_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3001";
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET required");
    process.exit(1);
  }
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  console.log(path, res.status, text.slice(0, 500));
  if (!res.ok) process.exit(1);
}

async function main() {
  loadEnv();
  await hit("/api/cron/webhook-sync");
  await hit("/api/cron/pnl-refresh");
  await hit("/api/cron/heartbeat-sweep");
  console.log("PASS cron HTTP smoke");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
