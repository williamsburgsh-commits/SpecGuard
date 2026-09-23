# Slice 14 — Register prepare + confirm

## API

- `POST /api/register/prepare` — `{ wallet, policy }` → `{ memoText, policyHash, meetsMinimum, … }`
- `POST /api/register/confirm` — `{ wallet, signature, policyHash }` → agent row + Helius webhook sync

## UI

`/register` — wallet connect (Phantom, Solflare, Backpack, Coinbase) → $GUARD gate → policy form → sign memo → confirm.

**R1:** The connected wallet is the watched trading wallet.

## Env (server)

- `HELIUS_WEBHOOK_ID`, `HELIUS_WEBHOOK_AUTH_HEADER`, `WEBHOOK_PUBLIC_URL`
- `GUARD_MIN_BALANCE_RAW`, `HELIUS_API_KEY` (or RPC for tx verify)

## Env (browser)

- `NEXT_PUBLIC_SOLANA_RPC_URL` — browser memo tx (all supported wallets)

## DoD — wallet #2

1. Fund a **second** wallet with ≥ 2M $GUARD + SOL for fees.
2. Complete `/register` with Phantom.
3. Row in Supabase `agents` (not `is_specguard` demo).
4. Solscan shows policy memo sig.
5. `npm run test:helius-webhook-addresses -- --sync` — Helius lists demo + wallet #2.

## Webhook ingest

Ingest resolves the watched wallet per tx from all `agents` rows (multi-wallet).
