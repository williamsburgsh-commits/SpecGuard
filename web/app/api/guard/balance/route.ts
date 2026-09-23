import { NextResponse } from "next/server";
import { getGuardBalanceForWallet } from "@/lib/guard/balance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.trim();
  if (!wallet) {
    return NextResponse.json(
      { ok: false, error: "wallet query required" },
      { status: 400 },
    );
  }

  try {
    const balance = await getGuardBalanceForWallet(wallet);
    return NextResponse.json(
      { ok: true, ...balance },
      {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
        },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes("Invalid wallet") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
