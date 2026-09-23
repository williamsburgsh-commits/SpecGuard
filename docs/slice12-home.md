# Slice 12 — Home page (Vercel preview)

## Routes

- `/` — RSC home: status chip, realized PnL, policy, last tx/heartbeat
- `GET /api/status` — JSON summary, `Cache-Control: max-age=10`

## Realtime

Client hook `web/lib/realtime/useAgentStatus.ts` subscribes to:

- `agents` UPDATE for demo wallet
- `status_events` INSERT (re-fetch agent row)

Fallback: manual refresh or poll `/api/status` every ~30s.

## Env (Vercel + local)

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required for Realtime + public reads)
- `NEXT_PUBLIC_SPECGUARD_AGENT_WALLET`
- `NEXT_PUBLIC_SUPABASE_URL`

## Preview DoD

1. Deploy web to Vercel preview.
2. Home shows current DB status (demo agent may be **RED** after flatten drill).
3. RED shows breach reason + Solscan proof link when `proof_sig` is set.
4. Re-run flatten ingest → chip updates without full page reload (Realtime) or document 30s poll.
