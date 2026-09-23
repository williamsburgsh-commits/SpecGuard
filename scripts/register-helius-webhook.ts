/**
 * Create or update Helius enhanced webhook for agent #1 wallet.
 * Requires HELIUS_API_KEY, WEBHOOK_PUBLIC_URL, HELIUS_WEBHOOK_AUTH_HEADER in .env
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

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

const apiKey = process.env.HELIUS_API_KEY;
const baseUrl = process.env.WEBHOOK_PUBLIC_URL?.replace(/\/$/, "");
const wallet =
  process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET ??
  "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";

let authHeader = process.env.HELIUS_WEBHOOK_AUTH_HEADER;
if (!authHeader) {
  authHeader = `Bearer ${randomBytes(24).toString("hex")}`;
  console.log("Generated HELIUS_WEBHOOK_AUTH_HEADER (add to .env):");
  console.log(authHeader);
}

if (!apiKey) {
  console.error("Set HELIUS_API_KEY in .env (dev.helius.xyz)");
  process.exit(1);
}
if (!baseUrl) {
  console.error(
    "Set WEBHOOK_PUBLIC_URL to your deployed Next app, e.g. https://your-app.vercel.app",
  );
  process.exit(1);
}

const webhookURL = `${baseUrl}/api/webhooks/helius`;

const body = {
  webhookURL,
  webhookType: "enhanced",
  accountAddresses: [wallet],
  transactionTypes: ["ANY"],
  authHeader,
};

const res = await fetch(
  `https://api.helius.xyz/v0/webhooks?api-key=${encodeURIComponent(apiKey)}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  },
);

const text = await res.text();
if (!res.ok) {
  console.error("Helius error", res.status, text);
  process.exit(1);
}

const data = JSON.parse(text) as { webhookID?: string };
console.log("Webhook created/updated.");
console.log("webhookURL:", webhookURL);
console.log("HELIUS_WEBHOOK_ID:", data.webhookID ?? "(see response)");
console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
