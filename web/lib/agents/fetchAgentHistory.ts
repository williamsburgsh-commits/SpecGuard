import type { SupabaseClient } from "@supabase/supabase-js";

export interface TxHistoryRow {
  signature: string;
  blocktime: string;
  kind: string;
  success: boolean;
  solDeltaLamports: number;
  feeLamports: number;
  tokenDeltas: Record<string, string>;
}

export interface TxHistoryPage {
  items: TxHistoryRow[];
  nextBefore: string | null;
}

export async function fetchAgentTxHistory(
  supabase: SupabaseClient,
  wallet: string,
  options?: { before?: string; limit?: number },
): Promise<TxHistoryPage> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);

  let query = supabase
    .from("transactions")
    .select(
      "signature, blocktime, kind, success, sol_delta_lamports, fee_lamports, token_deltas",
    )
    .eq("wallet", wallet)
    .order("blocktime", { ascending: false })
    .limit(limit + 1);

  if (options?.before) {
    const { data: cursor } = await supabase
      .from("transactions")
      .select("blocktime")
      .eq("signature", options.before)
      .maybeSingle();
    if (cursor?.blocktime) {
      query = query.lt("blocktime", cursor.blocktime);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items: TxHistoryRow[] = page.map((r) => ({
    signature: r.signature,
    blocktime: r.blocktime,
    kind: r.kind,
    success: r.success,
    solDeltaLamports: Number(r.sol_delta_lamports),
    feeLamports: Number(r.fee_lamports),
    tokenDeltas: (r.token_deltas as Record<string, string>) ?? {},
  }));

  return {
    items,
    nextBefore: hasMore ? items[items.length - 1]?.signature ?? null : null,
  };
}

export async function fetchAgentTxCount(
  supabase: SupabaseClient,
  wallet: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("transactions")
    .select("signature", { count: "exact", head: true })
    .eq("wallet", wallet);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
