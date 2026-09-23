# SpecGuard v2 — Supabase

| Field | Value |
|-------|--------|
| Project name | SpecGuard-v2 |
| Project ref | `oaosnhecdaptmyhrubfx` |
| Region | us-east-1 |
| Dashboard | https://supabase.com/dashboard/project/oaosnhecdaptmyhrubfx |

## Local env

Copy keys from **Settings → API** into `.env` (never commit):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server/crons only)

## Migrations

SQL lives in `supabase/migrations/`:

1. `0001_init.sql` — `agents`, `policies`
2. `0002_indexes.sql`
3. `0003_rls.sql` — anon SELECT only
4. `0004_transactions.sql` — `transactions`, `webhook_events`
5. `0005_seed_agent1.sql`, `0006_rls_transactions.sql`
6. `0007_status_events.sql` — `status_events`, Realtime (Slice 8)
7. `0008_pnl_snapshots.sql` (Slice 10)
8. `0009_verify_requests_realtime.sql`, `0010_seed_agent1_policy.sql` (Slice 11)

Applied to the remote project via Supabase dashboard / MCP.

## RLS smoke test

```bash
npm run test:supabase-rls
```

Expect: empty SELECT succeeds; INSERT rejected.
