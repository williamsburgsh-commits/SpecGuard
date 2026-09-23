import { describe, expect, it } from "vitest";
import { resolveWalletForPayload } from "../lib/helius/resolveWallet";

const A = "BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK";
const B = "2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk";

describe("resolveWalletForPayload", () => {
  it("prefers fee payer when registered", () => {
    const wallet = resolveWalletForPayload(
      { feePayer: B, accountData: [{ account: A }] },
      new Set([A, B]),
    );
    expect(wallet).toBe(B);
  });

  it("falls back to fee payer when not in registered set", () => {
    const wallet = resolveWalletForPayload(
      { feePayer: B },
      new Set([A]),
    );
    expect(wallet).toBe(B);
  });
});
