import { NextResponse } from "next/server";
import {
  encodePolicyMemo,
  hashPolicy,
  parsePolicyV1,
  parseGuardMinBalanceRaw,
} from "@specguard/core";
import { getGuardBalanceForWallet } from "@/lib/guard/balance";
import { isLikelySolanaAddress } from "@/lib/solana/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const rec = body as { wallet?: string; guardWallet?: string; policy?: unknown };
  const wallet = rec.wallet?.trim();
  const guardWallet = rec.guardWallet?.trim() || wallet;
  if (!wallet || !isLikelySolanaAddress(wallet)) {
    return NextResponse.json(
      { ok: false, error: "valid wallet required" },
      { status: 400 },
    );
  }
  if (!guardWallet || !isLikelySolanaAddress(guardWallet)) {
    return NextResponse.json(
      { ok: false, error: "valid connected wallet required for $GUARD" },
      { status: 400 },
    );
  }

  let policy;
  try {
    policy = parsePolicyV1(rec.policy);
  } catch (e) {
    const message = e instanceof Error ? e.message : "invalid policy";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const guard = await getGuardBalanceForWallet(guardWallet);
    const minBalanceRaw = parseGuardMinBalanceRaw(
      process.env.GUARD_MIN_BALANCE_RAW,
    ).toString();
    const memoText = encodePolicyMemo(policy);
    const policyHash = hashPolicy(policy);

    return NextResponse.json({
      ok: true,
      wallet,
      guardWallet,
      memoText,
      policyHash,
      minGuardRaw: minBalanceRaw,
      guardBalanceRaw: guard.balanceRaw,
      meetsMinimum: guard.meetsMinimum,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
