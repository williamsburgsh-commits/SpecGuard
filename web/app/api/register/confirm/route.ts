import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { confirmRegistration } from "@/lib/register/confirmRegistration";
import { isLikelySolanaAddress } from "@/lib/solana/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const rec = body as {
    wallet?: string;
    guardWallet?: string;
    signature?: string;
    policyHash?: string;
  };

  const wallet = rec.wallet?.trim();
  const guardWallet = rec.guardWallet?.trim();
  const signature = rec.signature?.trim();
  const policyHash = rec.policyHash?.trim();

  if (!wallet || !isLikelySolanaAddress(wallet)) {
    return NextResponse.json({ ok: false, error: "valid wallet required" }, { status: 400 });
  }
  if (guardWallet && !isLikelySolanaAddress(guardWallet)) {
    return NextResponse.json(
      { ok: false, error: "valid connected wallet required for $GUARD" },
      { status: 400 },
    );
  }
  if (!signature || signature.length < 80) {
    return NextResponse.json({ ok: false, error: "signature required" }, { status: 400 });
  }
  if (!policyHash || policyHash.length !== 64) {
    return NextResponse.json(
      { ok: false, error: "policyHash required (sha256 hex)" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const result = await confirmRegistration(supabase, {
      wallet,
      guardWallet: guardWallet || wallet,
      signature,
      policyHash: policyHash.toLowerCase(),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status =
      message.includes("below minimum") ||
      message.includes("already registered") ||
      message.includes("must match") ||
      message.includes("not found")
        ? 400
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
