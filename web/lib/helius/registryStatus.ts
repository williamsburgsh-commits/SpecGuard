import type { SupabaseClient } from "@supabase/supabase-js";
import { decodeMemo } from "@specguard/core";
import type { NormalizedHeliusTx } from "./classify";

export async function applyRegistrySideEffects(
  supabase: SupabaseClient,
  tx: NormalizedHeliusTx,
  memoText: string | null,
): Promise<string | null> {
  if (tx.kind === "memo_flatten" && memoText) {
    return applyFlattenObserved(supabase, tx, memoText);
  }
  if (tx.kind === "memo_policy") {
    return null;
  }
  if (tx.kind === "memo_heartbeat" && memoText) {
    const decoded = decodeMemo(memoText);
    const atSec =
      decoded?.kind === "heartbeat"
        ? decoded.timestampSec
        : Math.floor(tx.blocktime.getTime() / 1000);
    await supabase
      .from("agents")
      .update({
        last_heartbeat_at: new Date(atSec * 1000).toISOString(),
        last_heartbeat_sig: tx.signature,
      })
      .eq("wallet", tx.wallet);
    return null;
  }
  return null;
}

async function applyFlattenObserved(
  supabase: SupabaseClient,
  tx: NormalizedHeliusTx,
  memoText: string,
): Promise<string | null> {
  const decoded = decodeMemo(memoText);
  if (decoded?.kind !== "flatten") {
    return "flatten memo did not decode";
  }

  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select("wallet, status, first_breach_event_id")
    .eq("wallet", tx.wallet)
    .maybeSingle();

  if (agentErr) {
    return `agents lookup: ${agentErr.message}`;
  }
  if (!agent) {
    return `agents: wallet ${tx.wallet} not registered`;
  }

  const fromStatus = agent.status as string;
  const toStatus = "RED";
  const reason = "flatten_observed";

  const { data: existingEvent } = await supabase
    .from("status_events")
    .select("id")
    .eq("proof_sig", tx.signature)
    .maybeSingle();

  if (existingEvent) {
    return null;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("status_events")
    .insert({
      wallet: tx.wallet,
      from_status: fromStatus,
      to_status: toStatus,
      reason,
      proof_sig: tx.signature,
      detail: {
        flattenReason: decoded.reason,
        priorSigs: decoded.sigs,
        txKind: tx.kind,
      },
      occurred_at: tx.blocktime.toISOString(),
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") return null;
    return `status_events insert: ${insertErr.message}`;
  }

  const agentPatch: Record<string, unknown> = {
    status: toStatus,
    status_since: tx.blocktime.toISOString(),
  };
  if (!agent.first_breach_event_id && inserted?.id) {
    agentPatch.first_breach_event_id = inserted.id;
  }

  const { error: updateErr } = await supabase
    .from("agents")
    .update(agentPatch)
    .eq("wallet", tx.wallet);

  if (updateErr) {
    return `agents RED update: ${updateErr.message}`;
  }

  return null;
}

export function extractMemoFromNormalizedRaw(
  raw: Record<string, unknown>,
): string | null {
  const logs = raw.logMessages;
  if (Array.isArray(logs)) {
    for (const line of logs) {
      if (typeof line !== "string") continue;
      const prefix = "Program log: Memo ";
      if (line.startsWith(prefix)) {
        return line.slice(prefix.length);
      }
    }
  }
  return null;
}
