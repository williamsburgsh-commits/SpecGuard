import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_HEARTBEAT_INTERVAL_SEC = 300;

export function isHeartbeatStale(
  lastHeartbeatAt: Date | null,
  intervalSec: number,
  now: Date,
): boolean {
  const graceSec = intervalSec * 2;
  if (!lastHeartbeatAt) return true;
  const ageSec = (now.getTime() - lastHeartbeatAt.getTime()) / 1000;
  return ageSec > graceSec;
}

async function resolveHeartbeatIntervalSec(
  supabase: SupabaseClient,
  wallet: string,
): Promise<number> {
  const { data } = await supabase
    .from("policies")
    .select("heartbeat_interval_sec")
    .eq("wallet", wallet)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sec = data?.heartbeat_interval_sec;
  if (typeof sec === "number" && sec > 0) return sec;
  return DEFAULT_HEARTBEAT_INTERVAL_SEC;
}

async function markHeartbeatMissed(
  supabase: SupabaseClient,
  wallet: string,
  intervalSec: number,
  lastHeartbeatAt: string | null,
  now: Date,
): Promise<boolean> {
  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select("status, first_breach_event_id")
    .eq("wallet", wallet)
    .maybeSingle();

  if (agentErr || !agent || agent.status !== "GREEN") {
    return false;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("status_events")
    .insert({
      wallet,
      from_status: "GREEN",
      to_status: "RED",
      reason: "heartbeat_missed",
      proof_sig: null,
      detail: {
        heartbeatIntervalSec: intervalSec,
        lastHeartbeatAt,
        graceSec: intervalSec * 2,
        sweptAt: now.toISOString(),
      },
      occurred_at: now.toISOString(),
    })
    .select("id")
    .single();

  if (insertErr) {
    throw new Error(`status_events insert: ${insertErr.message}`);
  }

  const patch: Record<string, unknown> = {
    status: "RED",
    status_since: now.toISOString(),
  };
  if (!agent.first_breach_event_id && inserted?.id) {
    patch.first_breach_event_id = inserted.id;
  }

  const { error: updateErr } = await supabase
    .from("agents")
    .update(patch)
    .eq("wallet", wallet)
    .eq("status", "GREEN");

  if (updateErr) {
    throw new Error(`agents update: ${updateErr.message}`);
  }

  return true;
}

export interface HeartbeatSweepResult {
  checked: number;
  markedRed: number;
  wallets: string[];
}

export async function sweepStaleHeartbeats(
  supabase: SupabaseClient,
  options?: { wallet?: string; now?: Date },
): Promise<HeartbeatSweepResult> {
  const now = options?.now ?? new Date();
  let query = supabase
    .from("agents")
    .select("wallet, status, last_heartbeat_at")
    .eq("status", "GREEN");

  if (options?.wallet) {
    query = query.eq("wallet", options.wallet);
  }

  const { data: agents, error } = await query;
  if (error) {
    throw new Error(`agents list: ${error.message}`);
  }

  let markedRed = 0;
  const wallets: string[] = [];

  for (const row of agents ?? []) {
    const intervalSec = await resolveHeartbeatIntervalSec(supabase, row.wallet);
    const lastHb = row.last_heartbeat_at
      ? new Date(row.last_heartbeat_at)
      : null;
    if (!isHeartbeatStale(lastHb, intervalSec, now)) continue;

    const did = await markHeartbeatMissed(
      supabase,
      row.wallet,
      intervalSec,
      row.last_heartbeat_at,
      now,
    );
    if (did) {
      markedRed += 1;
      wallets.push(row.wallet);
    }
  }

  return { checked: agents?.length ?? 0, markedRed, wallets };
}
