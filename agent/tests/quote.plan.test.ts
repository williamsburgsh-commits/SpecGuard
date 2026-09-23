import { describe, expect, it } from "vitest";
import { evaluate, type PolicyV1 } from "@specguard/core";
import { effectiveQuoteSizeSol, planQuotes } from "../src/quote/plan.js";

const policy: PolicyV1 = {
  version: 1,
  name: "test",
  maxDrawdownPct: 10,
  maxSpendPerTxSol: 0.5,
  allowedVenues: ["jupiter-swap", "jupiter-trigger"],
  heartbeatIntervalSec: 300,
};

describe("planQuotes + evaluate", () => {
  it("dry-run path is ALLOW for default 0.05 SOL @ 50bps", () => {
    const plan = planQuotes({
      midUsdPerSol: 100,
      sizeSol: 0.05,
      spreadBps: 50,
    });
    const nowSec = 1_700_000_000;
    const result = evaluate(policy, {
      metrics: {
        peakEquityUsdc: 1000,
        currentEquityUsdc: 950,
        lastHeartbeatAtSec: nowSec - 60,
        nowSec,
      },
      transactions: plan.pendingTxChecks,
    });
    expect(result.status).toBe("GREEN");
    expect(plan.sizeSol).toBeGreaterThanOrEqual(0.05);
    expect(Number(plan.bid.makingUsdcRaw) / 1e6).toBeGreaterThanOrEqual(4.9);
  });

  it("simulate breach via max spend on oversized quote", () => {
    const plan = planQuotes({
      midUsdPerSol: 100,
      sizeSol: 0.6,
      spreadBps: 50,
    });
    const result = evaluate(policy, {
      metrics: {
        peakEquityUsdc: 1000,
        currentEquityUsdc: 950,
        lastHeartbeatAtSec: 1_700_000_000,
        nowSec: 1_700_000_100,
      },
      transactions: plan.pendingTxChecks,
    });
    expect(result.status).toBe("RED");
    expect(result.breachReasons).toContain("max_spend_per_tx");
  });

  it("effectiveQuoteSizeSol bumps tiny size to Jupiter min", () => {
    const size = effectiveQuoteSizeSol(200, 0.01);
    expect(size * 200).toBeGreaterThanOrEqual(5);
  });
});
