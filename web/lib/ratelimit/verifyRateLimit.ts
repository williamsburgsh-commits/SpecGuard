import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_MS = 60_000;
const MAX_PER_WALLET = 5;
const MAX_PER_IP = 30;

export class VerifyRateLimitError extends Error {
  constructor(message = "Too many verify requests. Try again in a minute.") {
    super(message);
    this.name = "VerifyRateLimitError";
  }
}

export function hashClientIp(ip: string): string {
  const salt = process.env.CRON_SECRET ?? "specguard-verify";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function assertVerifyRateLimit(
  supabase: SupabaseClient,
  wallet: string,
  ipHash: string,
): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count: walletCount, error: wErr } = await supabase
    .from("verify_requests")
    .select("id", { count: "exact", head: true })
    .eq("wallet", wallet)
    .gte("requested_at", since);

  if (wErr) throw new Error(`rate limit: ${wErr.message}`);
  if ((walletCount ?? 0) >= MAX_PER_WALLET) {
    throw new VerifyRateLimitError();
  }

  const { count: ipCount, error: iErr } = await supabase
    .from("verify_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("requested_at", since);

  if (iErr) throw new Error(`rate limit: ${iErr.message}`);
  if ((ipCount ?? 0) >= MAX_PER_IP) {
    throw new VerifyRateLimitError();
  }

  const { error: insErr } = await supabase.from("verify_requests").insert({
    wallet,
    ip_hash: ipHash,
  });

  if (insErr) throw new Error(`verify_requests insert: ${insErr.message}`);
}
