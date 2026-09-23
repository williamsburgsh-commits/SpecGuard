import { NextResponse } from "next/server";
import { fetchBadgeContext } from "@/lib/badge/fetchBadgeContext";
import { renderBadgeSvg } from "@/lib/badge/render";
import { isLikelySolanaAddress } from "@/lib/solana/rpc";
import { getSupabasePublic } from "@/lib/supabase/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE = "public, max-age=60, s-maxage=60, stale-while-revalidate=60";

export async function GET(
  request: Request,
  context: { params: { wallet: string } },
) {
  const wallet = context.params.wallet?.trim();
  if (!wallet || !isLikelySolanaAddress(wallet)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const label = searchParams.get("label");
  const styleParam = searchParams.get("style");
  const style =
    styleParam === "plastic" || styleParam === "flat" ? styleParam : "flat";

  try {
    const supabase = getSupabasePublic();
    const badge = await fetchBadgeContext(supabase, wallet);
    const svg = renderBadgeSvg({
      state: badge.state,
      breachDate: badge.breachDate,
      label,
      style,
      wallet,
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": CACHE,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new NextResponse(message, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
