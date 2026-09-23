import { NextResponse } from "next/server";
import { listAgents, type AgentOrder, type AgentSort, type AgentStatusFilter } from "@/lib/agents/listAgents";
import { getSupabasePublic } from "@/lib/supabase/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 10;

function parseStatus(value: string | null): AgentStatusFilter {
  if (value === "GREEN" || value === "RED") return value;
  return "all";
}

function parseSort(value: string | null): AgentSort {
  if (value === "registered_at" || value === "name" || value === "pnl") return value;
  return "days_active";
}

function parseOrder(value: string | null): AgentOrder {
  return value === "asc" ? "asc" : "desc";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const supabase = getSupabasePublic();
    const agents = await listAgents(supabase, {
      status: parseStatus(searchParams.get("status")),
      sort: parseSort(searchParams.get("sort")),
      order: parseOrder(searchParams.get("order")),
    });
    return NextResponse.json(
      { ok: true, agents, count: agents.length },
      { headers: { "Cache-Control": "public, max-age=10" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
