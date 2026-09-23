/**
 * Slice 20 — verify production flatten DoD (same as Slice 8 on prod URLs).
 *
 * Usage:
 *   npm run test:production-flatten -- [flattenProofSig]
 *   npm run test:production-flatten -- --from-log logs/flatten/flatten-....json
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
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

interface FlattenLog {
  reason?: string;
  flattenSignature?: string;
  cancelSignatures?: string[];
  swapSignature?: string;
  allSigs?: string[];
}

function loadFlattenFromArg(argv: string[]): FlattenLog | null {
  const fromLog = argv.find((a) => a.startsWith("--from-log="));
  if (fromLog) {
    const path = fromLog.split("=")[1];
    return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
  }
  const proofArg = argv.find((a) => !a.startsWith("-") && a.length > 40);
  if (proofArg) {
    return { flattenSignature: proofArg };
  }
  const dir = resolve(process.cwd(), "logs/flatten");
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();
  for (const f of files) {
    const data = JSON.parse(
      readFileSync(resolve(dir, f), "utf8"),
    ) as FlattenLog;
    if (data.reason?.includes("slice20")) return data;
  }
  return null;
}

async function main() {
  loadEnv();
  const flatten = loadFlattenFromArg(process.argv.slice(2));
  const wallet =
    process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET ??
    "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";
  const proofSig = flatten?.flattenSignature;
  if (!proofSig) {
    console.error(
      "Missing flatten proof sig. Run drill or pass sig / --from-log=path",
    );
    process.exit(1);
  }

  const registryBase =
    process.env.WEBHOOK_PUBLIC_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://web-pi-opal-szwuxtcplv.vercel.app";

  async function fetchProd(path: string) {
    const url = `${registryBase}${path}`;
    let lastErr: unknown;
    for (let i = 0; i < 2; i++) {
      try {
        return await fetch(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(30_000),
        });
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }

  const agentRes = await fetchProd(`/api/agents/${wallet}`);
  const agentJson = (await agentRes.json()) as {
    ok?: boolean;
    agent?: { status?: string; wallet?: string };
  };
  console.log("prod API", agentRes.status, agentJson.agent?.status);
  if (!agentRes.ok || agentJson.agent?.status !== "RED") {
    console.error("FAIL prod agent not RED");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const sb = createClient(url, key);
  const { data: event, error } = await sb
    .from("status_events")
    .select("id, reason, proof_sig, detail, occurred_at")
    .eq("proof_sig", proofSig)
    .maybeSingle();
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log("status_event:", JSON.stringify(event, null, 2));
  if (!event || event.reason !== "flatten_observed") {
    console.error(
      "FAIL no flatten_observed row for proof_sig (Helius → prod webhook?)",
    );
    process.exit(1);
  }

  const badgeRes = await fetchProd(`/badge/${wallet}`);
  const svg = await badgeRes.text();
  console.log(
    "badge",
    badgeRes.status,
    svg.includes("BREACHED") ? "RED" : svg.includes("Verified") ? "GREEN" : "?",
  );
  if (!badgeRes.ok || !svg.includes("BREACHED")) {
    console.error("FAIL prod badge not RED");
    process.exit(1);
  }

  console.log("\nAnnouncement sigs (Slice 20):");
  for (const s of flatten.allSigs ?? [proofSig]) {
    console.log(`  https://solscan.io/tx/${s}`);
  }
  console.log("PASS slice20 production flatten DoD");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
