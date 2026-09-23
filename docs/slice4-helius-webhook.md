# Slice 4 — Helius webhook → Supabase

## Prerequisites

1. **Supabase service role** in repo `.env` (`SUPABASE_SERVICE_ROLE_KEY` from dashboard → Settings → API).
2. **Helius API key** (`HELIUS_API_KEY`).
3. **Webhook secret** — set `HELIUS_WEBHOOK_AUTH_HEADER` (e.g. `Bearer` + random hex). Use the **same** value in Helius webhook config and Next.js env.
4. **Public HTTPS URL** for the Next app (`WEBHOOK_PUBLIC_URL`), e.g. a Vercel preview deployment.

## Local env for Next (`web/`)

Next loads **repo-root** `.env` and optional `web/.env.local` (see `web/next.config.mjs`). Copy keys from root `.env` / `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
HELIUS_WEBHOOK_AUTH_HEADER=
NEXT_PUBLIC_SPECGUARD_AGENT_WALLET=BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK
NEXT_PUBLIC_SOLANA_RPC_URL=
HELIUS_API_KEY=
```

## Verify ingest (no Helius)

```bash
npm run test:ingest-smoke
```

Expect: first delivery processed, duplicate skipped, one row in `transactions`.

## Register Helius webhook

After deploy:

```bash
npm run helius:register-webhook
```

Saves `HELIUS_WEBHOOK_ID` from CLI output into `.env`.

## Slice 4 DoD (live)

1. `npm run agent:self-transfer` — 0.001 SOL self-transfer on mainnet.
2. Within ~60s, Helius POSTs to `/api/webhooks/helius`.
3. Confirm row in Supabase `transactions` with that signature (Table Editor or SQL).

If Helius hit Vercel SSO before protection was disabled, replay once:

```bash
npm run webhook:replay-transfer
npx tsx scripts/verify-tx-signature.ts <signature>
```

## Endpoint

`POST /api/webhooks/helius` — `Authorization` header must match `HELIUS_WEBHOOK_AUTH_HEADER`.
