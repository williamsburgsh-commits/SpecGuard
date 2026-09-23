/**
 * POST enhanced payload for a known FLATTEN memo tx to the live webhook.
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

async function main() {
  loadEnv();
  const signature =
    process.argv[2] ??
    "Fsb8oWnmGamVXcpc93ZVo8PUeo5tSSbbaKSocKmYV38v2A8iKkqUr1GDhxbazM1rzaxqWw9ADFqAHQBN3oXsAL1";
  const wallet =
    process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET ??
    "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";
  const auth = process.env.HELIUS_WEBHOOK_AUTH_HEADER;
  const base =
    process.env.WEBHOOK_PUBLIC_URL ??
    "https://web-williams-projects-dd1df2a7.vercel.app";

  if (!auth) {
    console.error("Missing HELIUS_WEBHOOK_AUTH_HEADER");
    process.exit(1);
  }

  const memoText =
    process.argv[3] ??
    'SPECGUARD:v1:FLATTEN:{"reason":"slice7_drill","sigs":["ijqg67WH6dVwFRbfXNdvdBifex2EBcyrv2r4pKBaj7xY7nAqNCCdcbqvWXQoJn5KunQPBV67B5Z9qC7UqsQxBuC","3ctmzsmwUkRwhsXioT4CPzDJGykQqA28o4U2cPuRBCY9VcyWAenR2n5G9B6TLt5FwBYtSUndBLU6YEtEaK89ieVq"]}';

  const payload = [
    {
      signature,
      timestamp: Math.floor(Date.now() / 1000),
      slot: 0,
      fee: 5000,
      feePayer: wallet,
      type: "UNKNOWN",
      logMessages: [`Program log: Memo ${memoText}`],
    },
  ];

  const url = `${base.replace(/\/$/, "")}/api/webhooks/helius`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  console.log("POST", url, res.status, await res.text());
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
