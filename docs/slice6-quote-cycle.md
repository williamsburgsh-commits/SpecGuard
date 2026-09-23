# Slice 6 — Quote cycle (evaluate pre-check)

## Commands

```bash
npm run test:agent
npm run agent:quote-cycle -- --dry-run
npm run agent:quote-cycle -- --dry-run --simulate-breach
npm run agent:quote-cycle
```

## Env (see `.env.example`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENT_QUOTE_SIZE_SOL` | `0.05` | Per-side size (auto-bumped for Jupiter ~$5 min) |
| `AGENT_SPREAD_BPS` | `50` | Half-spread around mid |
| `AGENT_CYCLE_MS` | `300000` | Loop interval (future cron; logged only in Slice 6) |
| `AGENT_SOL_FEE_RESERVE` | `0.05` | Documented reserve (enforce in Slice 7 flatten) |
| `AGENT_LAST_HEARTBEAT_SEC` | *(now)* | Until Slice 9, unset = treat heartbeat as fresh |

## DoD

1. `--dry-run` → `Decision: ALLOW` with bid/ask plan.
2. `--dry-run --simulate-breach` → `Decision: skip_breach` (drawdown simulation).
3. Live cycle → cancel stale Trigger orders, post **ask then bid** (keeps SOL for ask collateral before USDC bid), within policy.
4. `npm run test:agent` — plan + evaluate unit tests.

## Funding (live)

- **Bid:** USDC ≥ size × bid price (~$5+ at default size).
- **Ask:** SOL ≥ size + fee headroom (prior orders lock collateral).
