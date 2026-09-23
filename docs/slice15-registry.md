# Slice 15 — Registry + agent detail

## Routes

| Path | Description |
|------|-------------|
| `/registry` | Table + `?status=GREEN\|RED\|all`, `sort=days_active`, `order=desc` |
| `/agent/[wallet]` | Status, policy, timeline, tx history (first page), embed snippet |
| `GET /api/agents` | JSON list (same query params) |
| `GET /api/agents/[wallet]` | Full agent detail |
| `GET /api/agents/[wallet]/history?limit=50&before=<sig>` | Cached txs |

## Realtime

`RegistryClient` uses `useRegistry()` — Supabase Realtime on `agents` table refetches list.

## DoD

1. `/registry` shows demo agent + any Slice 14 registrations.
2. Filter **RED** shows demo agent after flatten drill.
3. `/agent/<wallet>` loads tx rows from Supabase `transactions`.

```bash
npm run web:test
npm run web:build
```

Open `/registry` and `/agent/BS3SrBb8…` on Vercel preview.
