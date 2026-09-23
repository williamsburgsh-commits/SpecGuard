# Slice 9 — Heartbeat + sweep

## Agent (on-chain HB memo)

```bash
npm run agent:publish-heartbeat
```

Helius webhook → `last_heartbeat_at` / `last_heartbeat_sig` on `agents`.

## Cron (Vercel)

- Route: `GET /api/cron/heartbeat-sweep`
- Auth: `Authorization: Bearer $CRON_SECRET`
- Schedule: every 5 minutes (`vercel.json`)
- Logic: GREEN agents with no HB within **2×** `heartbeat_interval_sec` → RED (`heartbeat_missed`, `proof_sig` null)

Set `CRON_SECRET` in Vercel project env (same value as local `.env` for manual curl tests).

## Smoke tests

```bash
npm run test:ingest-heartbeat
npm run test:heartbeat-sweep
npm run web:test
```

## DoD

1. Heartbeat ingest updates `last_heartbeat_at`.
2. Stale GREEN agent → sweep → RED with `heartbeat_missed`.
3. Existing `first_breach_event_id` preserved when already set (S2).
