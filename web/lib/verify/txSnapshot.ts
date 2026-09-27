import { USDC_MINT, type TxSnapshot } from "@specguard/core";

export interface TxRow {
  signature: string;
  program_ids: string[] | null;
  sol_delta_lamports: number | string;
  fee_lamports: number | string;
  token_deltas: Record<string, string> | null;
  success: boolean;
  blocktime?: string | null;
  raw?: Record<string, unknown> | null;
}

function blocktimeSec(row: TxRow): number | undefined {
  if (!row.blocktime) return undefined;
  const ms = Date.parse(row.blocktime);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
}

export function txRowToSnapshot(
  row: TxRow,
  markUsdcPerSol: number,
): TxSnapshot {
  const programIds = row.program_ids ?? [];
  const ts = blocktimeSec(row);
  if (!row.success) {
    return {
      signature: row.signature,
      spendSol: 0,
      programIds,
      ...(ts != null ? { timestampSec: ts } : {}),
    };
  }

  let spendSol = 0;
  const solDelta = Number(row.sol_delta_lamports);
  if (solDelta < 0) spendSol += -solDelta / 1e9;
  spendSol += Number(row.fee_lamports) / 1e9;

  const mark = markUsdcPerSol > 0 ? markUsdcPerSol : 1;
  for (const [mint, raw] of Object.entries(row.token_deltas ?? {})) {
    if (mint !== USDC_MINT) continue;
    try {
      const delta = BigInt(raw);
      if (delta < 0n) {
        spendSol += Number(-delta) / 1e6 / mark;
      }
    } catch {
      /* skip */
    }
  }

  return {
    signature: row.signature,
    spendSol,
    programIds,
    ...(ts != null ? { timestampSec: ts } : {}),
  };
}
