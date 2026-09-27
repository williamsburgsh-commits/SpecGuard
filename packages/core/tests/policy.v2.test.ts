import { describe, expect, it } from "vitest";
import {
  canonicalPolicyJsonV2,
  evaluatePolicy,
  evaluateV2,
  hashPolicy,
  isPolicyV2,
  JUPITER_AGGREGATOR_V6_PROGRAM_ID,
  parsePolicy,
  parsePolicyV2,
  policyPerTxSol,
  type PolicyV1,
  type PolicyV2,
} from "../src/index.js";

const traderV2: PolicyV2 = {
  version: 2,
  name: "trader-agent",
  type: "trader",
  heartbeatIntervalSec: 300,
  spendLimits: { perTxSol: 0.5 },
  maxDrawdownPct: 10,
  allowedVenues: ["jupiter-swap", "jupiter-trigger"],
};

const socialV2: PolicyV2 = {
  version: 2,
  name: "social-agent",
  type: "social",
  heartbeatIntervalSec: 600,
  spendLimits: { perTxSol: 0.1, dailySol: 1 },
  socialLimits: { maxPostsPerDay: 2, allowDMs: false, platforms: ["x"] },
};

const generalV2: PolicyV2 = {
  version: 2,
  name: "general-agent",
  type: "general",
  heartbeatIntervalSec: 300,
  spendLimits: { perTxSol: 1 },
  allowedTools: ["jupiter-swap", "firecrawl-search"],
  deniedActions: ["transfer_to_unknown"],
};

const now = 1_000_100;
const metricsGreen = {
  peakEquityUsdc: 1000,
  currentEquityUsdc: 950,
  lastHeartbeatAtSec: 1_000_000,
  nowSec: now,
};

describe("PolicyV2 schema", () => {
  it("parses a valid trader policy", () => {
    expect(parsePolicyV2(traderV2)).toEqual(traderV2);
  });

  it("parses a social policy with no trading fields", () => {
    expect(parsePolicyV2(socialV2)).toEqual(socialV2);
  });

  it("rejects a policy missing spendLimits", () => {
    expect(() =>
      parsePolicyV2({
        version: 2,
        name: "bad",
        type: "general",
        heartbeatIntervalSec: 300,
      }),
    ).toThrow();
  });

  it("rejects an unknown agent type", () => {
    expect(() => parsePolicyV2({ ...socialV2, type: "wizard" })).toThrow();
  });

  it("rejects a trader policy with no venues", () => {
    expect(() =>
      parsePolicyV2({
        ...traderV2,
        allowedVenues: [],
      }),
    ).toThrow();
  });

  it("rejects an empty allowedTools list", () => {
    expect(() =>
      parsePolicyV2({
        ...generalV2,
        allowedTools: [],
      }),
    ).toThrow();
  });

  it("rejects a heartbeat interval below 60s", () => {
    expect(() =>
      parsePolicyV2({ ...socialV2, heartbeatIntervalSec: 30 }),
    ).toThrow();
  });

  it("discriminates V1 and V2 through the union", () => {
    const v1: PolicyV1 = {
      version: 1,
      name: "legacy",
      maxDrawdownPct: 10,
      maxSpendPerTxSol: 0.5,
      allowedVenues: ["jupiter-swap"],
      heartbeatIntervalSec: 300,
    };
    expect(isPolicyV2(parsePolicy(v1))).toBe(false);
    expect(isPolicyV2(parsePolicy(traderV2))).toBe(true);
  });

  it("reads per-tx spend from either version", () => {
    expect(policyPerTxSol(traderV2)).toBe(0.5);
    expect(
      policyPerTxSol({
        version: 1,
        name: "legacy",
        maxDrawdownPct: 10,
        maxSpendPerTxSol: 0.25,
        allowedVenues: ["jupiter-swap"],
        heartbeatIntervalSec: 300,
      }),
    ).toBe(0.25);
  });
});

