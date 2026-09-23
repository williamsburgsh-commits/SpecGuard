import { describe, expect, it } from "vitest";
import { computeRealizedPnl } from "@specguard/core";
import { computePnlFromTransactionRows } from "../lib/pnl/computeFromTransactions";

describe("computePnlFromTransactionRows", () => {
  it("matches hand-calculated realized PnL for buy then sell", () => {
    const mark = 110;
    const rows = [
      {
        signature: "buy1",
        kind: "swap",
        sol_delta_lamports: 1_000_000_000,
        fee_lamports: 0,
        token_deltas: { EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "-100000000" },
        success: true,
      },
      {
        signature: "sell1",
        kind: "swap",
        sol_delta_lamports: -500_000_000,
        fee_lamports: 0,
        token_deltas: { EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "55000000" },
        success: true,
      },
    ];

    const { snapshot, throughSig, tradeEventCount } =
      computePnlFromTransactionRows(rows, { usdc: 1000, sol: 0 }, mark);

    const hand = computeRealizedPnl(
      [
        {
          kind: "swap",
          solDelta: 1,
          usdcDelta: -100,
          markUsdcPerSol: 100,
        },
        {
          kind: "swap",
          solDelta: -0.5,
          usdcDelta: 55,
          markUsdcPerSol: 110,
        },
      ],
      { usdc: 1000, sol: 0 },
      mark,
    );

    expect(tradeEventCount).toBe(2);
    expect(throughSig).toBe("sell1");
    expect(snapshot.realizedUsdc).toBeCloseTo(hand.realizedUsdc, 4);
    expect(snapshot.inventorySol).toBeCloseTo(hand.inventorySol, 4);
    expect(snapshot.usdcBalance).toBeCloseTo(hand.usdcBalance, 4);
  });
});
