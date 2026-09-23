import { NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { getSupabasePublic } from "@/lib/supabase/public";
import { fetchAgentSummary } from "@/lib/status/fetchAgentSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 10;

export async function GET() {
  try {
    const { NEXT_PUBLIC_SPECGUARD_AGENT_WALLET } = getPublicEnv();
    const supabase = getSupabasePublic();
    const summary = await fetchAgentSummary(
      supabase,
      NEXT_PUBLIC_SPECGUARD_AGENT_WALLET,
    );
    if (!summary) {
      return NextResponse.json({ ok: false, error: "agent not found" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, agent: summary, computedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
        },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
