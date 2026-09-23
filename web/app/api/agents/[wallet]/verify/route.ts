import { NextResponse } from "next/server";
import {
  assertVerifyRateLimit,
  clientIpFromRequest,
  hashClientIp,
  VerifyRateLimitError,
} from "@/lib/ratelimit/verifyRateLimit";
import { isLikelySolanaAddress } from "@/lib/solana/rpc";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { runAgentVerify } from "@/lib/verify/runAgentVerify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: { wallet: string } },
) {
  const wallet = context.params.wallet?.trim();
  if (!wallet || !isLikelySolanaAddress(wallet)) {
    return NextResponse.json(
      { ok: false, error: "valid wallet required" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const ipHash = hashClientIp(clientIpFromRequest(request));
    await assertVerifyRateLimit(supabase, wallet, ipHash);

    const result = await runAgentVerify(supabase, wallet);

    return NextResponse.json({
      ok: true,
      status: result.status,
      reasons: result.reasons,
      checkedThroughSig: result.checkedThroughSig,
      computedAt: result.computedAt,
      markedRed: result.markedRed,
      drawdownPct: result.drawdownPct,
      realizedUsdc: result.realizedUsdc,
    });
  } catch (e) {
    if (e instanceof VerifyRateLimitError) {
      return NextResponse.json(
        { ok: false, error: e.message },
        { status: 429 },
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    const status =
      message.includes("not registered") || message.includes("No active policy")
        ? 404
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
