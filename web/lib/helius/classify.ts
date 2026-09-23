import {
  decodeMemo,
  JUPITER_AGGREGATOR_V6_PROGRAM_ID,
  MEMO_PREFIX,
} from "@specguard/core";
import { tokenDeltasForWallet, tokenDeltasToJson } from "./tokenDeltas";

export type TxKind =
  | "swap"
  | "limit_create"
  | "limit_cancel"
  | "limit_fill"
  | "memo_policy"
  | "memo_heartbeat"
  | "memo_flatten"
  | "transfer"
  | "other";

export interface NormalizedHeliusTx {
  signature: string;
  wallet: string;
  blocktime: Date;
  slot: number | null;
  kind: TxKind;
  programIds: string[];
  solDeltaLamports: number;
  tokenDeltas: Record<string, string>;
  feeLamports: number;
  success: boolean;
  raw: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractMemoText(tx: Record<string, unknown>): string | null {
  const logs = tx.logMessages;
  if (Array.isArray(logs)) {
    for (const line of logs) {
      if (typeof line !== "string") continue;
      const memoPrefix = "Program log: Memo ";
      if (line.startsWith(memoPrefix)) {
        return line.slice(memoPrefix.length);
      }
      if (line.includes(MEMO_PREFIX)) {
        const idx = line.indexOf(MEMO_PREFIX);
        return line.slice(idx);
      }
    }
  }
  const instructions = tx.instructions;
  if (Array.isArray(instructions)) {
    for (const ix of instructions) {
      const rec = asRecord(ix);
      const data = rec?.data;
      if (typeof data === "string" && data.includes(MEMO_PREFIX)) {
        try {
          return Buffer.from(data, "base64").toString("utf8");
        } catch {
          /* ignore */
        }
      }
    }
  }
  return null;
}

function kindFromMemo(memo: string | null): TxKind | null {
  if (!memo) return null;
  const decoded = decodeMemo(memo);
  if (!decoded) return null;
  switch (decoded.kind) {
    case "policy":
      return "memo_policy";
    case "heartbeat":
      return "memo_heartbeat";
    case "flatten":
      return "memo_flatten";
    default:
      return null;
  }
}

function collectProgramIds(tx: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const instructions = tx.instructions;
  if (Array.isArray(instructions)) {
    for (const ix of instructions) {
      const rec = asRecord(ix);
      const pid = rec?.programId;
      if (typeof pid === "string") ids.add(pid);
    }
  }
  const accountData = tx.accountData;
  if (Array.isArray(accountData)) {
    for (const acc of accountData) {
      const rec = asRecord(acc);
      const pid = rec?.account;
      if (typeof pid === "string" && pid.length >= 32) {
        /* account pubkey, not program */
      }
    }
  }
  return [...ids];
}

function solDeltaForWallet(
  tx: Record<string, unknown>,
  wallet: string,
): number {
  let delta = 0;
  const nativeTransfers = tx.nativeTransfers;
  if (Array.isArray(nativeTransfers)) {
    for (const t of nativeTransfers) {
      const rec = asRecord(t);
      const from = rec?.fromUserAccount;
      const to = rec?.toUserAccount;
      const amount = rec?.amount;
      if (typeof amount !== "number") continue;
      if (from === wallet) delta -= amount;
      if (to === wallet) delta += amount;
    }
  }
  return delta;
}

export function normalizeEnhancedTx(
  payload: unknown,
  watchedWallet: string,
): NormalizedHeliusTx | null {
  const tx = asRecord(payload);
  if (!tx) return null;

  const signature = tx.signature;
  if (typeof signature !== "string" || !signature) return null;

  const feePayer = tx.feePayer;
  const wallet =
    typeof feePayer === "string" && feePayer === watchedWallet
      ? feePayer
      : watchedWallet;

  const ts = tx.timestamp;
  const blocktime =
    typeof ts === "number"
      ? new Date(ts * 1000)
      : new Date();

  const slot = typeof tx.slot === "number" ? tx.slot : null;
  const fee = typeof tx.fee === "number" ? tx.fee : 0;
  const type = typeof tx.type === "string" ? tx.type : "";

  const memo = extractMemoText(tx);
  const memoKind = kindFromMemo(memo);
  const programIds = collectProgramIds(tx);
  let kind: TxKind = memoKind ?? "other";
  if (!memoKind) {
    if (type === "TRANSFER") kind = "transfer";
    else if (
      type === "SWAP" ||
      programIds.includes(JUPITER_AGGREGATOR_V6_PROGRAM_ID)
    ) {
      kind = "swap";
    }
  }

  const tokenDeltas = tokenDeltasToJson(
    tokenDeltasForWallet(tx, watchedWallet),
  );

  return {
    signature,
    wallet,
    blocktime,
    slot,
    kind,
    programIds,
    solDeltaLamports: solDeltaForWallet(tx, watchedWallet),
    tokenDeltas,
    feeLamports: fee,
    success: tx.transactionError == null,
    raw: tx,
  };
}
