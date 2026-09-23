import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(repoRoot, "web");
const outPath = path.join(webDir, ".env.local");

const publicVars = new Map();

function applyLine(line) {
  const t = line.trim();
  if (!t || t.startsWith("#")) return;
  const eq = t.indexOf("=");
  if (eq === -1) return;
  const key = t.slice(0, eq).trim();
  if (!key.startsWith("NEXT_PUBLIC_")) return;
  let value = t.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  publicVars.set(key, value);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    applyLine(line);
  }
}

for (const name of [".env.local", ".env"]) {
  loadEnvFile(path.join(repoRoot, name));
}

if (!publicVars.has("NEXT_PUBLIC_SOLANA_RPC_URL")) {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(repoRoot, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t.startsWith("HELIUS_API_KEY=")) continue;
      const key = t.slice("HELIUS_API_KEY=".length).trim();
      publicVars.set(
        "NEXT_PUBLIC_SOLANA_RPC_URL",
        `https://mainnet.helius-rpc.com/?api-key=${key}`,
      );
      break;
    }
  }
}

const body = [...publicVars.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}=${v}`)
  .join("\n");

fs.writeFileSync(outPath, body ? `${body}\n` : "", "utf8");