describe("PolicyV2 hashing", () => {
  it("is deterministic regardless of array order", () => {
    const a = hashPolicy(traderV2);
    const b = hashPolicy({
      ...traderV2,
      allowedVenues: ["jupiter-trigger", "jupiter-swap"],
    });
    expect(a).toBe(b);
  });

  it("omits absent optional fields from canonical json", () => {
    const json = canonicalPolicyJsonV2(socialV2);
    expect(json).not.toContain("maxDrawdownPct");
    expect(json).not.toContain("allowedVenues");
    expect(json).toContain("socialLimits");
  });

  it("produces different hashes for different policies", () => {
    expect(hashPolicy(traderV2)).not.toBe(hashPolicy(socialV2));
  });

  it("hashes V1 and V2 through the same entry point", () => {
    const v1: PolicyV1 = {
      version: 1,
      name: "legacy",
      maxDrawdownPct: 10,
      maxSpendPerTxSol: 0.5,
      allowedVenues: ["jupiter-swap"],
      heartbeatIntervalSec: 300,
    };
    expect(hashPolicy(v1)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashPolicy(traderV2)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("evaluateV2 — universal limits", () => {
  it("returns GREEN within all limits", () => {
    const r = evaluateV2(traderV2, { metrics: metricsGreen });
    expect(r.status).toBe("GREEN");
    expect(r.breachReasons).toEqual([]);
  });

  it("breaches heartbeat_missed when stale", () => {
    const r = evaluateV2(socialV2, {
      metrics: { ...metricsGreen, lastHeartbeatAtSec: now - 601 },
    });
    expect(r.breachReasons).toContain("heartbeat_missed");
  });

  it("breaches max_spend_per_tx", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      transactions: [{ signature: "s1", spendSol: 0.2, programIds: [] }],
    });
    expect(r.breachReasons).toContain("max_spend_per_tx");
  });

  it("breaches daily_spend_exceeded across timestamped txs", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      transactions: [
        { signature: "s1", spendSol: 0.09, programIds: [], timestampSec: now - 10 },
        { signature: "s2", spendSol: 0.09, programIds: [], timestampSec: now - 20 },
        { signature: "s3", spendSol: 0.09, programIds: [], timestampSec: now - 30 },
        { signature: "s4", spendSol: 0.09, programIds: [], timestampSec: now - 40 },
        { signature: "s5", spendSol: 0.09, programIds: [], timestampSec: now - 50 },
        { signature: "s6", spendSol: 0.09, programIds: [], timestampSec: now - 60 },
        { signature: "s7", spendSol: 0.09, programIds: [], timestampSec: now - 70 },
        { signature: "s8", spendSol: 0.09, programIds: [], timestampSec: now - 80 },
        { signature: "s9", spendSol: 0.09, programIds: [], timestampSec: now - 90 },
        { signature: "s10", spendSol: 0.09, programIds: [], timestampSec: now - 100 },
        { signature: "s11", spendSol: 0.09, programIds: [], timestampSec: now - 110 },
        { signature: "s12", spendSol: 0.09, programIds: [], timestampSec: now - 120 },
      ],
    });
    expect(r.breachReasons).toContain("daily_spend_exceeded");
  });

  it("excludes txs outside the day window from the daily total", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      transactions: [
        { signature: "old1", spendSol: 0.09, programIds: [], timestampSec: now - 90_000 },
        { signature: "old2", spendSol: 0.09, programIds: [], timestampSec: now - 95_000 },
        { signature: "new1", spendSol: 0.09, programIds: [], timestampSec: now - 10 },
      ],
    });
    expect(r.breachReasons).not.toContain("daily_spend_exceeded");
  });

  it("excludes untimestamped txs from the daily total", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      transactions: Array.from({ length: 30 }, (_, i) => ({
        signature: `hist${i}`,
        spendSol: 0.09,
        programIds: [],
      })),
    });
    expect(r.breachReasons).not.toContain("daily_spend_exceeded");
  });
});

describe("evaluateV2 — trader limits", () => {
  it("breaches max_drawdown when set", () => {
    const r = evaluateV2(traderV2, {
      metrics: { ...metricsGreen, currentEquityUsdc: 850 },
    });
    expect(r.breachReasons).toContain("max_drawdown");
  });

  it("skips drawdown when maxDrawdownPct is absent", () => {
    const r = evaluateV2(socialV2, {
      metrics: { ...metricsGreen, currentEquityUsdc: 1 },
    });
    expect(r.breachReasons).not.toContain("max_drawdown");
  });

  it("breaches disallowed_venue when venues are set", () => {
    const r = evaluateV2(traderV2, {
      metrics: metricsGreen,
      transactions: [
        {
          signature: "s1",
          spendSol: 0.1,
          programIds: ["Drift1111111111111111111111111111111111111"],
        },
      ],
    });
    expect(r.breachReasons).toContain("disallowed_venue");
  });

  it("skips venue checks when allowedVenues is absent", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      transactions: [
        {
          signature: "s1",
          spendSol: 0.01,
          programIds: ["Drift1111111111111111111111111111111111111"],
        },
      ],
    });
    expect(r.breachReasons).not.toContain("disallowed_venue");
  });

  it("allows an in-policy venue", () => {
    const r = evaluateV2(traderV2, {
      metrics: metricsGreen,
      transactions: [
        {
          signature: "s1",
          spendSol: 0.1,
          programIds: [JUPITER_AGGREGATOR_V6_PROGRAM_ID],
        },
      ],
    });
    expect(r.status).toBe("GREEN");
  });
});

