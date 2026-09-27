import { describe, expect, it } from "vitest";
import {
  evaluateV2,
  hashPolicy,
  encodePolicyMemo,
  decodeMemo,
  parsePolicy,
  PolicyV2Schema,
} from "@specguard/core";
import {
  AGENT_TYPE_OPTIONS,
  defaultPolicyFor,
} from "../lib/register/defaultPolicy";

const nowSec = 1_700_000_000;
const metrics = {
  peakEquityUsdc: 1000,
  currentEquityUsdc: 1000,
  lastHeartbeatAtSec: nowSec,
  nowSec,
};

describe("wizard default policies", () => {
  it("offers every agent type", () => {
    expect(AGENT_TYPE_OPTIONS).toEqual([
      "trader",
      "social",
      "data",
      "infra",
      "general",
    ]);
  });

  for (const type of AGENT_TYPE_OPTIONS) {
    describe(type, () => {
      const policy = defaultPolicyFor(type);

      it("passes schema validation", () => {
        expect(() => PolicyV2Schema.parse(policy)).not.toThrow();
      });

      it("carries the universal limits", () => {
        expect(policy.version).toBe(2);
        expect(policy.type).toBe(type);
        expect(policy.heartbeatIntervalSec).toBeGreaterThanOrEqual(60);
        expect(policy.spendLimits.perTxSol).toBeGreaterThan(0);
      });

      it("evaluates GREEN out of the box", () => {
        expect(evaluateV2(policy, { metrics }).status).toBe("GREEN");
      });

      it("does not block an ordinary tool call by default", () => {
        const r = evaluateV2(policy, {
          metrics,
          actions: [{ type: "api_call", tool: "some-tool", timestampSec: nowSec }],
        });
        expect(r.breachReasons).not.toContain("disallowed_tool");
      });

      it("round-trips through a policy memo", () => {
        const decoded = decodeMemo(encodePolicyMemo(policy));
        expect(decoded?.kind).toBe("policy");
        if (decoded?.kind !== "policy") throw new Error("expected a policy memo");
        expect(decoded.policy).toEqual(policy);
        expect(hashPolicy(decoded.policy)).toBe(hashPolicy(policy));
      });

      it("parses through the version-dispatching parser", () => {
        expect(parsePolicy(policy).version).toBe(2);
      });
    });
  }

  it("gives traders a drawdown limit and venues", () => {
    const p = defaultPolicyFor("trader");
    expect(p.maxDrawdownPct).toBeGreaterThan(0);
    expect(p.allowedVenues?.length).toBeGreaterThan(0);
  });

  it("gives social agents post limits and no drawdown", () => {
    const p = defaultPolicyFor("social");
    expect(p.socialLimits?.maxPostsPerDay).toBeGreaterThan(0);
    expect(p.maxDrawdownPct).toBeUndefined();
    expect(p.allowedVenues).toBeUndefined();
  });

  it("leaves non-trading types free of trading limits", () => {
    for (const type of ["social", "data", "infra", "general"] as const) {
      const p = defaultPolicyFor(type);
      expect(p.maxDrawdownPct).toBeUndefined();
      expect(p.allowedVenues).toBeUndefined();
    }
  });

  it("never seeds an empty allowlist, which would block everything", () => {
    for (const type of AGENT_TYPE_OPTIONS) {
      const p = defaultPolicyFor(type);
      expect(p.allowedTools).not.toEqual([]);
      expect(p.allowedVenues).not.toEqual([]);
    }
  });
});
