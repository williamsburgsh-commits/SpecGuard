import { NextResponse } from "next/server";
import { fetchAgentDetail } from "@/lib/agents/fetchAgentDetail";
import { getSupabasePublic } from "@/lib/supabase/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { wallet: string } },
) {
  const { wallet } = context.params;
  try {
    const supabase = getSupabasePublic();
    const agent = await fetchAgentDetail(supabase, wallet);
    if (!agent) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, agent });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
