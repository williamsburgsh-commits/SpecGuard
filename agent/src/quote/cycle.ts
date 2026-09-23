import { evaluate, type PolicyV1 } from "@specguard/core";
import type { TransactionSigner } from "@solana/kit";
import { loadQuoteConfig, type QuoteConfig } from "../config.js";
import {
  cancelTriggerOrder,
  createAskOrder,
  createBidOrder,
  fetchSolUsdcMidPrice,
  listActiveTriggerOrders,
  signAndExecuteCancel,
  signAndExecuteTriggerOrder,
} from "../jupiter/trigger.js";
import type { AgentBalanceRpc } from "../jupiter/preflight.js";
import { buildQuoteMetrics } from "./metrics.js";
import { planQuotes, type QuotePlan } from "./plan.js";
import type { Address } from "@solana/kit";
import { assertQuotingAllowed } from "../flatten/state.js";

export interface QuoteCycleResult {
  decision: "ALLOW" | "skip_breach";
  breachReasons: string[];
  dryRun: boolean;
  plan: QuotePlan;
  askSignature?: string;
  bidSignature?: string;
  createSignatures: string[];
  cancelSignatures: string[];
}

export interface RunQuoteCycleOptions {
  dryRun?: boolean;
  simulateBreach?: boolean;
  policy: PolicyV1;
  quoteConfig?: QuoteConfig;
  rpc: AgentBalanceRpc;
  wallet: Address;
  signer: TransactionSigner;
}

export async function runQuoteCycle(
  options: RunQuoteCycleOptions,
): Promise<QuoteCycleResult> {
  if (!options.dryRun) {
    assertQuotingAllowed();
  }
  const quoteConfig = options.quoteConfig ?? loadQuoteConfig();
  const mid = await fetchSolUsdcMidPrice();
  const plan = planQuotes({
    midUsdPerSol: mid,
    sizeSol: quoteConfig.sizeSol,
    spreadBps: quoteConfig.spreadBps,
  });

  const { metrics } = await buildQuoteMetrics(options.rpc, options.wallet, {
    simulateBreach: options.simulateBreach,
  });

  const evalResult = evaluate(options.policy, {
    metrics,
    transactions: plan.pendingTxChecks,
  });

  const createSignatures: string[] = [];
  const cancelSignatures: string[] = [];

  if (evalResult.status === "RED") {
    return {
      decision: "skip_breach",
      breachReasons: evalResult.breachReasons,
      dryRun: !!options.dryRun,
      plan,
      createSignatures,
      cancelSignatures,
    };
  }

  if (options.dryRun) {
    return {
      decision: "ALLOW",
      breachReasons: [],
      dryRun: true,
      plan,
      createSignatures,
      cancelSignatures,
    };
  }

  const active = await listActiveTriggerOrders(options.wallet);
  for (const order of active) {
    const cancel = await cancelTriggerOrder(options.wallet, order.orderKey);
    const exec = await signAndExecuteCancel(options.signer, cancel);
    if (exec.status !== "Success") {
      throw new Error(`Cancel failed for ${order.orderKey}: ${JSON.stringify(exec)}`);
    }
    cancelSignatures.push(exec.signature);
  }

  const askCreated = await createAskOrder(options.wallet, plan.ask);
  const askExec = await signAndExecuteTriggerOrder(
    options.signer,
    askCreated,
  );
  if (askExec.status !== "Success") {
    throw new Error(`Ask execute failed: ${JSON.stringify(askExec)}`);
  }
  createSignatures.push(askExec.signature);
  const askSignature = askExec.signature;

  const bidCreated = await createBidOrder(options.wallet, plan.bid);
  const bidExec = await signAndExecuteTriggerOrder(
    options.signer,
    bidCreated,
  );
  if (bidExec.status !== "Success") {
    throw new Error(`Bid execute failed: ${JSON.stringify(bidExec)}`);
  }
  createSignatures.push(bidExec.signature);
  const bidSignature = bidExec.signature;

  return {
    decision: "ALLOW",
    breachReasons: [],
    dryRun: false,
    plan,
    askSignature,
    bidSignature,
    createSignatures,
    cancelSignatures,
  };
}
