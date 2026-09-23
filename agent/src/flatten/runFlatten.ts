import {
  decodeMemo,
  encodeFlattenMemo,
  type FlattenMemoPayload,
} from "@specguard/core";
import { getAddMemoInstruction } from "@solana-program/memo";
import type { Address, TransactionSigner } from "@solana/kit";
import { loadQuoteConfig } from "../config.js";
import { buildSwapTransaction, fetchSwapQuote } from "../jupiter/swap.js";
import {
  cancelTriggerOrder,
  listActiveTriggerOrders,
  signAndExecuteCancel,
} from "../jupiter/trigger.js";
import { getSolBalanceLamports, type AgentBalanceRpc } from "../jupiter/preflight.js";
import { signAndSendWireTransaction } from "../solana/sendWire.js";
import { saveAgentLocalState } from "./state.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { repoRootPath } from "../loadEnv.js";

/** Minimum SOL to bother swapping (avoid dust failures). */
const MIN_SWAP_LAMPORTS = 1_000_000n;

export interface FlattenResult {
  dryRun: boolean;
  reason: string;
  cancelSignatures: string[];
  swapSignature?: string;
  swapFailed?: boolean;
  flattenSignature?: string;
  memoText?: string;
  allSigs: string[];
}

export interface RunFlattenOptions {
  reason: string;
  dryRun?: boolean;
  rpc: AgentBalanceRpc & {
    sendTransaction: (
      base64: string,
      config: { encoding: "base64"; skipPreflight?: boolean },
    ) => { send: () => Promise<string> };
    getSignatureStatuses: (
      sigs: string[],
    ) => {
      send: () => Promise<{ value: Array<{ err: unknown } | null> }>;
    };
  };
  wallet: Address;
  signer: TransactionSigner;
  /** Kit client for memo tx (instruction planner). */
  sendMemoTransaction: (memoText: string) => Promise<string>;
}

export function computeSellableLamports(
  balance: bigint,
  feeReserveSol: number,
): bigint {
  const reserve = BigInt(Math.ceil(feeReserveSol * 1e9));
  return balance > reserve ? balance - reserve : 0n;
}

async function swapSolToUsdc(
  options: RunFlattenOptions,
  amountLamports: bigint,
  slippageBps: number,
): Promise<string> {
  const quote = await fetchSwapQuote({ amountLamports, slippageBps });
  const wire = await buildSwapTransaction(options.wallet, quote);
  return signAndSendWireTransaction(options.rpc, options.signer, wire);
}

export async function runFlatten(
  options: RunFlattenOptions,
): Promise<FlattenResult> {
  const quoteConfig = loadQuoteConfig();
  const cancelSignatures: string[] = [];
  const allSigs: string[] = [];
  let swapSignature: string | undefined;
  let swapFailed = false;

  const active = await listActiveTriggerOrders(options.wallet);
  if (options.dryRun) {
    console.log(`[dry-run] Would cancel ${active.length} trigger order(s)`);
  } else {
    for (const order of active) {
      const cancel = await cancelTriggerOrder(options.wallet, order.orderKey);
      const exec = await signAndExecuteCancel(options.signer, cancel);
      if (exec.status !== "Success") {
        throw new Error(
          `Cancel failed for ${order.orderKey}: ${JSON.stringify(exec)}`,
        );
      }
      cancelSignatures.push(exec.signature);
      allSigs.push(exec.signature);
    }
  }

  const balance = await getSolBalanceLamports(options.rpc, options.wallet);
  const sellable = computeSellableLamports(
    balance,
    quoteConfig.solFeeReserveSol,
  );

  if (sellable >= MIN_SWAP_LAMPORTS) {
    if (options.dryRun) {
      console.log(
        `[dry-run] Would swap ${Number(sellable) / 1e9} SOL → USDC (100 bps, retry 200 bps)`,
      );
    } else {
      try {
        swapSignature = await swapSolToUsdc(options, sellable, 100);
        allSigs.push(swapSignature);
      } catch (firstErr) {
        console.warn("Swap 100 bps failed, retry 200 bps:", firstErr);
        try {
          swapSignature = await swapSolToUsdc(options, sellable, 200);
          allSigs.push(swapSignature);
        } catch (secondErr) {
          swapFailed = true;
          console.error("Swap failed after retry:", secondErr);
        }
      }
    }
  } else if (!options.dryRun) {
    swapFailed = true;
    console.warn(
      `Skip swap: sellable ${Number(sellable) / 1e9} SOL below minimum`,
    );
  }

  const reason =
    swapFailed && !options.dryRun
      ? `${options.reason}; swap_failed=true`
      : options.reason;

  const memoPayload: FlattenMemoPayload = {
    reason,
    sigs: allSigs,
  };
  const memoText = encodeFlattenMemo(memoPayload);

  let flattenSignature: string | undefined;
  if (options.dryRun) {
    console.log("[dry-run] Would post FLATTEN memo:", memoText.slice(0, 120), "…");
  } else {
    flattenSignature = await options.sendMemoTransaction(memoText);
    allSigs.push(flattenSignature);

    const decoded = decodeMemo(memoText);
    if (decoded?.kind !== "flatten") {
      throw new Error("Flatten memo did not decode");
    }

    saveAgentLocalState({
      status: "RED",
      flattenProofSig: flattenSignature,
      flattenReason: reason,
      stoppedAt: new Date().toISOString(),
    });

    const logDir = resolve(repoRootPath(), "logs/flatten");
    mkdirSync(logDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(
      resolve(logDir, `flatten-${stamp}.json`),
      JSON.stringify(
        {
          reason,
          cancelSignatures,
          swapSignature,
          swapFailed,
          flattenSignature,
          memoText,
          allSigs,
        },
        null,
        2,
      ),
    );
  }

  return {
    dryRun: !!options.dryRun,
    reason,
    cancelSignatures,
    swapSignature,
    swapFailed,
    flattenSignature,
    memoText,
    allSigs,
  };
}
