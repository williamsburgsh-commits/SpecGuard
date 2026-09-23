import type { SupabaseClient } from "@supabase/supabase-js";
import { formatBreachDate, type BadgeVisualState } from "./render";

export interface BadgeContext {
  state: BadgeVisualState;
  breachDate: string | null;
}

export async function fetchBadgeContext(
  supabase: SupabaseClient,
  wallet: string,
): Promise<BadgeContext> {
  const { data: agent, error } = await supabase
    .from("agents")
    .select("status, status_since, first_breach_event_id")
    .eq("wallet", wallet)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!agent) {
    return { state: "unknown", breachDate: null };
  }

  const status = agent.status === "RED" ? "red" : "green";
  let breachDate: string | null = null;

  if (agent.first_breach_event_id) {
    const { data: ev } = await supabase
      .from("status_events")
      .select("occurred_at")
      .eq("id", agent.first_breach_event_id)
      .maybeSingle();
    breachDate = formatBreachDate(ev?.occurred_at ?? null);
  }

  if (status === "red" && !breachDate) {
    breachDate = formatBreachDate(agent.status_since);
  }

  return { state: status, breachDate };
}
