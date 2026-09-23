import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { verifyHeliusAuth } from "@/lib/helius/verifyWebhook";
import { ingestHeliusPayload } from "@/lib/helius/ingest";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseBody(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") return [body];
  return [];
}

export async function POST(request: Request) {
  const env = getServerEnv();
  const auth = request.headers.get("authorization");
  if (!verifyHeliusAuth(auth, env.HELIUS_WEBHOOK_AUTH_HEADER)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const items = parseBody(body);
  if (items.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, skipped: 0 });
  }

  const supabase = getSupabaseAdmin();
  const result = await ingestHeliusPayload(supabase, items, {
    fallbackWallet: env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET,
  });

  return NextResponse.json({
    ok: result.errors.length === 0,
    ...result,
  });
}
