# Slice 11 — Supabase schema + RLS + Realtime

## Migrations

| File | Purpose |
|------|---------|
| `0009_verify_requests_realtime.sql` | `verify_requests` (service-only RLS), Realtime on `agents` |
| `0010_seed_agent1_policy.sql` | Policy row for Slice 3 memo + `agents.current_policy_id` |

Remote: `0009_verify_requests_realtime_slice11`, `0010_seed_agent1_policy_slice11_fix`.

## DoD checks

```bash
npm run test:supabase-rls
npm run test:supabase-schema
```

Dashboard: **Database → Publications → `supabase_realtime`** must include **`agents`** and **`status_events`**.

## Tables (§3)

Present: `agents`, `policies`, `transactions`, `status_events`, `pnl_snapshots`, `webhook_events`, `verify_requests`.

Deferred: `buyback_events` (section 7 / T1–T3).
