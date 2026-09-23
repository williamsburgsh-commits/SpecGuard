import {
  formatTokenWhole,
  GUARD_MINT,
  GUARD_MIN_WHOLE_TOKENS,
  meetsGuardMinimum,
  parseGuardMinBalanceRaw,
} from "@specguard/core";
import {
  fetchGuardBalanceRaw,
  fetchMintDecimals,
  isLikelySolanaAddress,
} from "../solana/rpc";

export interface GuardBalanceResult {
  wallet: string;
  mint: string;
  balanceRaw: string;
  decimals: number;
  balanceDisplay: string;
  minBalanceRaw: string;
  minBalanceDisplay: string;
  minWholeTokens: number;
  meetsMinimum: boolean;
}

export async function getGuardBalanceForWallet(
  wallet: string,
  options?: { mint?: string; minBalanceRaw?: bigint },
): Promise<GuardBalanceResult> {
  if (!isLikelySolanaAddress(wallet)) {
    throw new Error("Invalid wallet address");
  }

  const mint = options?.mint ?? process.env.NEXT_PUBLIC_GUARD_MINT ?? GUARD_MINT;
  const minBalanceRaw =
    options?.minBalanceRaw ??
    parseGuardMinBalanceRaw(process.env.GUARD_MIN_BALANCE_RAW);

  const [decimals, balanceRaw] = await Promise.all([
    fetchMintDecimals(mint),
    fetchGuardBalanceRaw(wallet, mint),
  ]);

  return {
    wallet,
    mint,
    balanceRaw: balanceRaw.toString(),
    decimals,
    balanceDisplay: formatTokenWhole(balanceRaw, decimals),
    minBalanceRaw: minBalanceRaw.toString(),
    minBalanceDisplay: formatTokenWhole(minBalanceRaw, decimals),
    minWholeTokens: GUARD_MIN_WHOLE_TOKENS,
    meetsMinimum: meetsGuardMinimum(balanceRaw, minBalanceRaw),
  };
}
