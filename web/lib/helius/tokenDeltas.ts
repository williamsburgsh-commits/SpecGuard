function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function rawAmountFromTransfer(rec: Record<string, unknown>): bigint | null {
  const raw = asRecord(rec.rawTokenAmount);
  if (raw && typeof raw.tokenAmount === "string") {
    try {
      return BigInt(raw.tokenAmount);
    } catch {
      return null;
    }
  }
  if (typeof rec.tokenAmount === "number" && Number.isFinite(rec.tokenAmount)) {
    const decimals =
      typeof rec.decimals === "number"
        ? rec.decimals
        : typeof raw?.decimals === "number"
          ? raw.decimals
          : 6;
    return BigInt(Math.round(rec.tokenAmount * 10 ** decimals));
  }
  return null;
}

/** Net token balance change per mint for `wallet` (smallest units, signed). */
export function tokenDeltasForWallet(
  tx: Record<string, unknown>,
  wallet: string,
): Record<string, bigint> {
  const deltas: Record<string, bigint> = {};
  const add = (mint: string, delta: bigint) => {
    deltas[mint] = (deltas[mint] ?? 0n) + delta;
  };

  const transfers = tx.tokenTransfers;
  if (!Array.isArray(transfers)) return deltas;

  for (const item of transfers) {
    const rec = asRecord(item);
    if (!rec) continue;
    const mint = rec.mint;
    if (typeof mint !== "string" || !mint) continue;
    const amount = rawAmountFromTransfer(rec);
    if (amount === null || amount === 0n) continue;
    const from = rec.fromUserAccount;
    const to = rec.toUserAccount;
    if (from === wallet) add(mint, -amount);
    if (to === wallet) add(mint, amount);
  }

  return deltas;
}

export function tokenDeltasToJson(
  deltas: Record<string, bigint>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [mint, delta] of Object.entries(deltas)) {
    if (delta !== 0n) out[mint] = delta.toString();
  }
  return out;
}
