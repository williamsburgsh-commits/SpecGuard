import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env");
  process.exit(1);
}

const skip = new Set([
  "GITHUB_TOKEN",
  "CLAWPUMP_API_KEY",
  "AGENT_KEYPAIR_PATH",
  "AGENT_POLICY_MEMO_SIG",
]);
const allowPrefix = [
  "NEXT_PUBLIC_",
  "SUPABASE_",
  "HELIUS_",
  "CRON_",
  "WEBHOOK_",
  "GUARD_",
  "PNL_",
  "JUPITER_",
];
const allowExact = new Set(["SOLANA_RPC_URL"]);

let count = 0;
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  if (!value || skip.has(key)) continue;
  if (!allowPrefix.some((prefix) => key.startsWith(prefix)) && !allowExact.has(key)) {
    continue;
  }
  const railwayBin =
    process.platform === "win32"
      ? path.join(process.env.APPDATA ?? "", "npm", "railway.cmd")
      : "railway";
  execFileSync(
    railwayBin,
    ["variable", "set", key, "--stdin", "--service", "specguard", "--skip-deploys"],
    { input: value, stdio: ["pipe", "ignore", "ignore"], shell: process.platform === "win32" },
  );
  count += 1;
}

console.log(`Synced ${count} env vars to Railway specguard.`);
