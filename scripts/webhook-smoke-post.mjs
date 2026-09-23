/**
 * POST a sample enhanced tx twice to local webhook — second call should skip (idempotent).
 * Run: npm run web:dev (port 3001) + set web/.env.local from repo .env
 */
const url = process.env.WEBHOOK_SMOKE_URL ?? "http://localhost:3001/api/webhooks/helius";
const auth = process.env.HELIUS_WEBHOOK_AUTH_HEADER;
const wallet =
  process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET ??
  "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";

if (!auth) {
  console.error("Set HELIUS_WEBHOOK_AUTH_HEADER");
  process.exit(1);
}

const payload = [
  {
    signature: `smoke-${Date.now()}`,
    timestamp: Math.floor(Date.now() / 1000),
    slot: 1,
    fee: 5000,
    feePayer: wallet,
    type: "TRANSFER",
    nativeTransfers: [
      {
        fromUserAccount: wallet,
        toUserAccount: wallet,
        amount: 1_000_000,
      },
    ],
  },
];

async function post(label) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  console.log(label, res.status, json);
}

await post("first");
await post("duplicate");
