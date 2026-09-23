import {
  computeRealizedPnl,
  type PnlInitialBalances,
  type PnlSnapshot,
} from "@specguard/core";
import {
  buildTradeEventsFromRows,
  type TransactionRowForPnl,
} from "./buildEvents";

export interface PnlComputeResult {
  snapshot: PnlSnapshot;
  throughSig: string | null;
  tradeEventCount: number;
}

export function computePnlFromTransactionRows(
  rows: readonly TransactionRowForPnl[],
  initial: PnlInitialBalances,
  markUsdcPerSol: number,
): PnlComputeResult {
  const tradeRows = rows.filter(
    (r) =>
      r.success && (r.kind === "swap" || r.kind === "limit_fill"),
  );
  const events = buildTradeEventsFromRows(tradeRows, markUsdcPerSol);
  const snapshot = computeRealizedPnl(events, initial, markUsdcPerSol);
  const throughSig =
    tradeRows.length > 0 ? tradeRows[tradeRows.length - 1]!.signature : null;
  return { snapshot, throughSig, tradeEventCount: events.length };
}
