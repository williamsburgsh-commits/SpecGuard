import { NextResponse } from "next/server";
import { runPnlRefreshCron } from "@/lib/cron/pnlRefreshCron";
import { verifyCronAuth } from "@/lib/cron/verifyCronAuth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!verifyCronAuth(request.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 500 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const rows = await runPnlRefreshCron(supabase);
    const markedRed = rows.filter((r) => r.markedRed).map((r) => r.wallet);
    return NextResponse.json({
      ok: true,
      refreshed: rows.length,
      markedRed,
      rows,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
