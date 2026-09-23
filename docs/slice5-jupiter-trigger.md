# Slice 5 — Jupiter Trigger (limit order)

## Commands

```bash
npm run agent:trigger-demo -- --dry-run
npm run agent:trigger-demo              # bid if ≥5 USDC, else SOL→USDC ask
npm run agent:trigger-demo -- --side=bid
npm run agent:trigger-demo -- --side=ask
npx tsx agent/scripts/trigger-cancel-order.ts <orderKey>
npx tsx agent/scripts/usdc-balance.ts
```

## Env

| Variable | Purpose |
|----------|---------|
| `JUPITER_API_KEY` | Optional — `api.jup.ag` pro rate limits |
| (none) | Uses `lite-api.jup.ag/trigger/v1` when no key |

Price mid: `https://api.jup.ag/price/v3?ids=So111111...`

## Funding (mainnet)

Jupiter enforces **~$5 minimum** notional per order.

| Side | Needs |
|------|--------|
| **Bid** (USDC→SOL) | ≥ **5 USDC** + ~0.01 SOL fees |
| **Ask** (SOL→USDC) | ≥ **~0.05 SOL** for order + **extra ~0.015 SOL** for cancel fees (collateral locks until cancel) |

## Slice 5 DoD (live)

1. `createOrder` + `/execute` — open order visible in Jupiter / `getTriggerOrders?orderStatus=active`.
2. `cancelOrder` + `/execute` — order gone from active list.
3. Create + cancel signatures on Solscan.
4. Optional: Helius webhook rows in `transactions` (may lag).

## Code

- `agent/src/jupiter/trigger.ts` — create / list / cancel / execute
- `agent/src/jupiter/signWireTransaction.ts` — sign Jupiter base64 txs with Kit keypair
