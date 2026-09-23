# Slice 18 — Crons (webhook-sync + pnl-refresh)

## Routes

All `GET`, auth: `Authorization: Bearer $CRON_SECRET`

| Path | Behavior |
|------|----------|
| `/api/cron/webhook-sync` | `PUT` Helius webhook with all agent wallets |
| `/api/cron/pnl-refresh` | Refresh PnL for **GREEN** agents; `max_drawdown` breach → RED |
| `/api/cron/heartbeat-sweep` | (Slice 9) stale heartbeat → RED |

## Vercel

Daily UTC crons in root `vercel.json`. See `docs/vercel-cron-hobby.md` for Hobby vs Pro vs external schedulers.

## DoD

1. `npm run test:cron-webhook-sync` — Helius list covers all Supabase agents.
2. `npm run test:cron-pnl-refresh` — runs without error for GREEN agents.
3. `npm run test:cron-http` — with `npm run web:dev`, all three routes return `{ ok: true }`.

```bash
npm run web:build
```

After deploy, Vercel → Project → Cron Jobs shows the three paths (daily on Hobby).
