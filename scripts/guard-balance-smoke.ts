/**
 * Slice 13: GET /api/guard/balance — meetsMinimum vs on-chain raw balance.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  meetsGuardMinimum,
  parseGuardMinBalanceRaw,
} from "@specguard/core";
import { getGuardBalanceForWallet } from "../web/lib/guard/balance.ts";

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
  const min = parseGuardMinBalanceRaw(process.env.GUARD_MIN_BALANCE_RAW);
  const demo =
    process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET ??
    "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";
  const empty = "2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk";

  for (const wallet of [demo, empty]) {
    const result = await getGuardBalanceForWallet(wallet);
    const raw = BigInt(result.balanceRaw);
    const expected = meetsGuardMinimum(raw, min);
    if (result.meetsMinimum !== expected) {
      console.error("meetsMinimum mismatch", wallet, result);
      process.exit(1);
    }
    console.log(wallet.slice(0, 8) + "…", {
      balanceDisplay: result.balanceDisplay,
      meetsMinimum: result.meetsMinimum,
      decimals: result.decimals,
    });
  }

  try {
    await getGuardBalanceForWallet("not-a-wallet");
    console.error("expected invalid wallet to throw");
    process.exit(1);
  } catch {
    console.log("invalid wallet rejected");
  }

  console.log("PASS slice13 guard balance");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
