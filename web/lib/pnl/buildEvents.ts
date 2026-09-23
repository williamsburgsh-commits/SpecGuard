import {
  USDC_MINT,
  WSOL_MINT,
  type TradeEvent,
  type TradeEventKind,
} from "@specguard/core";

export interface TransactionRowForPnl {
  signature: string;
  kind: string;
  sol_delta_lamports: number;
  fee_lamports: number;
  token_deltas: Record<string, string> | null;
  success: boolean;
}

function readTokenDelta(
  tokenDeltas: Record<string, string> | null,
  mint: string,
): number {
  const raw = tokenDeltas?.[mint];
  if (!raw) return 0;
  try {
    return Number(BigInt(raw));
  } catch {
    return 0;
  }
}

export function buildTradeEventsFromRows(
  rows: readonly TransactionRowForPnl[],
  markUsdcPerSol: number,
  usdcMint: string = USDC_MINT,
): TradeEvent[] {
  const events: TradeEvent[] = [];
  for (const row of rows) {
    if (row.kind !== "swap" && row.kind !== "limit_fill") continue;
    if (!row.success) continue;

    const tokenDeltas = row.token_deltas ?? {};
    const solDeltaLamports =
      row.sol_delta_lamports + readTokenDelta(tokenDeltas, WSOL_MINT);
    const usdcRaw = readTokenDelta(tokenDeltas, usdcMint);

    events.push({
      kind: row.kind as TradeEventKind,
      solDelta: solDeltaLamports / 1e9,
      usdcDelta: usdcRaw / 1e6,
      feeSol: row.fee_lamports / 1e9,
      markUsdcPerSol,
    });
  }
  return events;
}