describe("evaluateV2 — social limits", () => {
  it("breaches when DMs are disallowed", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      actions: [{ type: "social_dm", platform: "x", timestampSec: now }],
    });
    expect(r.breachReasons).toContain("social_limit_exceeded");
  });

  it("breaches on an off-policy platform", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      actions: [{ type: "social_post", platform: "telegram", timestampSec: now }],
    });
    expect(r.breachReasons).toContain("social_limit_exceeded");
  });

  it("breaches when posts exceed maxPostsPerDay", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      actions: [
        { type: "social_post", platform: "x", timestampSec: now - 1 },
        { type: "social_post", platform: "x", timestampSec: now - 2 },
        { type: "social_post", platform: "x", timestampSec: now - 3 },
      ],
    });
    expect(r.breachReasons).toContain("social_limit_exceeded");
  });

  it("stays GREEN at the post limit", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      actions: [
        { type: "social_post", platform: "x", timestampSec: now - 1 },
        { type: "social_post", platform: "x", timestampSec: now - 2 },
      ],
    });
    expect(r.status).toBe("GREEN");
  });

  it("excludes posts older than a day from the count", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      actions: [
        { type: "social_post", platform: "x", timestampSec: now - 90_000 },
        { type: "social_post", platform: "x", timestampSec: now - 95_000 },
        { type: "social_post", platform: "x", timestampSec: now - 1 },
      ],
    });
    expect(r.status).toBe("GREEN");
  });
});

describe("evaluateV2 — capability limits", () => {
  it("breaches denied_action", () => {
    const r = evaluateV2(generalV2, {
      metrics: metricsGreen,
      actions: [{ type: "transfer_to_unknown", timestampSec: now }],
    });
    expect(r.breachReasons).toContain("denied_action");
  });

  it("breaches disallowed_tool", () => {
    const r = evaluateV2(generalV2, {
      metrics: metricsGreen,
      actions: [{ type: "api_call", tool: "drift-perps", timestampSec: now }],
    });
    expect(r.breachReasons).toContain("disallowed_tool");
  });

  it("allows an in-policy tool", () => {
    const r = evaluateV2(generalV2, {
      metrics: metricsGreen,
      actions: [{ type: "api_call", tool: "firecrawl-search", timestampSec: now }],
    });
    expect(r.status).toBe("GREEN");
  });

  it("skips tool checks when allowedTools is absent", () => {
    const r = evaluateV2(socialV2, {
      metrics: metricsGreen,
      actions: [{ type: "api_call", tool: "anything", platform: "x", timestampSec: now }],
    });
    expect(r.breachReasons).not.toContain("disallowed_tool");
  });
});

describe("evaluatePolicy dispatcher", () => {
  it("routes a V1 policy to the V1 engine", () => {
    const v1: PolicyV1 = {
      version: 1,
      name: "legacy",
      maxDrawdownPct: 10,
      maxSpendPerTxSol: 0.5,
      allowedVenues: ["jupiter-swap"],
      heartbeatIntervalSec: 300,
    };
    expect(evaluatePolicy(v1, { metrics: metricsGreen }).status).toBe("GREEN");
    expect(
      evaluatePolicy(v1, {
        metrics: { ...metricsGreen, currentEquityUsdc: 850 },
      }).breachReasons,
    ).toContain("max_drawdown");
  });

  it("routes a V2 policy to the V2 engine", () => {
    expect(evaluatePolicy(socialV2, { metrics: metricsGreen }).status).toBe("GREEN");
    expect(
      evaluatePolicy(socialV2, {
        metrics: metricsGreen,
        actions: [{ type: "social_dm", timestampSec: now }],
      }).breachReasons,
    ).toContain("social_limit_exceeded");
  });

  it("ignores V2-only action input for a V1 policy", () => {
    const v1: PolicyV1 = {
      version: 1,
      name: "legacy",
      maxDrawdownPct: 10,
      maxSpendPerTxSol: 0.5,
      allowedVenues: ["jupiter-swap"],
      heartbeatIntervalSec: 300,
    };
    const r = evaluatePolicy(v1, {
      metrics: metricsGreen,
      actions: [{ type: "social_dm", timestampSec: now }],
    });
    expect(r.status).toBe("GREEN");
  });
});
