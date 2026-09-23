import {
  decodeMemo,
  encodePolicyMemo,
  hashPolicy,
  type PolicyV1,
} from "@specguard/core";
import { getAddMemoInstruction } from "@solana-program/memo";
import { createMainnetAgentClient } from "./client.js";
import { MIN_PUBLISH_LAMPORTS } from "./config.js";

export interface PublishPolicyResult {
  signature: string;
  wallet: string;
  memoText: string;
  policyHash: string;
  solscanUrl: string;
}

function extractMemoFromLogs(logMessages: readonly string[] | null): string | null {
  if (!logMessages) return null;
  for (const line of logMessages) {
    const prefix = "Program log: Memo ";
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length);
    }
  }
  return null;
}

export async function publishPolicyMemo(
  policy: PolicyV1,
  options?: { skipBalanceCheck?: boolean },
): Promise<PublishPolicyResult> {
  const { client } = await createMainnetAgentClient();
  const wallet = client.payer.address;
  const memoText = encodePolicyMemo(policy);

  if (!options?.skipBalanceCheck) {
    const { value: balance } = await client.rpc.getBalance(wallet).send();
    if (balance < MIN_PUBLISH_LAMPORTS) {
      throw new Error(
        `Insufficient SOL on ${wallet}: ${Number(balance) / 1e9} SOL (need ≥ ${Number(MIN_PUBLISH_LAMPORTS) / 1e9} SOL). Fund this wallet on mainnet, then re-run.`,
      );
    }
  }

  const instruction = getAddMemoInstruction({
    memo: memoText,
    signers: [client.identity],
  });

  // solanaMainnetRpc simulates (resource limits) before send when estimateResourceLimits is on
  const sendResult = await client.sendTransaction([instruction]);
  const signature = sendResult.context.signature;
  if (!signature) {
    throw new Error(
      `Send did not return a signature: ${JSON.stringify(sendResult)}`,
    );
  }

  const { value: statuses } = await client.rpc
    .getSignatureStatuses([signature])
    .send();
  const status = statuses?.[0];
  if (status?.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
  }

  const { value: tx } = await client.rpc
    .getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    })
    .send();

  const memoFromChain =
    extractMemoFromLogs(tx?.meta?.logMessages ?? null) ?? memoText;
  const decoded = decodeMemo(memoFromChain);
  if (decoded?.kind !== "policy") {
    throw new Error("On-chain memo did not decode as policy");
  }

  return {
    signature,
    wallet,
    memoText: memoFromChain,
    policyHash: hashPolicy(decoded.policy),
    solscanUrl: `https://solscan.io/tx/${signature}`,
  };
}

export async function getWalletBalanceSol(): Promise<{
  wallet: string;
  lamports: bigint;
  sol: number;
}> {
  const { client } = await createMainnetAgentClient();
  const wallet = client.payer.address;
  const { value: balance } = await client.rpc.getBalance(wallet).send();
  return {
    wallet,
    lamports: balance,
    sol: Number(balance) / 1e9,
  };
}
