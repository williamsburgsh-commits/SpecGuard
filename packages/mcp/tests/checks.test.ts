import { describe, expect, it } from "vitest";
import {
  assertGuardMinimum,
  evaluatePrecheck,
  spendHistoryFromResponse,
  type HistorySpendRow,
} from "../src/checks.js";

const NOW = 1_700_000_000;

const policy = {
  version: 2,
  name: "desk",
  type: "trader",
  heartbeatIntervalSec: 300,
  spendLimits: { perTxSol: 1, dailySol: 1 },
  maxDrawdownPct: 10,
  allowedVenues: ["jupiter-swap"],
};

function agent(overrides: Record<string, unknown> = {}) {
  return {
    agent: {
      status: "GREEN",
      lastHeartbeatAt: new Date((NOW - 10) * 1000).toISOString(),
      drawdownPct: 0,
      breachReason: null,
      policy: { raw: policy },
      ...overrides,
    },
  };
}

describe("evaluatePrecheck", () => {
  it("does not treat a missing heartbeat as fresh", () => {
    const outcome = evaluatePrecheck(
      agent({ lastHeartbeatAt: null }),
      [],
      {},
      NOW,
    );
    expect(outcome.allowed).toBe(false);
    expect(outcome.reasons).toContain("heartbeat_missed");
  });

  it("fails drawdown from the stored percent", () => {
    const outcome = evaluatePrecheck(agent({ drawdownPct: 25 }), [], {}, NOW);
    expect(outcome.allowed).toBe(false);
    expect(outcome.drawdownJudged).toBe(true);
    expect(outcome.reasons).toContain("max_drawdown");
  });

  it("says when drawdown was not judged", () => {
    const outcome = evaluatePrecheck(agent({ drawdownPct: null }), [], {}, NOW);
    expect(outcome.drawdownJudged).toBe(false);
    expect(outcome.allowed).toBe(true);
  });

  it("blocks an agent the registry already marked RED", () => {
    const outcome = evaluatePrecheck(
      agent({ status: "RED", breachReason: "max_drawdown", drawdownPct: 0 }),
      [],
      {},
      NOW,
    );
    expect(outcome.allowed).toBe(false);
    expect(outcome.reasons).toContain("max_drawdown");
  });

  it("counts recent history toward the daily spend cap", () => {
    const history: HistorySpendRow[] = [
      {
        signature: "hist",
        blocktime: new Date((NOW - 60) * 1000).toISOString(),
        success: true,
        solDeltaLamports: -800_000_000,
        feeLamports: 5_000,
      },
    ];
    const outcome = evaluatePrecheck(agent(), history, { spendSol: 0.3 }, NOW);
    expect(outcome.allowed).toBe(false);
    expect(outcome.reasons).toContain("daily_spend_exceeded");
    expect(outcome.dailySpendChecked).toBe(true);
  });

  it("refuses a daily cap when history could not be loaded", () => {
    const outcome = evaluatePrecheck(agent(), null, { spendSol: 0.1 }, NOW);
    expect(outcome.allowed).toBe(false);
    expect(outcome.dailySpendChecked).toBe(false);
    expect(outcome.reasons).toContain("daily_spend_unverified");
  });
});

describe("spendHistoryFromResponse", () => {
  it("ignores a next page that is already outside the daily window", () => {
    const rows = spendHistoryFromResponse(
      {
        nextBefore: "older",
        items: [
          {
            signature: "recent",
            blocktime: new Date((NOW - 60) * 1000).toISOString(),
            success: true,
            solDeltaLamports: -1,
            feeLamports: 0,
          },
          {
            signature: "old",
            blocktime: new Date((NOW - 90_000) * 1000).toISOString(),
            success: true,
            solDeltaLamports: -1,
            feeLamports: 0,
          },
        ],
      },
      NOW,
    );
    expect(rows).toHaveLength(2);
  });

  it("refuses a page that is still inside the daily window", () => {
    const rows = spendHistoryFromResponse(
      {
        nextBefore: "more",
        items: [
          {
            signature: "recent",
            blocktime: new Date((NOW - 60) * 1000).toISOString(),
            success: true,
            solDeltaLamports: -1,
            feeLamports: 0,
          },
        ],
      },
      NOW,
    );
    expect(rows).toBeNull();
  });
});

describe("assertGuardMinimum", () => {
  it("stops registration under the minimum", () => {
    expect(() =>
      assertGuardMinimum({
        meetsMinimum: false,
        guardBalanceRaw: "1",
        minGuardRaw: "5000000000000000",
      }),
    ).toThrow(/minimum to register/);
  });

  it("allows a wallet that meets the minimum", () => {
    expect(() => assertGuardMinimum({ meetsMinimum: true })).not.toThrow();
  });
});
