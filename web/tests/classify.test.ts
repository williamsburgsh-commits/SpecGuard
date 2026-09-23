import { describe, expect, it } from "vitest";
import { normalizeEnhancedTx } from "../lib/helius/classify";

const WALLET = "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";

describe("normalizeEnhancedTx", () => {
  it("classifies self transfer", () => {
    const tx = normalizeEnhancedTx(
      {
        signature: "sig123",
        timestamp: 1_700_000_000,
        slot: 999,
        fee: 5000,
        feePayer: WALLET,
        type: "TRANSFER",
        nativeTransfers: [
          {
            fromUserAccount: WALLET,
            toUserAccount: WALLET,
            amount: 1_000_000,
          },
        ],
      },
      WALLET,
    );
    expect(tx?.kind).toBe("transfer");
    expect(tx?.signature).toBe("sig123");
    expect(tx?.solDeltaLamports).toBe(0);
  });

  it("classifies policy memo from logs", () => {
    const memo =
      "SPECGUARD:v1:POLICY:{\"version\":1,\"name\":\"x\",\"maxDrawdownPct\":10,\"maxSpendPerTxSol\":0.5,\"allowedVenues\":[\"jupiter-swap\"],\"heartbeatIntervalSec\":300}";
    const tx = normalizeEnhancedTx(
      {
        signature: "sigPolicy",
        timestamp: 1_700_000_000,
        feePayer: WALLET,
        logMessages: [`Program log: Memo ${memo}`],
      },
      WALLET,
    );
    expect(tx?.kind).toBe("memo_policy");
  });

  it("classifies flatten memo from logs", () => {
    const memo =
      'SPECGUARD:v1:FLATTEN:{"reason":"slice7_drill","sigs":["abc"]}';
    const tx = normalizeEnhancedTx(
      {
        signature: "sigFlat",
        timestamp: 1_700_000_000,
        feePayer: WALLET,
        logMessages: [`Program log: Memo ${memo}`],
      },
      WALLET,
    );
    expect(tx?.kind).toBe("memo_flatten");
  });

  it("classifies heartbeat memo from logs", () => {
    const memo = "SPECGUARD:v1:HB:1700000000";
    const tx = normalizeEnhancedTx(
      {
        signature: "sigHb",
        timestamp: 1_700_000_000,
        feePayer: WALLET,
        logMessages: [`Program log: Memo ${memo}`],
      },
      WALLET,
    );
    expect(tx?.kind).toBe("memo_heartbeat");
  });

  it("classifies Jupiter swap by type", () => {
    const tx = normalizeEnhancedTx(
      {
        signature: "sigSwap",
        timestamp: 1_700_000_000,
        feePayer: WALLET,
        type: "SWAP",
        instructions: [
          {
            programId: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
          },
        ],
      },
      WALLET,
    );
    expect(tx?.kind).toBe("swap");
    expect(tx?.tokenDeltas).toEqual({});
  });
});
