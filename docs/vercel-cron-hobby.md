# Vercel cron on Hobby

Hobby allows **each cron to run at most once per day**. `vercel.json` uses daily UTC schedules (not `*/5`).

Cron routes require `Authorization: Bearer $CRON_SECRET`:

| Route | Purpose |
|-------|---------|
| `GET /api/cron/webhook-sync` | Helius webhook addresses = all `agents.wallet` |
| `GET /api/cron/pnl-refresh` | PnL snapshots for GREEN agents + drawdown → RED |
| `GET /api/cron/heartbeat-sweep` | Stale heartbeat → RED |

## Local smoke (direct lib / Helius)

```bash
npm run test:cron-webhook-sync
npm run test:cron-pnl-refresh
```

With dev server on 3001:

```bash
npm run test:cron-http
```

Optional: `CRON_SMOKE_BASE_URL=https://your-preview.vercel.app`

## Faster schedules

**Vercel Pro** — change `vercel.json` to e.g. `*/10 * * * *` (webhook-sync), `*/5 * * * *` (pnl, heartbeat).

**External scheduler** — [cron-job.org](https://cron-job.org) or GitHub Actions hitting the three URLs every 5–10 minutes with the Bearer token.

## Env on Vercel

`CRON_SECRET`, Supabase service role, `HELIUS_*`, `WEBHOOK_PUBLIC_URL`.
