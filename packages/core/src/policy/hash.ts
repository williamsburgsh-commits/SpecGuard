import { createHash } from "node:crypto";
import { isPolicyV2, type Policy, type PolicyV1, type PolicyV2 } from "./schema.js";

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

/**
 * Stable key order for V2. Optional fields are omitted entirely when absent so
 * that two policies differing only by an explicit `undefined` hash identically.
 */
export function canonicalPolicyJsonV2(policy: PolicyV2): string {
  const ordered: Record<string, unknown> = {
    version: policy.version,
    name: policy.name,
    type: policy.type,
    heartbeatIntervalSec: policy.heartbeatIntervalSec,
    spendLimits: {
      perTxSol: policy.spendLimits.perTxSol,
      ...(policy.spendLimits.dailySol != null
        ? { dailySol: policy.spendLimits.dailySol }
        : {}),
    },
  };
  if (policy.maxDrawdownPct != null) {
    ordered.maxDrawdownPct = policy.maxDrawdownPct;
  }
  if (policy.allowedVenues != null) {
    ordered.allowedVenues = [...policy.allowedVenues].sort();
  }
  if (policy.socialLimits != null) {
    const s = policy.socialLimits;
    ordered.socialLimits = {
      ...(s.maxPostsPerDay != null ? { maxPostsPerDay: s.maxPostsPerDay } : {}),
      ...(s.allowDMs != null ? { allowDMs: s.allowDMs } : {}),
      ...(s.platforms != null ? { platforms: [...s.platforms].sort() } : {}),
    };
  }
  if (policy.allowedTools != null) {
    ordered.allowedTools = [...policy.allowedTools].sort();
  }
  if (policy.deniedActions != null) {
    ordered.deniedActions = [...policy.deniedActions].sort();
  }
  return JSON.stringify(ordered);
}

export function canonicalPolicyJsonAny(policy: Policy): string {
  return isPolicyV2(policy)
    ? canonicalPolicyJsonV2(policy)
    : canonicalPolicyJson(policy);
}

export function hashPolicy(policy: Policy): string {
  return createHash("sha256").update(canonicalPolicyJsonAny(policy)).digest("hex");
}
