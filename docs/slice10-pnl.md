# Slice 10 — PnL snapshots

## Scope

- Migration `0008_pnl_snapshots.sql` (+ remote `0008_pnl_snapshots_slice10`)
- Classify Jupiter `SWAP` / aggregator v6 → `kind = swap`
- Helius `tokenTransfers` → `transactions.token_deltas`
- `@specguard/core` `computeRealizedPnl` over ordered `swap` + `limit_fill` rows
- Webhook hook: after ingest of swap/fill → `refreshPnlSnapshot`
- Cron stub: `GET /api/cron/pnl-refresh` (same refresh, all agents with `last_tx_at`)

## Env (optional)

- `PNL_BASELINE_USDC` / `PNL_BASELINE_SOL` — starting balances for equity (default `0`)
- `JUPITER_API_KEY` — Jupiter Price v3 for mark (same as Slice 5)

## Commands

```bash
npm run build -w @specguard/core   # after core mint constants change
npm run web:test
npm run test:pnl-refresh
```

## DoD

- Unit: `web/tests/pnl.compute.test.ts` — buy/sell rows match hand `computeRealizedPnl` within tolerance
- Smoke: `test:pnl-refresh` inserts `pnl_snapshots` row; `realized_usdc` matches local recompute within `0.01` USDC

## Notes

- Existing txs with empty `token_deltas` are backfilled from `transactions.raw` on refresh
- Drawdown breach → RED is Slice 18 (`pnl-refresh` cron + `evaluate`); this slice only persists snapshots
