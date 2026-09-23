import { NextResponse } from "next/server";
import { fetchAgentTxHistory } from "@/lib/agents/fetchAgentHistory";
import { getSupabasePublic } from "@/lib/supabase/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { wallet: string } },
) {
  const { wallet } = context.params;
  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 50;

  try {
    const supabase = getSupabasePublic();
    const page = await fetchAgentTxHistory(supabase, wallet, {
      before,
      limit: Number.isFinite(limit) ? limit : 50,
    });
    return NextResponse.json({ ok: true, wallet, ...page });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
