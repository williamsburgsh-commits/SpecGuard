import { describe, expect, it } from "vitest";
import {
  connectSolanaWallet,
  listSolanaWalletOptions,
  type SolanaWalletId,
} from "../lib/register/walletProviders";

describe("walletProviders", () => {
  it("returns no installed wallets without window", () => {
    const options = listSolanaWalletOptions();
    expect(options.length).toBeGreaterThanOrEqual(4);
    expect(options.every((o) => o.installed === false)).toBe(true);
  });

  it("rejects unknown wallet id", async () => {
    await expect(
      connectSolanaWallet("not-a-wallet" as SolanaWalletId),
    ).rejects.toThrow(/Unknown wallet/i);
  });

  it("rejects when extension is missing", async () => {
    await expect(connectSolanaWallet("phantom")).rejects.toThrow(
      /not installed/i,
    );
  });
});
