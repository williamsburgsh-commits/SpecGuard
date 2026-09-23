import { describe, expect, it } from "vitest";
import {
  evaluate,
  JUPITER_AGGREGATOR_V6_PROGRAM_ID,
  JUPITER_TRIGGER_PROGRAM_ID,
  type PolicyV1,
} from "../src/index.js";

const basePolicy: PolicyV1 = {
  version: 1,
  name: "test-agent",
  maxDrawdownPct: 10,
  maxSpendPerTxSol: 0.5,
  allowedVenues: ["jupiter-swap", "jupiter-trigger"],
  heartbeatIntervalSec: 300,
};

const metricsGreen = {
  peakEquityUsdc: 1000,
  currentEquityUsdc: 950,
  lastHeartbeatAtSec: 1_000_000,
  nowSec: 1_000_100,
};

describe("evaluate", () => {
  it("returns GREEN when within all limits", () => {
    const result = evaluate(basePolicy, { metrics: metricsGreen });
    expect(result.status).toBe("GREEN");
    expect(result.breachReasons).toEqual([]);
  });

  it("breaches max_drawdown", () => {
    const result = evaluate(basePolicy, {
      metrics: {
        ...metricsGreen,
        currentEquityUsdc: 850,
      },
    });
    expect(result.status).toBe("RED");
    expect(result.breachReasons).toContain("max_drawdown");
  });

  it("breaches max_spend_per_tx", () => {
    const result = evaluate(basePolicy, {
      metrics: metricsGreen,
      transactions: [
        {
          signature: "sig1",
          spendSol: 0.51,
          programIds: [JUPITER_AGGREGATOR_V6_PROGRAM_ID],
        },
      ],
    });
    expect(result.status).toBe("RED");
    expect(result.breachReasons).toContain("max_spend_per_tx");
  });

  it("breaches disallowed_venue", () => {
    const result = evaluate(basePolicy, {
      metrics: metricsGreen,
      transactions: [
        {
          signature: "sig2",
          spendSol: 0.1,
          programIds: [
            JUPITER_AGGREGATOR_V6_PROGRAM_ID,
            "Drift1111111111111111111111111111111111111",
          ],
        },
      ],
    });
    expect(result.status).toBe("RED");
    expect(result.breachReasons).toContain("disallowed_venue");
  });

  it("allows jupiter trigger program when venue enabled", () => {
    const result = evaluate(basePolicy, {
      metrics: metricsGreen,
      transactions: [
        {
          signature: "sig3",
          spendSol: 0.2,
          programIds: [JUPITER_TRIGGER_PROGRAM_ID],
        },
      ],
    });
    expect(result.status).toBe("GREEN");
  });

  it("breaches heartbeat_missed when never seen", () => {
    const result = evaluate(basePolicy, {
      metrics: {
        ...metricsGreen,
        lastHeartbeatAtSec: null,
      },
    });
    expect(result.breachReasons).toContain("heartbeat_missed");
  });

  it("breaches heartbeat_missed when stale", () => {
    const result = evaluate(basePolicy, {
      metrics: {
        ...metricsGreen,
        lastHeartbeatAtSec: 1_000_000,
        nowSec: 1_000_301,
      },
    });
    expect(result.breachReasons).toContain("heartbeat_missed");
  });
});
