import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEnhancedTx, type NormalizedHeliusTx } from "./classify";
import {
  applyRegistrySideEffects,
  extractMemoFromNormalizedRaw,
} from "./registryStatus";
import { refreshPnlSnapshot } from "../pnl/refreshSnapshot";
import { resolveWalletForPayload } from "./resolveWallet";

export interface IngestResult {
  processed: number;
  skipped: number;
  errors: string[];
}

export async function ingestHeliusPayload(
  supabase: SupabaseClient,
  payloads: unknown[],
  options?: { fallbackWallet?: string },
): Promise<IngestResult> {
  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  const { data: agentRows } = await supabase.from("agents").select("wallet");
  const registered = new Set((agentRows ?? []).map((r) => r.wallet));

  for (const payload of payloads) {
    const watched =
      resolveWalletForPayload(payload, registered) ??
      options?.fallbackWallet;
    if (!watched) {
      errors.push("skipped: could not resolve watched wallet");
      skipped += 1;
      continue;
    }

    const normalized = normalizeEnhancedTx(payload, watched);
    if (!normalized) {
      errors.push("skipped: could not normalize payload item");
      skipped += 1;
      continue;
    }

    const one = await ingestOne(supabase, payload, normalized);
    if (one === "processed") processed += 1;
    else if (one === "skipped") skipped += 1;
    else errors.push(one);
  }

  return { processed, skipped, errors };
}

async function ingestOne(
  supabase: SupabaseClient,
  rawPayload: unknown,
  tx: NormalizedHeliusTx,
): Promise<"processed" | "skipped" | string> {
  const { data: existingEvent, error: fetchErr } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("signature", tx.signature)
    .maybeSingle();

  if (fetchErr) {
    return `webhook_events lookup: ${fetchErr.message}`;
  }
  if (existingEvent) {
    const memoText = extractMemoFromNormalizedRaw(tx.raw);
    await applyRegistrySideEffects(supabase, tx, memoText);
    return "skipped";
  }

  const { error: eventErr } = await supabase.from("webhook_events").insert({
    signature: tx.signature,
    payload: rawPayload as Record<string, unknown>,
    processed: false,
  });

  if (eventErr) {
    if (eventErr.code === "23505") return "skipped";
    return `webhook_events insert: ${eventErr.message}`;
  }

  const { error: txErr } = await supabase.from("transactions").upsert(
    {
      signature: tx.signature,
      wallet: tx.wallet,
      blocktime: tx.blocktime.toISOString(),
      slot: tx.slot,
      kind: tx.kind,
      program_ids: tx.programIds,
      sol_delta_lamports: tx.solDeltaLamports,
      token_deltas: tx.tokenDeltas,
      fee_lamports: tx.feeLamports,
      success: tx.success,
      raw: tx.raw,
    },
    { onConflict: "signature", ignoreDuplicates: true },
  );

  if (txErr) {
    await supabase
      .from("webhook_events")
      .update({ processed: false, error: txErr.message })
      .eq("signature", tx.signature);
    return `transactions upsert: ${txErr.message}`;
  }

  await supabase
    .from("webhook_events")
    .update({ processed: true, error: null })
    .eq("signature", tx.signature);

  const memoText = extractMemoFromNormalizedRaw(tx.raw);
  const sideEffectErr = await applyRegistrySideEffects(
    supabase,
    tx,
    memoText,
  );
  if (sideEffectErr) {
    await supabase
      .from("webhook_events")
      .update({ processed: true, error: sideEffectErr })
      .eq("signature", tx.signature);
    return sideEffectErr;
  }

  await supabase
    .from("agents")
    .update({
      last_tx_at: tx.blocktime.toISOString(),
      last_tx_sig: tx.signature,
    })
    .eq("wallet", tx.wallet);

  if (tx.kind === "swap" || tx.kind === "limit_fill") {
    try {
      await refreshPnlSnapshot(supabase, tx.wallet);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("webhook_events")
        .update({ processed: true, error: `pnl_refresh: ${msg}` })
        .eq("signature", tx.signature);
    }
  }

  return "processed";
}
