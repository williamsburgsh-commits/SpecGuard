import { describe, expect, it } from "vitest";
import { tokenDeltasForWallet, tokenDeltasToJson } from "../lib/helius/tokenDeltas";

const WALLET = "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("tokenDeltasForWallet", () => {
  it("nets USDC in/out for the watched wallet", () => {
    const deltas = tokenDeltasForWallet(
      {
        tokenTransfers: [
          {
            fromUserAccount: WALLET,
            toUserAccount: "Other1111111111111111111111111111111111",
            mint: USDC,
            rawTokenAmount: { tokenAmount: "5000000", decimals: 6 },
          },
          {
            fromUserAccount: "Other1111111111111111111111111111111111",
            toUserAccount: WALLET,
            mint: USDC,
            rawTokenAmount: { tokenAmount: "12000000", decimals: 6 },
          },
        ],
      },
      WALLET,
    );
    expect(deltas[USDC]).toBe(7_000_000n);
    expect(tokenDeltasToJson(deltas)[USDC]).toBe("7000000");
  });
});
