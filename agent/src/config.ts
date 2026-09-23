import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parsePolicyV1, type PolicyV1 } from "@specguard/core";
import { repoRootPath } from "./loadEnv.js";

export const DEFAULT_KEYPAIR_PATH = resolve(
  repoRootPath(),
  "agent/.keys/v2-agent.json",
);

export const MIN_PUBLISH_LAMPORTS = 5_000_000n; // ~0.005 SOL headroom for fees

export function resolveKeypairPath(): string {
  return process.env.AGENT_KEYPAIR_PATH ?? DEFAULT_KEYPAIR_PATH;
}

export function resolveRpcUrl(): string {
  return (
    process.env.AGENT_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.mainnet-beta.solana.com"
  );
}

export interface QuoteConfig {
  sizeSol: number;
  spreadBps: number;
  cycleMs: number;
  solFeeReserveSol: number;
}

export function loadQuoteConfig(): QuoteConfig {
  return {
    sizeSol: Number(process.env.AGENT_QUOTE_SIZE_SOL ?? "0.05"),
    spreadBps: Number(process.env.AGENT_SPREAD_BPS ?? "50"),
    cycleMs: Number(process.env.AGENT_CYCLE_MS ?? "300000"),
    solFeeReserveSol: Number(process.env.AGENT_SOL_FEE_RESERVE ?? "0.05"),
  };
}

export function loadPolicyFromEnv(): PolicyV1 {
  const json = process.env.AGENT_POLICY_JSON;
  if (json) {
    return parsePolicyV1(JSON.parse(json));
  }
  const file =
    process.env.AGENT_POLICY_FILE ??
    resolve(repoRootPath(), "agent/config/default-policy.json");
  if (!existsSync(file)) {
    throw new Error(`Policy file not found: ${file}`);
  }
  return parsePolicyV1(JSON.parse(readFileSync(file, "utf8")));
}
