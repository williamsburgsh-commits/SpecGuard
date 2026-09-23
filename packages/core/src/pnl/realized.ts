export type TradeEventKind = "swap" | "limit_fill";

export interface TradeEvent {
  kind: TradeEventKind;
  /** Positive = net SOL acquired; negative = SOL sold. */
  solDelta: number;
  /** Positive = USDC received; negative = USDC spent. */
  usdcDelta: number;
  /** SOL paid as fees (reduces effective fill). */
  feeSol?: number;
  /** SOL/USDC mark at event time (USDC per 1 SOL). */
  markUsdcPerSol: number;
}

export interface PnlInitialBalances {
  usdc: number;
  sol: number;
  /** Cost basis for initial SOL inventory (USDC per SOL). */
  avgCostUsdcPerSol?: number;
}

export interface PnlSnapshot {
  realizedUsdc: number;
  inventorySol: number;
  avgCostUsdcPerSol: number;
  usdcBalance: number;
  equityUsdc: number;
  peakEquityUsdc: number;
  drawdownPct: number;
}

function emptySnapshot(initial: PnlInitialBalances, mark: number): PnlSnapshot {
  const avg =
    initial.avgCostUsdcPerSol ??
    (initial.sol > 0 ? mark : 0);
  const equity = initial.usdc + initial.sol * mark;
  return {
    realizedUsdc: 0,
    inventorySol: initial.sol,
    avgCostUsdcPerSol: avg,
    usdcBalance: initial.usdc,
    equityUsdc: equity,
    peakEquityUsdc: equity,
    drawdownPct: 0,
  };
}

function applyFeesToSolDelta(solDelta: number, feeSol: number | undefined): number {
  if (!feeSol || feeSol <= 0) return solDelta;
  if (solDelta > 0) return Math.max(0, solDelta - feeSol);
  return solDelta - feeSol;
}

function finalizeEquity(state: Omit<PnlSnapshot, "equityUsdc" | "drawdownPct">, mark: number): PnlSnapshot {
  const equityUsdc = state.usdcBalance + state.inventorySol * mark;
  const peakEquityUsdc = Math.max(state.peakEquityUsdc, equityUsdc);
  const drawdownPct =
    peakEquityUsdc > 0
      ? ((peakEquityUsdc - equityUsdc) / peakEquityUsdc) * 100
      : 0;
  return {
    ...state,
    equityUsdc,
    peakEquityUsdc,
    drawdownPct,
  };
}

export function applyTradeEvent(
  state: PnlSnapshot,
  event: TradeEvent,
): PnlSnapshot {
  const feeSol = event.feeSol ?? 0;
  const feeUsdc = feeSol * event.markUsdcPerSol;
  let {
    realizedUsdc,
    inventorySol,
    avgCostUsdcPerSol,
    usdcBalance,
    peakEquityUsdc,
  } = state;

  usdcBalance += event.usdcDelta - feeUsdc;

  const effectiveSolDelta = applyFeesToSolDelta(event.solDelta, event.feeSol);

  if (effectiveSolDelta > 0) {
    const qty = effectiveSolDelta;
    const usdcSpent =
      event.usdcDelta < 0 ? -event.usdcDelta + feeUsdc : qty * event.markUsdcPerSol;
    const newInv = inventorySol + qty;
    avgCostUsdcPerSol =
      newInv > 0
        ? (inventorySol * avgCostUsdcPerSol + usdcSpent) / newInv
        : avgCostUsdcPerSol;
    inventorySol = newInv;
  } else if (effectiveSolDelta < 0) {
    const qty = -effectiveSolDelta;
    const sellQty = Math.min(qty, inventorySol);
    if (sellQty > 0) {
      const usdcReceived =
        event.usdcDelta > 0
          ? event.usdcDelta
          : sellQty * event.markUsdcPerSol;
      const price = usdcReceived / sellQty;
      realizedUsdc += (price - avgCostUsdcPerSol) * sellQty;
      inventorySol -= sellQty;
      if (inventorySol <= 1e-12) {
        inventorySol = 0;
        avgCostUsdcPerSol = 0;
      }
    }
  }

  return finalizeEquity(
    {
      realizedUsdc,
      inventorySol,
      avgCostUsdcPerSol,
      usdcBalance,
      peakEquityUsdc,
    },
    event.markUsdcPerSol,
  );
}

export function computeRealizedPnl(
  events: readonly TradeEvent[],
  initial: PnlInitialBalances,
  finalMarkUsdcPerSol: number,
): PnlSnapshot {
  const firstMark = events[0]?.markUsdcPerSol ?? finalMarkUsdcPerSol;
  let state = emptySnapshot(initial, firstMark);
  for (const event of events) {
    state = applyTradeEvent(state, event);
  }
  return finalizeEquity(
    {
      realizedUsdc: state.realizedUsdc,
      inventorySol: state.inventorySol,
      avgCostUsdcPerSol: state.avgCostUsdcPerSol,
      usdcBalance: state.usdcBalance,
      peakEquityUsdc: state.peakEquityUsdc,
    },
    finalMarkUsdcPerSol,
  );
}
