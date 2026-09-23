import { describe, expect, it } from "vitest";
import { txRowToSnapshot } from "../lib/verify/runAgentVerify";

describe("txRowToSnapshot", () => {
  it("sums SOL outflow and fee", () => {
    const snap = txRowToSnapshot(
      {
        signature: "sig",
        program_ids: ["JUP6"],
        sol_delta_lamports: -500_000_000,
        fee_lamports: 5_000,
        token_deltas: {},
        success: true,
      },
      200,
    );
    expect(snap.spendSol).toBeCloseTo(0.500005, 6);
  });

  it("returns zero spend for failed tx", () => {
    const snap = txRowToSnapshot(
      {
        signature: "sig",
        program_ids: [],
        sol_delta_lamports: -1e9,
        fee_lamports: 5000,
        token_deltas: {},
        success: false,
      },
      100,
    );
    expect(snap.spendSol).toBe(0);
  });
});
