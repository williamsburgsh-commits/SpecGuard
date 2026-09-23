# Slice 13 — $GUARD balance API + gate UI

## API

`GET /api/guard/balance?wallet=<pubkey>`

Response:

```json
{
  "ok": true,
  "wallet": "...",
  "mint": "BjbyvvuGbQwNZiYyk3aw1J9mAEUYkW1n5W5h6XAxxo5e",
  "balanceRaw": "0",
  "decimals": 6,
  "balanceDisplay": "0",
  "minBalanceRaw": "2000000000000",
  "minBalanceDisplay": "2,000,000",
  "minWholeTokens": 2000000,
  "meetsMinimum": false
}
```

## Env

| Variable | Purpose |
|----------|---------|
| `GUARD_MIN_BALANCE_RAW` | Minimum raw units (default `2000000000000` = 2M × 10^6) |
| `NEXT_PUBLIC_GUARD_MINT` | Optional override mint |
| `NEXT_PUBLIC_SOLANA_RPC_URL` / `HELIUS_API_KEY` | RPC for token + mint reads |

Set `GUARD_MIN_BALANCE_RAW` on Vercel production when you deploy.

## UI

- `/register` — wallet field + `GuardBalanceGate` (Phantom in Slice 14)
- Home links to `/register`

## Verify

```bash
npm run build -w @specguard/core
npm run test:core
npm run test:guard-balance
```

DoD: wallet below 2M GUARD → `meetsMinimum: false`; at/above → `true`.
