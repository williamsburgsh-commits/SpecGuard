import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron/verifyCronAuth";
import {
  fetchHeliusWebhookAddresses,
  syncHeliusWebhookAddresses,
} from "@/lib/helius/syncWebhookAddresses";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!verifyCronAuth(request.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const synced = await syncHeliusWebhookAddresses(supabase);
    let heliusCount: number | null = null;
    try {
      const helius = await fetchHeliusWebhookAddresses();
      heliusCount = helius.length;
    } catch {
      heliusCount = null;
    }

    return NextResponse.json({
      ok: true,
      webhookId: synced.webhookId,
      addresses: synced.addresses,
      count: synced.addresses.length,
      heliusCount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
