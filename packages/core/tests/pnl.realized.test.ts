import { describe, expect, it } from "vitest";
import { computeRealizedPnl } from "../src/index.js";

describe("computeRealizedPnl", () => {
  it("realizes PnL on average-cost sells", () => {
    const events = [
      {
        kind: "swap" as const,
        solDelta: 1,
        usdcDelta: -100,
        markUsdcPerSol: 100,
      },
      {
        kind: "limit_fill" as const,
        solDelta: -0.5,
        usdcDelta: 55,
        markUsdcPerSol: 110,
      },
    ];
    const snap = computeRealizedPnl(events, { usdc: 1000, sol: 0 }, 110);
    expect(snap.realizedUsdc).toBeCloseTo(5, 6);
    expect(snap.inventorySol).toBeCloseTo(0.5, 6);
    expect(snap.usdcBalance).toBeCloseTo(955, 6);
  });

  it("tracks peak equity and drawdown", () => {
    const events = [
      {
        kind: "swap" as const,
        solDelta: 2,
        usdcDelta: -200,
        markUsdcPerSol: 100,
      },
    ];
    const afterBuy = computeRealizedPnl(events, { usdc: 1000, sol: 0 }, 100);
    expect(afterBuy.peakEquityUsdc).toBeCloseTo(1000, 6);

    const afterMarkDown = computeRealizedPnl(events, { usdc: 1000, sol: 0 }, 80);
    expect(afterMarkDown.equityUsdc).toBeCloseTo(960, 6);
    expect(afterMarkDown.drawdownPct).toBeCloseTo(4, 6);
  });

  it("deducts SOL fees from buys", () => {
    const events = [
      {
        kind: "swap" as const,
        solDelta: 1,
        usdcDelta: -100,
        feeSol: 0.01,
        markUsdcPerSol: 100,
      },
    ];
    const snap = computeRealizedPnl(events, { usdc: 500, sol: 0 }, 100);
    expect(snap.inventorySol).toBeCloseTo(0.99, 6);
    expect(snap.usdcBalance).toBeCloseTo(399, 6);
  });
});
