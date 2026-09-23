import {
  JUPITER_TRIGGER_PROGRAM_ID,
  type TxSnapshot,
} from "@specguard/core";
import type { CreateAskParams, CreateBidParams } from "../jupiter/trigger.js";
import { TRIGGER_MIN_NOTIONAL_USDC } from "../jupiter/constants.js";

export interface QuotePlanInput {
  midUsdPerSol: number;
  sizeSol: number;
  spreadBps: number;
}

export interface QuotePlan {
  midUsdPerSol: number;
  bidPriceUsd: number;
  askPriceUsd: number;
  sizeSol: number;
  spreadBps: number;
  bid: CreateBidParams;
  ask: CreateAskParams;
  /** Hypothetical txs for pre-trade `evaluate()`. */
  pendingTxChecks: TxSnapshot[];
}

function solToLamports(sol: number): bigint {
  return BigInt(Math.max(1, Math.round(sol * 1e9)));
}

function usdcToRaw(usdc: number): bigint {
  return BigInt(Math.max(1, Math.round(usdc * 1e6)));
}

/** Ensure bid/ask notionals meet Jupiter ~$5 floor. */
export function effectiveQuoteSizeSol(
  midUsdPerSol: number,
  requestedSizeSol: number,
): number {
  const minSol = TRIGGER_MIN_NOTIONAL_USDC / midUsdPerSol;
  return Math.max(requestedSizeSol, minSol * 1.02);
}

export function planQuotes(input: QuotePlanInput): QuotePlan {
  const spread = input.spreadBps / 10_000;
  const sizeSol = effectiveQuoteSizeSol(input.midUsdPerSol, input.sizeSol);
  const bidPriceUsd = input.midUsdPerSol * (1 - spread);
  const askPriceUsd = input.midUsdPerSol * (1 + spread);

  const takingSolRaw = solToLamports(sizeSol);
  const bidUsdcHuman = sizeSol * bidPriceUsd;
  const askUsdcHuman = sizeSol * askPriceUsd;

  if (bidUsdcHuman < TRIGGER_MIN_NOTIONAL_USDC - 0.01) {
    throw new Error(
      `Bid notional $${bidUsdcHuman.toFixed(2)} below Jupiter min $${TRIGGER_MIN_NOTIONAL_USDC}`,
    );
  }
  if (sizeSol * askPriceUsd < TRIGGER_MIN_NOTIONAL_USDC - 0.01) {
    throw new Error(
      `Ask notional below Jupiter min $${TRIGGER_MIN_NOTIONAL_USDC}`,
    );
  }

  const bid: CreateBidParams = {
    makingUsdcRaw: usdcToRaw(bidUsdcHuman),
    takingSolRaw,
  };
  const ask: CreateAskParams = {
    makingSolRaw: takingSolRaw,
    takingUsdcRaw: usdcToRaw(askUsdcHuman),
  };

  const bidSpendSol = bidUsdcHuman / input.midUsdPerSol;
  const pendingTxChecks: TxSnapshot[] = [
    {
      signature: "pending-trigger-bid",
      spendSol: bidSpendSol,
      programIds: [JUPITER_TRIGGER_PROGRAM_ID],
    },
    {
      signature: "pending-trigger-ask",
      spendSol: sizeSol,
      programIds: [JUPITER_TRIGGER_PROGRAM_ID],
    },
  ];

  return {
    midUsdPerSol: input.midUsdPerSol,
    bidPriceUsd,
    askPriceUsd,
    sizeSol,
    spreadBps: input.spreadBps,
    bid,
    ask,
    pendingTxChecks,
  };
}
