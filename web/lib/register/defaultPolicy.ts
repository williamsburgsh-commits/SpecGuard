import type { AgentType, PolicyV2 } from "@specguard/core";

export const AGENT_TYPE_OPTIONS: AgentType[] = [
  "trader",
  "social",
  "data",
  "infra",
  "general",
];

/** A starting policy carrying only the limits that apply to the chosen type. */
export function defaultPolicyFor(type: AgentType): PolicyV2 {
  const base: PolicyV2 = {
    version: 2,
    name: "My SpecGuard Agent",
    type,
    heartbeatIntervalSec: 300,
    spendLimits: { perTxSol: 0.5 },
  };
  switch (type) {
    case "trader":
      return {
        ...base,
        maxDrawdownPct: 10,
        allowedVenues: ["jupiter-swap", "jupiter-trigger"],
      };
    case "social":
      return {
        ...base,
        socialLimits: { maxPostsPerDay: 20, allowDMs: false, platforms: ["x"] },
      };
    case "data":
      return base;
    case "infra":
      return base;
    case "general":
      return base;
  }
}
