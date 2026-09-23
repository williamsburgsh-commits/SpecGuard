# SpecGuard v2 — Full Build Plan

**Status:** Draft — architecture only; not started.  
**Product:** Layer 1 (self-flattening Jupiter limit-order agent) + Layer 2 (onchain risk-policy registry).  
**Stack:** Next.js 14 App Router, Supabase, Helius, Jupiter SDK, Phantom, Vercel, TypeScript. Domain: specguard.xyz.

**How to build:** Slice-by-slice only (see [§0 Build philosophy](#0-build-philosophy-slice-by-slice) and [§13 Incremental slices](#13-incremental-build-slices)). Do not scaffold the full monorepo in one pass.

**Agent skills (Solana):** [solana-foundation/solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill) is installed for this repo at [`.agents/skills/solana-dev`](.agents/skills/solana-dev). Reinstall or update:

```bash
npx skills add solana-foundation/solana-dev-skill
```

Use it for wallet/memo txs, Jupiter integration, RPC lookups, security review, and Kit / `@solana/react` patterns when implementing slices that touch Solana.

Grounding facts from the existing repo (reuse, do not re-derive):

- `$GUARD` mint: `BjbyvvuGbQwNZiYyk3aw1J9mAEUYkW1n5W5h6XAxxo5e` (pump.fun ticker `SPECGU`)
- Existing agent wallet: `2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk` (ClawPump-custodied; see NOTE A1)
- Existing spec shape: [spec/reference-spec.json](spec/reference-spec.json); existing status machine and flatten sequence in [SPECGUARD.md](SPECGUARD.md)
- Existing site: Vite/React under [site/](site/), served from `docs/` on GitHub Pages at specguard.xyz (DNS at Namecheap, A records to GitHub). v2 moves to Vercel — see NOTE D1.

---

## 0. Build philosophy (slice-by-slice)

**Goal:** Ship working, verifiable increments. Avoid “big bang” scaffolding that compiles but nothing runs end-to-end.

### Rules

1. **One slice at a time** — only the files and env vars that slice needs.
2. **Definition of Done (DoD)** — each slice has objective pass/fail checks (commands, URLs, Solscan sigs, Supabase rows). No “looks good.”
3. **Gate** — do not start slice *N+1* until slice *N* DoD is signed off (you or a short checklist in BUILD_LOG).
4. **Parallel systems — permanent** — **Phoenix operator + terminal stay forever.** v2 Registry is an **added feature** (Jupiter demo agent + onchain policy registry), not a replacement. Preview v2 on Vercel first; [Slice 19](#slice-19--add-v2-registry-to-specguardxyz-phoenix-unchanged) adds public routes without stopping Phoenix.
5. **Solana work** — when a slice touches chain, read [`.agents/skills/solana-dev/SKILL.md`](.agents/skills/solana-dev/SKILL.md) and relevant `references/` (frontend, payments, security, rpc-quick-lookups) before coding.
6. **Rollback** — each slice should be revertible (small commits, feature flags, or “not wired to prod” until verified).

### What to log after each slice

- Date, slice id, DoD checklist (pass/fail)
- Mainnet tx signatures (if any)
- Env vars added (names only, not secrets)
- Blockers / NOTES resolved

---

## 1. Folder structure

Single repo, two runtimes: `web/` (Next.js on Vercel) and `agent/` (long-running Node process, Layer 1). Shared code in `packages/core/`.

```
specguard-v2/
  package.json                       # npm workspaces: web, agent, packages/core
  tsconfig.base.json
  .gitignore
  .env.example
  README.md
  vercel.json                        # crons: heartbeat-sweep (1 min), webhook-sync (10 min), pnl-refresh (5 min)

  packages/core/
    package.json
    tsconfig.json
    src/index.ts
    src/policy/schema.ts             # zod: PolicyV1 (name, maxDrawdownPct, maxSpendPerTxSol, allowedVenues[], heartbeatIntervalSec, version)
    src/policy/hash.ts               # canonical JSON -> sha256
    src/policy/evaluate.ts           # pure fn: (policy, metrics) -> { status, breachReasons[] }
    src/memo/encode.ts               # policy / heartbeat / flatten memo payload builders (prefix "SPECGUARD:v1:...")
    src/memo/decode.ts               # parse memo string -> typed event or null
    src/solana/programs.ts           # program IDs: Memo, Jupiter Aggregator v6, Jupiter Trigger, System, Token, Token-2022
    src/solana/venues.ts             # venue slug -> program ID set (allowedVenues mapping)
    src/pnl/realized.ts              # pure fn: ordered swap events -> realized PnL, inventory, peak, drawdown%
    src/status/types.ts              # GREEN | RED, reason enums
    src/format.ts

  web/
    package.json
    next.config.mjs
    tsconfig.json
    tailwind.config.ts
    postcss.config.mjs
    middleware.ts                    # CORS for /badge, rate limit headers for /api/agents/[wallet]/verify
    public/favicon.ico
    public/og.png
    public/logo.svg
    app/layout.tsx
    app/globals.css
    app/providers.tsx                # WalletProvider (Phantom), SupabaseProvider
    app/page.tsx                     # specguard.xyz
    app/loading.tsx
    app/error.tsx
    app/not-found.tsx
    app/registry/page.tsx
    app/registry/loading.tsx
    app/agent/[wallet]/page.tsx
    app/agent/[wallet]/loading.tsx
    app/agent/[wallet]/not-found.tsx
    app/register/page.tsx
    app/badge/[wallet]/route.ts      # SVG GET
    app/api/webhooks/helius/route.ts
    app/api/status/route.ts          # home summary (agent #1)
    app/api/agents/route.ts
    app/api/agents/[wallet]/route.ts
    app/api/agents/[wallet]/history/route.ts
    app/api/agents/[wallet]/verify/route.ts
    app/api/register/prepare/route.ts
    app/api/register/confirm/route.ts
    app/api/guard/balance/route.ts
    app/api/cron/heartbeat-sweep/route.ts
    app/api/cron/webhook-sync/route.ts
    app/api/cron/pnl-refresh/route.ts
    components/Nav.tsx
    components/Footer.tsx
    components/StatusChip.tsx
    components/LiveStatusHero.tsx
    components/PnlCard.tsx
    components/PolicyCard.tsx
    components/LastTxCard.tsx
    components/RegisterCta.tsx
    components/AgentTable.tsx
    components/AgentTableFilters.tsx
    components/TxHistoryList.tsx
    components/StatusTimeline.tsx
    components/EmbedSnippet.tsx
    components/VerifyButton.tsx
    components/WalletButton.tsx
    components/GuardBalanceGate.tsx
    components/PolicyForm.tsx
    components/RegisterStepper.tsx
    components/ui/Button.tsx
    components/ui/Card.tsx
    components/ui/Table.tsx
    components/ui/Skeleton.tsx
    components/ui/Input.tsx
    components/ui/Select.tsx
    components/ui/Toast.tsx
    lib/env.ts                       # zod-validated process.env, server/client split
    lib/supabase/client.ts           # browser anon client
    lib/supabase/server.ts           # RSC/route anon client
    lib/supabase/admin.ts            # service-role client (server only)
    lib/supabase/types.ts            # generated DB types
    lib/helius/client.ts             # RPC + enhanced tx API fetchers
    lib/helius/webhooks.ts           # create / get / edit webhook address list
    lib/helius/classify.ts           # Helius enhanced tx -> internal event (swap, limit_create, limit_cancel, memo_policy, memo_heartbeat, memo_flatten, transfer, other)
    lib/helius/verifyWebhook.ts      # auth header check
    lib/solana/connection.ts
    lib/solana/verifyTx.ts           # getTransaction, confirm signer == wallet, extract memo
    lib/solana/buildMemoTx.ts        # unsigned policy memo tx for Phantom
    lib/guard/balance.ts             # $GUARD balance for owner
    lib/agents/repo.ts               # all Supabase reads/writes for agents/policies/events
    lib/agents/status.ts             # recompute status for wallet (uses core evaluate + pnl)
    lib/badge/render.ts              # SVG strings for GREEN / RED
    lib/realtime/useAgentStatus.ts   # Supabase Realtime hook (agents row + status_events)
    lib/realtime/useRegistry.ts
    lib/ratelimit.ts                 # Supabase-backed sliding window for verify endpoint
    tests/policy.evaluate.test.ts
    tests/memo.decode.test.ts
    tests/pnl.realized.test.ts
    tests/badge.render.test.ts
    tests/helius.classify.test.ts

  agent/
    package.json
    tsconfig.json
    src/index.ts                     # loop entry: init -> publishPolicyIfMissing -> loop(cycle)
    src/config.ts                    # env -> typed config
    src/wallet.ts                    # load keypair, balances (SOL, USDC), reserve logic
    src/price.ts                     # Jupiter Price API mid for SOL/USDC
    src/jupiter/trigger.ts           # create / cancel / list limit orders (Jupiter Trigger API)
    src/jupiter/swap.ts              # quote + swap (market sell for flatten)
    src/risk.ts                      # per-cycle metrics -> core evaluate
    src/quote.ts                     # place bid/ask limit orders within policy
    src/flatten.ts                   # 4-step flatten sequence
    src/heartbeat.ts                 # memo tx on interval
    src/publishPolicy.ts             # one-time policy memo tx
    src/state.ts                     # local JSON state (last heartbeat sig, status, policy sig)
    src/log.ts
    src/drill.ts                     # `--drill` forces flatten on mainnet with tiny inventory

  supabase/
    config.toml
    migrations/0001_init.sql
    migrations/0002_indexes.sql
    migrations/0003_rls.sql
    migrations/0004_realtime.sql
    seed.sql                         # agent #1 row (SpecGuard)

  scripts/
    register-helius-webhook.ts
    seed-agent-1.ts
    publish-policy.ts                # calls agent/src/publishPolicy
    flatten-drill.ts                 # calls agent/src/drill
    backfill-history.ts              # pull Helius history for a wallet into transactions

  deploy/
    specguard-agent.service          # systemd unit for agent/
    README.md
```

---

## 2. Environment variables

Web (Vercel). PUBLIC = `NEXT_PUBLIC_`, exposed to browser.

- `NEXT_PUBLIC_SITE_URL` — canonical origin `https://specguard.xyz`. Public.
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL. Supabase dashboard > Settings > API. Public.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (RLS-gated). Same place. Public.
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS; used only in route handlers/crons. Same place. Private.
- `HELIUS_API_KEY` — RPC + Enhanced API + webhook management. dev.helius.xyz. Private.
- `HELIUS_WEBHOOK_ID` — ID returned when webhook is created (script). Private.
- `HELIUS_WEBHOOK_AUTH_HEADER` — random secret set as webhook `authHeader`; handler rejects mismatches. Generate locally. Private.
- `NEXT_PUBLIC_SOLANA_RPC_URL` — RPC for wallet-adapter in browser (send memo tx). Helius key restricted by domain, or public RPC. Public. NOTE E1.
- `NEXT_PUBLIC_GUARD_MINT` — `BjbyvvuGbQwNZiYyk3aw1J9mAEUYkW1n5W5h6XAxxo5e`. Public.
- `GUARD_MIN_BALANCE_RAW` — minimum `$GUARD` (raw units, 6 decimals) to register. Private. NOTE G1.
- `NEXT_PUBLIC_SPECGUARD_AGENT_WALLET` — Layer 1 wallet pubkey (registry entry #1). Public.
- `CRON_SECRET` — Vercel cron auth (`Authorization: Bearer`). Generate. Private.
- `VERIFY_RATE_LIMIT_PER_HOUR` — default 6. Private.

Agent (droplet / VPS; never in Vercel).

- `AGENT_KEYPAIR_JSON` — base58 or JSON array secret key of the trading hot wallet. Generated locally, funded manually. Private. NOTE A1.
- `AGENT_RPC_URL` — Helius RPC with key. Private.
- `AGENT_POLICY_JSON` — the policy to publish onchain (matches PolicyV1 schema). Private (public once posted).
- `AGENT_POLICY_MEMO_SIG` — set after first publish; loop refuses to trade if empty. Private.
- `AGENT_QUOTE_SIZE_SOL`, `AGENT_SPREAD_BPS`, `AGENT_CYCLE_MS`, `AGENT_SOL_FEE_RESERVE` — quoting knobs. Private.
- `JUPITER_API_KEY` — optional; api.jup.ag portal for higher rate limits. Private. NOTE J1.
- `USDC_MINT` — `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. Private.
- `SPECGUARD_API_URL` — `https://specguard.xyz` (agent posts nothing; reserved for optional status ping). Private.

Treasury / buyback (only if section 7 ships).

- `TREASURY_KEYPAIR_JSON` — buyback wallet. Private. NOTE T1.
- `ANSEM_MINT` — unknown. Private. NOTE T2.
- `BUYBACK_MIN_USDC`, `BUYBACK_SPLIT_GUARD_PCT` — thresholds. Private. NOTE T3.

---

## 3. Database schema (Supabase Postgres)

Rule: chain is source of truth for policy, transactions, and breach proof. Supabase is an index/cache for speed and Realtime. Every row that mirrors chain carries the `signature` that proves it.

`agents` (one row per registered wallet)

- `wallet text PK`
- `name text` — from latest policy memo
- `is_specguard boolean` — true for entry #1
- `registered_at timestamptz` — blocktime of first policy memo
- `registration_sig text` — first policy memo signature
- `current_policy_id uuid FK policies`
- `status text CHECK (GREEN|RED)` — derived, cached
- `status_since timestamptz`
- `first_breach_event_id uuid FK status_events NULL` — RED is permanent; this is the proof pointer
- `last_tx_at timestamptz`, `last_tx_sig text`
- `last_heartbeat_at timestamptz`, `last_heartbeat_sig text`
- `guard_balance_at_registration numeric` — snapshot for audit only
- `created_at`, `updated_at`

`policies` (chain mirror; append-only)

- `id uuid PK`, `wallet text FK`
- `version int` — increments per memo
- `memo_sig text UNIQUE`, `blocktime timestamptz`
- `name text`, `max_drawdown_pct numeric`, `max_spend_per_tx_sol numeric`, `allowed_venues text[]`, `heartbeat_interval_sec int`
- `raw_json jsonb`, `policy_hash text`
- FLAG: readable from chain; stored for query speed. NOTE P1 (which version governs).

`transactions` (chain mirror, Helius-parsed)

- `signature text PK`, `wallet text FK`, `blocktime timestamptz`, `slot bigint`
- `kind text` — swap | limit_create | limit_cancel | limit_fill | memo_policy | memo_heartbeat | memo_flatten | transfer | other
- `program_ids text[]`
- `sol_delta_lamports bigint`, `token_deltas jsonb` — per mint
- `fee_lamports bigint`, `success boolean`
- `raw jsonb` — Helius enhanced payload
- FLAG: fully re-derivable from Helius; keep raw for PnL replay and Verify.

`status_events` (append-only)

- `id uuid PK`, `wallet text FK`, `from_status text`, `to_status text`
- `reason text` — max_drawdown | max_spend_per_tx | disallowed_venue | heartbeat_missed | flatten_observed | registered
- `proof_sig text` — breaching or flatten tx signature (NULL for heartbeat_missed; see NOTE S1)
- `detail jsonb` — metrics at evaluation
- `occurred_at timestamptz`

`pnl_snapshots`

- `id uuid PK`, `wallet text FK`, `computed_at timestamptz`
- `realized_usdc numeric`, `inventory_sol numeric`, `avg_cost_usdc numeric`
- `baseline_usdc numeric`, `peak_equity_usdc numeric`, `drawdown_pct numeric`
- `mark_usdc numeric`, `through_sig text` — last tx included
- FLAG: derived; recomputed by webhook + cron.

`webhook_events` (idempotency + audit)

- `id uuid PK`, `received_at`, `signature text UNIQUE`, `payload jsonb`, `processed boolean`, `error text`

`verify_requests` (rate limit)

- `id uuid PK`, `wallet text`, `ip_hash text`, `requested_at timestamptz`

`buyback_events` (only if section 7 ships)

- `id uuid PK`, `trigger text`, `usdc_spent numeric`, `guard_sig text`, `ansem_sig text`, `occurred_at`

RLS: anon SELECT on `agents`, `policies`, `status_events`, `transactions`, `pnl_snapshots`, `buyback_events`. No anon writes. All writes via service role. Realtime publication on `agents` and `status_events`.

---

## 4. API routes (all under `web/app/api`)

- `POST /api/webhooks/helius` — Helius enhanced webhook. Input: array of enhanced txs. Auth: `Authorization` header equals `HELIUS_WEBHOOK_AUTH_HEADER`. Output: `{ ok, processed, skipped }`. Idempotent by signature.
- `GET /api/status` — home summary for agent #1: status, realized PnL, active policy, last tx, last heartbeat. No auth. Cache 10s.
- `GET /api/agents?status=&sort=days_active&order=` — registry table rows. No auth.
- `GET /api/agents/[wallet]` — agent row + current policy + status events. No auth. 404 if unregistered.
- `GET /api/agents/[wallet]/history?before=<sig>&limit=50` — Helius-parsed history from `transactions`; falls back to Helius API for pages not yet cached. No auth.
- `POST /api/agents/[wallet]/verify` — re-fetch last N txs from Helius, recompute PnL and policy evaluation, write snapshot; if breach found and agent GREEN, insert RED event. Output: `{ status, reasons, checkedThroughSig, computedAt }`. Auth: none, rate limited (per wallet + IP).
- `POST /api/register/prepare` — Input: `{ wallet, policy }`. Validates schema, checks `$GUARD` balance server-side, returns `{ memoText, policyHash, minGuardRaw, guardBalanceRaw }` for the client to build/sign the memo tx. No auth (wallet ownership proven at confirm).
- `POST /api/register/confirm` — Input: `{ wallet, signature }`. Fetches tx via Helius RPC, checks signer == wallet, memo parses to PolicyV1, hash matches prepare, `$GUARD` balance re-checked; upserts `agents` + `policies`, inserts `registered` status_event, appends wallet to Helius webhook, returns `{ agent, embedHtml }`. No auth beyond tx proof.
- `GET /api/guard/balance?wallet=` — `{ balanceRaw, decimals, meetsMinimum }`. No auth.
- `GET /api/cron/heartbeat-sweep` — every minute: any GREEN agent with `now - last_heartbeat_at > heartbeat_interval_sec` becomes RED (`heartbeat_missed`). Auth: `CRON_SECRET`.
- `GET /api/cron/webhook-sync` — every 10 min: ensure Helius webhook address list == all `agents.wallet`. Auth: `CRON_SECRET`.
- `GET /api/cron/pnl-refresh` — every 5 min: refresh mark price and drawdown for all GREEN agents; breach on drawdown becomes RED. Auth: `CRON_SECRET`.
- `GET /badge/[wallet]` — SVG (section 9). Not under `/api`.

---

## 5. Helius integration

Webhook setup (script `register-helius-webhook.ts`, once):

- Type `enhanced`, `transactionTypes: ["ANY"]`, `accountAddresses: [agent #1 wallet]`, `webhookURL: https://specguard.xyz/api/webhooks/helius`, `authHeader: HELIUS_WEBHOOK_AUTH_HEADER`. Store returned ID as `HELIUS_WEBHOOK_ID`.
- On each registration confirm, `PUT /v0/webhooks/{id}` with the appended address list. `webhook-sync` cron reconciles drift.

Handler logic (`/api/webhooks/helius`):

1. Verify auth header; 401 otherwise.
2. For each tx: insert into `webhook_events` (skip if signature exists).
3. `classify()` the enhanced tx into an internal event by program IDs + memo content:
   - Memo program instruction with `SPECGUARD:v1:POLICY:{json}` → `memo_policy`
   - `SPECGUARD:v1:HB:{ts}` → `memo_heartbeat`
   - `SPECGUARD:v1:FLATTEN:{sigs[]}` → `memo_flatten`
   - Jupiter Trigger program → `limit_create` / `limit_cancel` / `limit_fill` (by instruction name)
   - Jupiter Aggregator v6 → `swap`
   - else `transfer` / `other`
4. Upsert `transactions`. Update `agents.last_tx_at`.
5. Per event: `memo_policy` → new `policies` row, bump `current_policy_id` (NOTE P1). `memo_heartbeat` → update `last_heartbeat_at`. `memo_flatten` → if GREEN, RED with `flatten_observed`, proof = that sig.
6. Recompute metrics for the wallet (section below), run `core.evaluate(policy, metrics)`. If breach and agent GREEN → insert `status_events` RED with `proof_sig` = triggering tx, set `agents.status = RED`, `first_breach_event_id`. RED is never reverted by code (NOTE S2).
7. Supabase Realtime emits row changes on `agents` and `status_events`; dashboard hooks subscribe.

Status calculation (pure, in `packages/core/policy/evaluate.ts`):

- `max_spend_per_tx_sol`: any single tx where outgoing SOL (or SOL-equivalent of USDC at that tx's price) exceeds limit → breach.
- `allowed_venues`: any tx touching a program ID not in the venue map (excluding System, Memo, Token, ATA, Compute Budget) → breach.
- `max_drawdown_pct`: `(peak_equity - current_equity) / peak_equity * 100 > limit` → breach. Equity = USDC + inventory_sol * mark. Baseline/peak start at registration blocktime. NOTE M1.
- `heartbeat_interval_sec`: enforced by cron sweep, not by webhook.

PnL calculation (`packages/core/pnl/realized.ts`):

- Input: ordered `swap` + `limit_fill` events with SOL and USDC deltas.
- Average-cost inventory: buys raise `inventory_sol` and `avg_cost`; sells realize `(sell_price - avg_cost) * qty` into `realized_usdc`. Fees in SOL converted at tx-time mark. Mark for unrealized/equity from Jupiter Price API at compute time.
- Output persisted to `pnl_snapshots`; home page shows `realized_usdc` only, per brief. NOTE M2.

Realtime push: client subscribes via `useAgentStatus(wallet)` to `agents` row updates and `status_events` inserts filtered by wallet; `useRegistry()` subscribes to all `agents` changes for the table.

---

## 6. Jupiter integration (agent runtime)

Wallet setup:

- Generate a fresh hot keypair for the agent (do not reuse the ClawPump-custodied wallet — its key is not exportable; NOTE A1). Fund with SOL (fees + inventory) and USDC. Keep `AGENT_SOL_FEE_RESERVE` (e.g. 0.05 SOL) untouchable by quoting or flatten.
- Publish policy: `publishPolicy.ts` builds a Memo tx `SPECGUARD:v1:POLICY:{canonical json}`, signs with agent key, sends, records `AGENT_POLICY_MEMO_SIG`. Loop refuses to run without it. This same tx is agent #1's registration (seed script writes the row after confirming onchain).

Limit orders (Jupiter Trigger API, formerly Limit Order v2; REST at `api.jup.ag/trigger/v1`):

- Each cycle: fetch mid from Jupiter Price API; compute bid `mid*(1-spread)` and ask `mid*(1+spread)`; size `AGENT_QUOTE_SIZE_SOL`; check `size*price <= max_spend_per_tx_sol` before building.
- `createOrder` returns an unsigned tx → sign → `execute` (or send via RPC). Store order pubkeys in local state.
- Refresh: `getTriggerOrders(open)` → `cancelOrders` for stale → recreate. Never hold more than one bid and one ask open.
- Pre-trade check: `core.evaluate` on current metrics; if any breach → skip quoting and run flatten.

Flatten sequence (`flatten.ts`), each step logged with signature; abort-safe (re-runnable):

1. `getTriggerOrders(open)` → `cancelOrders` (batched tx) → confirm → collect sigs.
2. Compute sellable SOL = balance − fee reserve. Jupiter Swap API `quote` SOL→USDC with slippage cap (e.g. 100 bps) → `swap` tx → sign → send → confirm → sig. Retry once with wider slippage if fails. NOTE J2.
3. Memo tx `SPECGUARD:v1:FLATTEN:{"reason":..., "sigs":[...]}` signed by agent wallet → sig. This is the public attestation and the tx the dashboard links.
4. Helius webhook ingests the flatten memo → registry sets RED with `proof_sig` = step-3 sig. Agent also writes RED to local state and stops quoting. No code path returns it to GREEN (NOTE S2).

Drill: `flatten-drill.ts` runs the full sequence on mainnet with minimum inventory; this is the pre-deadline gate.

---

## 7. $GUARD integration

Balance check at registration:

- Client: `GuardBalanceGate` calls `GET /api/guard/balance?wallet=` after Phantom connects; blocks the form if below minimum.
- Server: `getTokenAccountsByOwner(wallet, mint)` summed across Token and Token-2022 accounts via Helius RPC; re-checked in `/register/confirm` so the client check is not trusted.
- Minimum: `GUARD_MIN_BALANCE_RAW`. NOTE G1 (value undefined). NOTE G2 (hold-to-stay-registered or hold-at-registration-only).

`$GUARD` buyback trigger:

- Treasury wallet (`TREASURY_KEYPAIR_JSON`) executes Jupiter Swap USDC→`$GUARD`. Logged to `buyback_events` and surfaced on home page.
- Trigger candidates (choose one; NOTE T3): (a) after every flatten event of agent #1, (b) weekly on a clock, (c) when agent #1 realized PnL crosses a threshold and a fixed % is swept to treasury.
- Minimum threshold `BUYBACK_MIN_USDC` — NOTE T3.

`$ANSEM` buyback trigger:

- Same mechanism, second swap USDC→`$ANSEM`, split by `BUYBACK_SPLIT_GUARD_PCT`. Existing docs say 50/50 of a treasury slice.
- NOTE T2: `$ANSEM` mint address not provided anywhere in the repo or brief.
- NOTE T1: treasury funding source (who deposits USDC; is it agent profit or a manual top-up).

---

## 8. Page breakdown

`/` (home)

- Fetches (RSC): `/api/status` equivalent via server Supabase read of agent #1 (`is_specguard = true`): status, `pnl_snapshots` latest, `policies` current, `last_tx_at`.
- Renders: `LiveStatusHero` (GREEN/RED chip, last heartbeat age), `PnlCard` (realized USDC), `PolicyCard` (limits with link to policy memo tx on Solscan), `LastTxCard` (timestamp + sig link), `RegisterCta` (single CTA → `/register`).
- State: `useAgentStatus(agent1)` Realtime subscription updates chip and last tx without reload. No other client state.

`/registry`

- Fetches: `GET /api/agents` with `status`, `sort`, `order` from URL search params (server-rendered first paint).
- Renders: `AgentTableFilters` (status filter GREEN/RED/all), `AgentTable` (name, wallet short + copy, `StatusChip`, policy summary string "DD 10% · 0.5 SOL/tx · Jupiter · HB 300s", days active = `now - registered_at`).
- State: filter/sort in URL; `useRegistry()` Realtime updates rows in place.

`/agent/[wallet]`

- Fetches: `GET /api/agents/[wallet]` (policy + events), `GET /api/agents/[wallet]/history` first page, latest `pnl_snapshots`.
- Renders: header with `StatusChip` + first breach proof link if RED; `PolicyCard` (every field + memo sig + hash + version history); `TxHistoryList` (paginated, kind badge, Solscan link, SOL/USDC deltas); `StatusTimeline` (every `status_events` row, RED events emphasized with proof sig); `EmbedSnippet` (one-line `<img>` HTML with copy); `VerifyButton`.
- State: history pagination cursor; verify request pending/result; Realtime subscription for status.

`/register`

- Fetches: none until wallet connects; then `GET /api/guard/balance`.
- Renders: `RegisterStepper` — Step 1 `WalletButton` (Phantom via wallet-adapter), Step 2 `GuardBalanceGate`, Step 3 `PolicyForm` (name, max drawdown %, max spend per tx SOL, allowed venues multi-select from `venues.ts`, heartbeat interval seconds), Step 4 sign: calls `/register/prepare`, builds Memo tx client-side with returned `memoText`, `signAndSendTransaction` via Phantom, waits for confirmation, calls `/register/confirm`, Step 5 shows `EmbedSnippet` and link to `/agent/[wallet]`.
- State: wallet connection, balance result, form values + zod errors, tx signature, submit status, error toasts.
- NOTE R1: the registering wallet must be the agent's trading wallet (webhooks watch it). If the human signs from a personal Phantom wallet, the agent's real wallet is never watched.

`/badge/[wallet]` — see section 9; not a React page.

---

## 9. Badge system

- Route handler `web/app/badge/[wallet]/route.ts` (Node runtime). Reads `agents` row via anon server client. Returns `image/svg+xml`.
- GREEN state: pill, left segment "SpecGuard", right segment "Verified", green fill. RED state: right segment "BREACHED YYYY-MM-DD" (date of `first_breach_event`), red fill. Unknown wallet: grey "Not registered". Optional `?style=flat|plastic` and `?label=` params; default fixed.
- Real-time without embedder action: `Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=60`; browsers refetch on each page load, CDN revalidates every 30s. This is polling-by-load, not a live socket; an `<img>` cannot subscribe. NOTE B1.
- Embed line returned by `/register/confirm` and shown on `/agent/[wallet]`:
  `<a href="https://specguard.xyz/agent/WALLET"><img src="https://specguard.xyz/badge/WALLET" alt="SpecGuard status" height="20"></a>`
- CORS `*` on `/badge/*` via `middleware.ts`. SVG has no external fonts (system font stack) so it renders in GitHub READMEs and X cards.

---

## 10. Build order (calendar view)

**Use [§13 Incremental slices](#13-incremental-build-slices) as the source of truth.** The week/day calendar below is the same work, grouped for planning only. Do not batch days without passing each slice DoD.

NOTE D2: original hackathon deadline (19 Sept 2026) is past. Set a new target date when Slice 0 NOTES are resolved.

| Week | Focus | Slices |
|------|--------|--------|
| 1 | Core + chain plumbing | 0–5 |
| 2 | Flatten gate + read path | 6–9, 12 |
| 3 | Registry UX | 10–11, 13–16 |
| 4 | Hardening + launch | 17–20 |

Hard gate: **Slice 8** (v2 flatten on mainnet + RED in DB). v2 Registry paths on specguard.xyz at **Slice 19**; Phoenix operator and terminal **unchanged**.

---

## 13. Incremental build slices

Each slice: **Scope → DoD (verify before next slice) → Depends on**.

### Slice 0 — Decisions (no code)

- **Scope:** Resolve blocking NOTES: A1, A2, A3, D1, D2, P1, S2, R1. Write answers in `BUILD_LOG.md` or `docs/v2-decisions.md`.
- **DoD:** Written decisions for wallet model, agent host, Phoenix **coexistence** (no sunset), DNS timing, policy versioning, RED reset after drill, registration wallet flow.
- **Depends on:** nothing.

### Slice 1 — `packages/core` only

- **Scope:** New folder `packages/core` (or `v2/packages/core` inside repo) with policy schema, memo encode/decode, `evaluate()`, realized PnL pure functions. Unit tests only.
- **DoD:** `npm test` in core package passes; no web/agent yet.
- **Depends on:** Slice 0.

### Slice 2 — Supabase empty shell

- **Scope:** Supabase project, migrations 0001–0002 (agents + policies minimal), service role + anon keys in local `.env` (not committed).
- **DoD:** SQL applied; anon client SELECT on empty `agents` works; anon INSERT fails (RLS).
- **Depends on:** Slice 0.

### Slice 3 — Agent wallet + policy memo (mainnet)

- **Scope:** Generate hot wallet; fund small SOL; script `publish-policy` posts `SPECGUARD:v1:POLICY:...` memo. No trading loop.
- **DoD:** Solscan shows memo tx; memo decodes with core `decode`; pubkey recorded as `NEXT_PUBLIC_SPECGUARD_AGENT_WALLET`.
- **Depends on:** Slice 1. Use **solana-dev** skill for memo tx building and confirmation UX.

### Slice 4 — Helius webhook → one table

- **Scope:** Minimal Next app or single route `POST /api/webhooks/helius`; migrations for `transactions` + `webhook_events`; webhook for agent #1 wallet only.
- **DoD:** Send 0.001 SOL self-transfer from agent wallet; within 60s row in `transactions` with correct signature; duplicate webhook delivery is idempotent.
- **Depends on:** Slice 2–3.

### Slice 5 — Jupiter Trigger: one bid, cancel (mainnet)

- **Scope:** Minimal `agent/` script (not full loop): create one limit order, list open, cancel. Tiny size.
- **DoD:** Jupiter UI or API shows order then gone; sigs in Solscan; optional row in `transactions` via Slice 4 webhook.
- **Depends on:** Slice 3–4.

### Slice 6 — Agent quote cycle (dry-run then live)

- **Scope:** Quote cycle with pre-check via `evaluate()`; env for size/spread; no flatten yet.
- **DoD:** `--dry-run` logs ALLOW; one live cycle posts bid+ask within policy; `skip_breach` when metrics breach (simulate with bad params in dry-run test).
- **Depends on:** Slice 1, 5.

### Slice 7 — Flatten script (mainnet drill)

- **Scope:** `flatten.ts` cancel → swap → FLATTEN memo; `flatten-drill.ts` with minimal inventory.
- **DoD:** Three sigs on Solscan; FLATTEN memo parses; agent stops quoting locally.
- **Depends on:** Slice 5–6. **solana-dev** for swap tx patterns and error handling.

### Slice 8 — Flatten → RED in registry (HARD GATE)

- **Scope:** Webhook classifies `memo_flatten`; upsert `status_events`; set `agents.status = RED` for agent #1.
- **DoD:** Run Slice 7 drill; Supabase shows RED + `proof_sig`; Realtime subscription (manual test in Supabase dashboard or minimal page) fires once.
- **Depends on:** Slice 4, 7.

### Slice 9 — Heartbeat + sweep cron

- **Scope:** Heartbeat memo from agent; migration `status_events`; Vercel cron `heartbeat-sweep`.
- **DoD:** Heartbeat tx updates `last_heartbeat_at`; stop heartbeats → within 2× interval test wallet (or agent) goes RED with reason `heartbeat_missed`.
- **Depends on:** Slice 4, 8 (understand RED semantics per NOTE S2).

### Slice 10 — PnL snapshot from txs

- **Scope:** `pnl_snapshots` + cron or webhook hook; realized PnL from classified swaps/fills only.
- **DoD:** After known small swap, snapshot row matches hand-calculated realized within tolerance.
- **Depends on:** Slice 4, 1.

### Slice 11 — Full Supabase schema + RLS + Realtime

- **Scope:** Migrations 0003–0004; seed agent #1 row linked to Slice 3 registration sig.
- **DoD:** All tables from §3 exist; Realtime on `agents` + `status_events`; checklist in §3 RLS passes.
- **Depends on:** Slices 2, 8–10.

### Slice 12 — Home page (Vercel preview)

- **Scope:** Next `/` reads agent #1 status, PnL, policy, last tx; Realtime chip; **preview URL only** (not specguard.xyz DNS).
- **DoD:** Preview URL shows GREEN; run Slice 8 drill → chip RED + link to proof tx without manual refresh (Realtime) or within 30s (polling fallback documented).
- **Depends on:** Slice 11.

### Slice 13 — `$GUARD` balance API + gate UI

- **Scope:** `GET /api/guard/balance`; `GUARD_MIN_BALANCE_RAW` set (NOTE G1).
- **DoD:** Wallet with/without `$GUARD` returns correct `meetsMinimum`; no register flow yet.
- **Depends on:** Slice 12 (shared Next app).

### Slice 14 — Register prepare + confirm (second wallet)

- **Scope:** `/register` steps through Phantom memo sign; webhook address appended for new wallet.
- **DoD:** Test wallet #2 registered; appears in `agents`; policy memo on Solscan; Helius webhook list includes both wallets (script or API check).
- **Depends on:** Slice 13, 4, NOTE R1 resolved.

### Slice 15 — `/registry` + `/agent/[wallet]`

- **Scope:** Table, filters, agent detail, tx history first page, timeline.
- **DoD:** Two agents visible; filter RED; agent page loads history from DB.
- **Depends on:** Slice 14.

### Slice 16 — Badge SVG + embed

- **Scope:** `/badge/[wallet]` GREEN/RED; embed snippet on agent page.
- **DoD:** README or test HTML embed shows badge; RED badge shows breach date after Slice 8 on that wallet.
- **Depends on:** Slice 15.

### Slice 17 — Verify endpoint (optional but planned)

- **Scope:** `POST /api/agents/[wallet]/verify` + rate limit + button.
- **DoD:** Manual verify returns `{ status, reasons }`; does not corrupt idempotent RED state.
- **Depends on:** Slice 15.

### Slice 18 — Crons: webhook-sync + pnl-refresh

- **Scope:** Vercel crons; 24h smoke.
- **DoD:** Logs show successful runs; webhook address list matches `agents`.
- **Depends on:** Slice 14, 10.

### Slice 19 — Add v2 Registry to specguard.xyz (Phoenix unchanged)

- **Scope:** NOTE D1 — publish Registry routes (`/registry`, `/register`, `/agent/...`, `/badge/...`) on production domain; **do not** stop `specguard-operator` or remove Phoenix terminal / `status.json`.
- **DoD:** specguard.xyz serves v2 Registry pages; Phoenix terminal still works; operator still pushes `status.json`; nav links both products.
- **Depends on:** Slice 12, 18, hosting layout choice (D1 a/b/c).

### Slice 20 — Production drill + freeze

- **Scope:** Second full flatten drill on prod URLs; announcement sigs logged.
- **DoD:** Same as Slice 8 DoD on production domain; BUILD_LOG entry; buybacks only if T1–T3 resolved.
- **Depends on:** Slice 19.

---

## 11. Cut list

Must-have (product is not real without these)

- Policy memo onchain for agent #1; loop refuses to trade without it
- Jupiter limit orders placed and refreshed within policy
- Flatten sequence fired on mainnet with all three sigs and flatten memo
- Helius webhook ingest → Supabase → RED with linked proof tx
- Heartbeat memo + cron sweep
- Home page with live status, realized PnL, policy, last tx, one CTA
- `/register` with Phantom, `$GUARD` gate, signed memo, confirm
- `/registry` table with status filter and days-active sort
- `/agent/[wallet]` with policy, history, status timeline, embed code
- `/badge/[wallet]` SVG GREEN/RED

Nice-to-have (cut first under time pressure)

- Verify button (RED already happens automatically via webhook + crons)
- `$GUARD` / `$ANSEM` buybacks (blocked on NOTES T1–T3 anyway)
- Policy version history UI (show current only)
- History pagination beyond first 50
- Badge style params
- Backfill script (webhook-forward-only is acceptable at launch)
- OG image, dark/light toggle

---

## 12. NOTES for developer decision

- A1 Wallet custody: the existing agent wallet is ClawPump-custodied (no exportable key). Layer 1 needs a self-custodied hot key. Confirm a new wallet is acceptable and that the old Phoenix perps agent is retired or run in parallel.
- A2 Agent runtime host: the agent is a long-running loop and cannot live on Vercel. Existing DigitalOcean droplet is the obvious host; confirm.
- A3 Existing Phoenix operator: does the current DO operator stop? Both cannot be "SpecGuard status" on the same domain.
- D1 Hosting cutover: specguard.xyz currently points at GitHub Pages. Moving to Vercel requires Namecheap A/CNAME changes and retiring `docs/` deploy. Confirm timing.
- D2 Deadline: 19 Sept 2026 is past. Confirm the new target date; the plan assumes 4 weeks.
- P1 Policy governance: "Immutable" onchain, but a wallet can post a second policy memo. Decide: first memo governs forever, or latest memo governs with version history shown. Also decide whether posting a looser policy while GREEN is allowed.
- S1 Heartbeat breach proof: a missed heartbeat has no transaction. Decide what "proof" links to (the last heartbeat sig plus expected deadline, or the registry's own attestation).
- S2 RED permanence: brief says permanent RED. Agent #1 must trade again after drills. Decide whether a new policy memo starts a fresh registration (new `registered_at`, history preserved under old entry) or RED is truly terminal for the wallet.
- M1 Drawdown baseline: `max_drawdown_pct` needs a starting equity. Options: equity at registration blocktime, or rolling peak. Rolling peak is stricter and matches "drawdown"; confirm.
- M2 Realized PnL method: average-cost vs FIFO; and whether SOL fees count. Confirm average-cost.
- M3 Unrealized PnL: brief says realized only on home. Confirm unrealized is hidden everywhere or shown on the agent page.
- V1 Venue mapping: "allowed venues" must map to program IDs. Confirm the venue list (Jupiter Aggregator v6, Jupiter Trigger, others?) and whether unknown programs breach or are ignored.
- V2 Spend-per-tx in SOL when the outgoing asset is USDC: convert at tx-time price or only count SOL out. Confirm.
- G1 `$GUARD` minimum balance: value not provided.
- G2 `$GUARD` holding rule: checked once at registration, or must be maintained (would need a periodic sweep and a new RED reason).
- R1 Registering wallet = trading wallet: the brief's Phantom flow implies a human signs. If the agent's trading key is not in Phantom, the human cannot sign from it. Decide: require signing from the agent wallet (import into Phantom), or add a two-step "controller signs, agent wallet co-signs / posts confirmation memo".
- E1 Browser RPC: Phantom needs an RPC to send the memo tx. A public key in `NEXT_PUBLIC_SOLANA_RPC_URL` is visible; use Helius domain-restricted key or a public endpoint.
- J1 Jupiter API key: free tier may rate-limit a 24/7 loop. Decide whether to register at portal.jup.ag.
- J2 Flatten slippage and partial fills: define max slippage and behavior if the swap fails twice (leave inventory and still post FLATTEN memo with failure flag, or keep retrying).
- J3 Quote parameters: size, spread, cycle interval not specified for the Jupiter version (existing Phoenix values were 0.1 SOL, 50 bps, 5 min).
- B1 Badge realtime: an `<img>` cannot receive pushes; freshness is bounded by CDN revalidation (30s proposed). Confirm acceptable.
- T1 Treasury funding source for buybacks.
- T2 `$ANSEM` mint address not provided.
- T3 Buyback trigger condition and minimum USDC threshold not specified.
- H1 Helius webhook address limit and plan tier: enhanced webhooks on free tier have limits; confirm plan if registry grows.
- H2 Backfill: should agents registered today have their pre-registration history shown, or only post-registration txs (affects drawdown baseline too).
- X1 Testnet: brief says mainnet flatten before deadline; confirm there is no devnet phase (Jupiter Trigger is mainnet-only in practice).

---

## Build checklist (slice gates — check in order)

- [x] **Slice 0** — Decisions doc (NOTES A1, A2, A3, D1, D2, P1, S2, R1) → [docs/v2-decisions.md](docs/v2-decisions.md)
- [x] **Slice 1** — `packages/core` tests green
- [x] **Slice 2** — Supabase RLS smoke
- [x] **Slice 3** — Policy memo on mainnet (Solscan)
- [x] **Slice 4** — Helius webhook → `transactions`
- [x] **Slice 5** — Jupiter one order create + cancel
- [x] **Slice 6** — Quote cycle (dry-run + one live)
- [x] **Slice 7** — Flatten three sigs on mainnet
- [x] **Slice 8** — **GATE:** Flatten → RED in Supabase + proof_sig
- [x] **Slice 9** — Heartbeat + missed → RED
- [x] **Slice 10** — PnL snapshot matches hand calc
- [x] **Slice 11** — Full schema + Realtime
- [x] **Slice 12** — Home on Vercel preview + Realtime chip (deploy preview to sign off Realtime)
- [x] **Slice 13** — `$GUARD` balance gate
- [x] **Slice 14** — Register second wallet E2E
- [x] **Slice 15** — Registry + agent pages
- [x] **Slice 16** — Badge embed
- [x] **Slice 17** — Verify endpoint
- [x] **Slice 18** — Crons 24h green
- [x] **Slice 19** — v2 Registry on specguard.xyz (Phoenix stays)
- [x] **Slice 20** — Prod drill + freeze

### Website rebuild (W0–W6)

HydraDB-style marketing + shadcn on [`web/`](../web/); Phoenix nav/copy on [`site/`](../site/). See [docs/website-deploy.md](docs/website-deploy.md).

- [x] **W0–W6** — Copy, tokens, chrome, marketing home, app skin, Phoenix pass, QA doc

**Solana skill:** [solana-dev](https://github.com/solana-foundation/solana-dev-skill) at `.agents/skills/solana-dev` — refresh with `npx skills add solana-foundation/solana-dev-skill`.
