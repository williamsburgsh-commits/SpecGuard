import { createHash } from "node:crypto";
import type { PolicyV1 } from "./schema.js";

/** Stable key order for onchain memo + registry display. */
export function canonicalPolicyJson(policy: PolicyV1): string {
  const ordered = {
    version: policy.version,
    name: policy.name,
    maxDrawdownPct: policy.maxDrawdownPct,
    maxSpendPerTxSol: policy.maxSpendPerTxSol,
    allowedVenues: [...policy.allowedVenues].sort(),
    heartbeatIntervalSec: policy.heartbeatIntervalSec,
  };
  return JSON.stringify(ordered);
}

export function hashPolicy(policy: PolicyV1): string {
  return createHash("sha256").update(canonicalPolicyJson(policy)).digest("hex");
}
