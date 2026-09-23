import { describe, expect, it } from "vitest";
import { encodePolicyMemo, type PolicyV1 } from "@specguard/core";
import bs58 from "bs58";
import { extractMemoFromGetTransactionResult } from "../lib/solana/extractMemoFromTx";

const policy: PolicyV1 = {
  version: 1,
  name: "test-agent",
  maxDrawdownPct: 10,
  maxSpendPerTxSol: 0.5,
  allowedVenues: ["jupiter-swap", "jupiter-trigger"],
  heartbeatIntervalSec: 300,
};

describe("extractMemoFromGetTransactionResult", () => {
  it("reads memo from memo program instruction data (base58)", () => {
    const memoText = encodePolicyMemo(policy);
    const data = bs58.encode(Buffer.from(memoText, "utf8"));

    const result = {
      meta: { logMessages: [] },
      transaction: {
        message: {
          accountKeys: [
            "Wallet111111111111111111111111111111111111111",
            "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
          ],
          instructions: [
            {
              programIdIndex: 1,
              accounts: [0],
              data,
            },
          ],
        },
      },
    };

    expect(extractMemoFromGetTransactionResult(result)).toBe(memoText);
  });

  it("reads memo from program logs when present", () => {
    const memoText = encodePolicyMemo(policy);
    const result = {
      meta: {
        logMessages: [`Program log: Memo ${memoText}`],
      },
      transaction: { message: { accountKeys: [] } },
    };
    expect(extractMemoFromGetTransactionResult(result)).toBe(memoText);
  });

  it("prefers full instruction memo over truncated escaped logs", () => {
    const memoText = encodePolicyMemo(policy);
    const data = bs58.encode(Buffer.from(memoText, "utf8"));
    const badLog = memoText.replace(/"/g, '\\"').slice(0, 201);

    const result = {
      meta: {
        logMessages: [`Program log: Memo ${badLog}`],
      },
      transaction: {
        message: {
          accountKeys: [
            "Wallet111111111111111111111111111111111111111",
            "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
          ],
          instructions: [{ programIdIndex: 1, accounts: [0], data }],
        },
      },
    };

    expect(extractMemoFromGetTransactionResult(result)).toBe(memoText);
  });
});
