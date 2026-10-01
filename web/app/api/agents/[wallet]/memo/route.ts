import { NextResponse } from "next/server";
import { decodeMemo } from "@specguardxyz/core";
import { verifySignedMemoTransaction } from "@/lib/register/verifyPolicyTx";
import { isLikelySolanaAddress } from "@/lib/solana/rpc";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Indexes a heartbeat or action memo the agent already confirmed onchain.
 * The transaction itself is the credential: fee payer must be the wallet.
 */
export async function POST(
  request: Request,
  context: { params: { wallet: string } },
) {
  const wallet = context.params.wallet?.trim();
  if (!wallet || !isLikelySolanaAddress(wallet)) {
    return NextResponse.json({ ok: false, error: "valid wallet required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const signature = (body as { signature?: string }).signature?.trim();
  if (!signature || signature.length < 80) {
    return NextResponse.json({ ok: false, error: "signature required" }, { status: 400 });
  }

  try {
    const verified = await verifySignedMemoTransaction(signature, wallet);
    const decoded = decodeMemo(verified.memoText);
    if (!decoded || (decoded.kind !== "heartbeat" && decoded.kind !== "action")) {
      return NextResponse.json(
        { ok: false, error: "Transaction memo is not a SpecGuard heartbeat or action" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("wallet")
      .eq("wallet", wallet)
      .maybeSingle();
    if (agentErr) {
      return NextResponse.json({ ok: false, error: agentErr.message }, { status: 500 });
    }
    if (!agent) {
      return NextResponse.json(
        { ok: false, error: "Agent is not registered" },
        { status: 404 },
      );
    }

    const kind = decoded.kind === "heartbeat" ? "memo_heartbeat" : "memo_action";
    const { error: txErr } = await supabase.from("transactions").upsert(
      {
        signature: verified.signature,
        wallet,
        blocktime: verified.blocktime.toISOString(),
        slot: verified.slot,
        kind,
        program_ids: [],
        sol_delta_lamports: 0,
        token_deltas: {},
        fee_lamports: verified.feeLamports,
        success: true,
        raw: { source: "mcp-memo", memo: verified.memoText },
      },
      { onConflict: "signature" },
    );
    if (txErr) {
      return NextResponse.json({ ok: false, error: txErr.message }, { status: 500 });
    }

    if (decoded.kind === "heartbeat") {
      const { error: hbErr } = await supabase
        .from("agents")
        .update({
          last_heartbeat_at: new Date(decoded.timestampSec * 1000).toISOString(),
          last_heartbeat_sig: verified.signature,
        })
        .eq("wallet", wallet);
      if (hbErr) {
        return NextResponse.json({ ok: false, error: hbErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      indexed: true,
      wallet,
      signature: verified.signature,
      kind,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes("not found") || message.includes("must match") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
