# Slice 8 — FLATTEN → Supabase RED (gate)

## Prerequisites

1. Migration `0007_status_events.sql` applied on project `oaosnhecdaptmyhrubfx`.
2. Vercel deploy includes `web/lib/helius/registryStatus.ts` ingest hook.

## Verify (after Slice 7 flatten on chain)

```bash
npm run webhook:replay-flatten
npm run verify:agent-status
```

Expect:

- `agents.status` = `RED`
- `status_events` row with `reason: flatten_observed`, `proof_sig` = FLATTEN memo tx
- `first_breach_event_id` set (first time only)

## Realtime

Supabase Dashboard → Database → Publications → `supabase_realtime` includes `status_events` (and `agents`).

Subscribe to `agents` updates filtered by wallet to see RED without refresh.

## Operator RESET (post-drill)

Per [docs/v2-decisions.md](v2-decisions.md) S2: manual `SPECGUARD:v1:RESET` memo (Slice 9+ handler) — not automatic after flatten.
