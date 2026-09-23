import type { Address } from "@solana/kit";
import { USDC_MINT } from "./constants.js";
import { TRIGGER_MIN_NOTIONAL_USDC } from "./constants.js";

/** Minimal RPC surface for balance preflight (avoids Rpc generic variance). */
export type AgentBalanceRpc = {
  getTokenAccountsByOwner: (
    owner: Address,
    filter: { mint: Address },
    config: { encoding: "jsonParsed" },
  ) => {
    send: () => Promise<{ value: readonly { account: { data: unknown } }[] }>;
  };
  getBalance: (owner: Address) => { send: () => Promise<{ value: bigint }> };
};

export async function getUsdcBalanceRaw(
  rpc: AgentBalanceRpc,
  owner: Address,
): Promise<bigint> {
  const res = await rpc
    .getTokenAccountsByOwner(
      owner,
      { mint: USDC_MINT },
      { encoding: "jsonParsed" },
    )
    .send();
  let total = 0n;
  for (const { account } of res.value) {
    const parsed = account.data as {
      parsed?: { info?: { tokenAmount?: { amount?: string } } };
    };
    const amt = parsed.parsed?.info?.tokenAmount?.amount;
    if (amt) total += BigInt(amt);
  }
  return total;
}

export async function getSolBalanceLamports(
  rpc: AgentBalanceRpc,
  owner: Address,
): Promise<bigint> {
  const { value } = await rpc.getBalance(owner).send();
  return value;
}

/** Reserve for trigger tx fees + rent (conservative). */
export const FEE_RESERVE_LAMPORTS = 10_000_000n; // 0.01 SOL

export function formatFundingHint(opts: {
  side: "bid" | "ask";
  midUsdPerSol: number;
  solLamports: bigint;
  usdcRaw: bigint;
}): string {
  const sol = Number(opts.solLamports) / 1e9;
  const usdc = Number(opts.usdcRaw) / 1e6;
  if (opts.side === "bid") {
    const needUsdc = TRIGGER_MIN_NOTIONAL_USDC;
    if (usdc >= needUsdc) return "";
    return `Fund agent wallet with ≥${needUsdc} USDC (have ${usdc.toFixed(2)}) plus ~0.01 SOL for fees.`;
  }
  const orderSol = TRIGGER_MIN_NOTIONAL_USDC / opts.midUsdPerSol;
  const needSol =
    orderSol + Number(FEE_RESERVE_LAMPORTS) / 1e9 + orderSol * 0.01;
  if (sol >= needSol) return "";
  return `Fund agent wallet with ≥${needSol.toFixed(3)} SOL (have ${sol.toFixed(3)}) for a ~$${TRIGGER_MIN_NOTIONAL_USDC} ask + fees.`;
}
