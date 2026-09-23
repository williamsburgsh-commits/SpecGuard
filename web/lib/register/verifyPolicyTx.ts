import { decodeMemo, hashPolicy } from "@specguard/core";
import { extractMemoFromGetTransactionResult } from "../solana/extractMemoFromTx";
import { resolveSolanaRpcUrl } from "../solana/rpc";
export interface VerifiedPolicyTx {
  wallet: string;
  signature: string;
  blocktime: Date;
  slot: number | null;
  memoText: string;
  policyHash: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractMemoFromTxResult(
  result: Record<string, unknown>,
): string | null {
  return extractMemoFromGetTransactionResult(result);
}

function feePayerFromTx(result: Record<string, unknown>): string | null {
  const transaction = asRecord(result.transaction);
  const message = asRecord(transaction?.message);
  const keys = message?.accountKeys;
  if (Array.isArray(keys) && keys.length > 0) {
    const first = keys[0];
    if (typeof first === "string") return first;
    const rec = asRecord(first);
    if (typeof rec?.pubkey === "string") return rec.pubkey;
  }
  return null;
}

export async function verifyPolicyMemoTransaction(
  signature: string,
  expectedWallet: string,
  expectedPolicyHash: string,
  expectedFeePayer?: string,
): Promise<VerifiedPolicyTx> {
  const res = await fetch(resolveSolanaRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [
        signature,
        {
          encoding: "json",
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`RPC HTTP ${res.status}`);
  }

  const body = (await res.json()) as {
    error?: { message?: string };
    result?: Record<string, unknown> | null;
  };
  if (body.error) {
    throw new Error(body.error.message ?? "RPC error");
  }
  const result = body.result;
  if (!result) {
    throw new Error("Transaction not found (wait for confirmation and retry)");
  }

  const meta = asRecord(result.meta);
  if (meta?.err != null) {
    throw new Error("Transaction failed on-chain");
  }

  const feePayer = feePayerFromTx(result);
  const payer = expectedFeePayer ?? expectedWallet;
  if (!feePayer || feePayer !== payer) {
    throw new Error("Transaction fee payer must match the connected wallet");
  }

  const memoText = extractMemoFromTxResult(result);
  if (!memoText) {
    throw new Error("Policy memo not found in transaction logs");
  }

  const decoded = decodeMemo(memoText);
  if (decoded?.kind !== "policy") {
    const preview = memoText.slice(0, 80);
    throw new Error(
      `Memo is not a SpecGuard policy (got ${memoText.length} chars, starts with: ${preview}${memoText.length > 80 ? "…" : ""})`,
    );
  }

  const policyHash = hashPolicy(decoded.policy);
  if (policyHash !== expectedPolicyHash) {
    throw new Error("Policy hash does not match prepare step");
  }

  const blockTime = result.blockTime;
  const slot = result.slot;
  const blocktime =
    typeof blockTime === "number"
      ? new Date(blockTime * 1000)
      : new Date();

  return {
    wallet: expectedWallet,
    signature,
    blocktime,
    slot: typeof slot === "number" ? slot : null,
    memoText,
    policyHash,
  };
}
