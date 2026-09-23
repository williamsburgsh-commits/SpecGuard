import { decodeMemo, MEMO_PREFIX } from "@specguard/core";
import bs58 from "bs58";

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const LOG_PREFIX = "Program log: Memo ";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function accountKeyAt(keys: string[], index: number): string | null {
  return keys[index] ?? null;
}

function resolveAccountKeys(result: Record<string, unknown>): string[] {
  const transaction = asRecord(result.transaction);
  const message = asRecord(transaction?.message);
  if (!message) return [];

  const rawKeys = message.accountKeys ?? message.staticAccountKeys;
  if (!Array.isArray(rawKeys)) return [];

  const keys: string[] = [];
  for (const entry of rawKeys) {
    if (typeof entry === "string") keys.push(entry);
    else {
      const rec = asRecord(entry);
      if (typeof rec?.pubkey === "string") keys.push(rec.pubkey);
    }
  }

  const meta = asRecord(result.meta);
  const loaded = asRecord(meta?.loadedAddresses);
  if (loaded) {
    for (const list of [loaded.writable, loaded.readonly]) {
      if (!Array.isArray(list)) continue;
      for (const k of list) {
        if (typeof k === "string") keys.push(k);
      }
    }
  }

  return keys;
}

function decodeInstructionData(data: string): string | null {
  if (!data) return null;
  try {
    const text = Buffer.from(bs58.decode(data)).toString("utf8");
    if (text.startsWith(MEMO_PREFIX)) return text;
  } catch {
    /* not base58 */
  }
  try {
    const text = Buffer.from(data, "base64").toString("utf8");
    if (text.startsWith(MEMO_PREFIX)) return text;
  } catch {
    /* not base64 */
  }
  if (data.startsWith(MEMO_PREFIX)) return data;
  return null;
}

function memoFromLogs(logs: unknown): string | null {
  if (!Array.isArray(logs)) return null;
  for (const line of logs) {
    if (typeof line !== "string") continue;
    if (line.startsWith(LOG_PREFIX)) {
      const rest = line.slice(LOG_PREFIX.length).trim();
      if (rest.startsWith(MEMO_PREFIX)) return rest;
    }
    if (line.includes(MEMO_PREFIX)) {
      return line.slice(line.indexOf(MEMO_PREFIX));
    }
  }
  return null;
}

function memoFromInstructions(
  accountKeys: string[],
  instructions: unknown,
): string | null {
  if (!Array.isArray(instructions)) return null;
  for (const ix of instructions) {
    const rec = asRecord(ix);
    if (!rec) continue;

    let programId: string | null = null;
    if (typeof rec.programId === "string") {
      programId = rec.programId;
    } else if (typeof rec.programIdIndex === "number") {
      programId = accountKeyAt(accountKeys, rec.programIdIndex);
    }

    if (programId !== MEMO_PROGRAM_ID) continue;
    if (typeof rec.data !== "string") continue;
    const text = decodeInstructionData(rec.data);
    if (text) return text;
  }
  return null;
}

function collectInstructionMemos(result: Record<string, unknown>): string[] {
  const accountKeys = resolveAccountKeys(result);
  const meta = asRecord(result.meta);
  const transaction = asRecord(result.transaction);
  const message = asRecord(transaction?.message);
  const instructions = message?.instructions ?? message?.compiledInstructions;

  const memos: string[] = [];
  const fromTop = memoFromInstructions(accountKeys, instructions);
  if (fromTop) memos.push(fromTop);

  const inner = meta?.innerInstructions;
  if (Array.isArray(inner)) {
    for (const group of inner) {
      const g = asRecord(group);
      const fromInner = memoFromInstructions(accountKeys, g?.instructions);
      if (fromInner) memos.push(fromInner);
    }
  }

  return memos;
}

function pickBestMemo(candidates: string[]): string | null {
  const unique = [...new Set(candidates.filter(Boolean))];
  if (unique.length === 0) return null;

  const decodable = unique.filter((m) => decodeMemo(m)?.kind === "policy");
  const pool = decodable.length > 0 ? decodable : unique;
  return pool.sort((a, b) => a.length - b.length)[0] ?? null;
}

/** Extract SpecGuard memo text from `getTransaction` JSON (`encoding: "json"`). */
export function extractMemoFromGetTransactionResult(
  result: Record<string, unknown>,
): string | null {
  const fromChain = collectInstructionMemos(result);
  if (fromChain.length > 0) {
    return pickBestMemo(fromChain);
  }

  const meta = asRecord(result.meta);
  const fromLogs = memoFromLogs(meta?.logMessages);
  if (fromLogs) return fromLogs;

  return null;
}
