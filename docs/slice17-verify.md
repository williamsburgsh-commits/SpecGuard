# Slice 17 — Manual verify endpoint

## API

`POST /api/agents/[wallet]/verify`

- Refreshes PnL snapshot from Supabase `transactions`
- Runs `@specguard/core` `evaluate()` (drawdown, heartbeat, spend, venues)
- If agent is **GREEN** and evaluation breaches → inserts RED `status_events` (preserves existing `first_breach_event_id`)
- If agent is already **RED** → returns reasons only; **does not** insert duplicate breach rows

Response:

```json
{
  "ok": true,
  "status": "GREEN",
  "reasons": [],
  "checkedThroughSig": "...",
  "computedAt": "...",
  "markedRed": false,
  "drawdownPct": 0,
  "realizedUsdc": 0
}
```

Rate limit: `verify_requests` table — 5/min per wallet, 30/min per IP (hashed).

## UI

`/agent/[wallet]` — **Re-verify policy** button (`VerifyButton.tsx`).

## DoD

1. POST verify on a GREEN agent returns `{ status: "GREEN", reasons: [] }` (or breach reasons without marking if already RED).
2. Rate limit returns 429 when exceeded.
3. RED agent re-verify does not add a second `first_breach` event.

```bash
npm run web:test
npm run web:build
```
