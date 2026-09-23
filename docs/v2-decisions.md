# SpecGuard v2 — Slice 0 decisions

**Date:** 2026-09-20  
**Status:** Approved for build (Slice 1+) unless items marked **USER CONFIRM** below are overridden.

This document closes blocking NOTES from [SPECGUARD_V2_BUILD_PLAN.md](../SPECGUARD_V2_BUILD_PLAN.md) §12 for **Slice 0**. No application code in this slice.

---

## Blocking decisions (Slice 0 DoD)

### A1 — Wallet custody (Layer 1 agent)

| Decision | Detail |
|----------|--------|
| **v2 agent wallet** | **New self-custodied hot keypair** generated for Jupiter v2. Stored only on the agent host (`AGENT_KEYPAIR_JSON`), never in git. |
| **ClawPump / Phoenix wallet** | `2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk` — **primary Phoenix SOL-PERP agent** (always on). Keys are **not** exportable from ClawPump. |
| **Relationship** | v2 **Registry + Jupiter demo agent** uses a **separate** self-custodied wallet. Phoenix trading is **not** replaced by v2. |
| **Funding** | Fund v2 wallet with SOL (fees + small inventory) + USDC for Jupiter limit/swap flows. Amounts set per slice (Slice 3: minimal). |

**Rationale:** v2 requires a signable key for memos, Jupiter, and flatten without ClawPump MCP.

---

### A2 — Agent runtime host

| Decision | Detail |
|----------|--------|
| **Host** | Existing **DigitalOcean droplet** (`159.89.230.140`), same machine as today. |
| **Install path** | **`/opt/specguard-v2/agent`** (or repo clone branch `v2` under `/opt/specguard-v2`) — separate from `/opt/specguard` Phoenix operator. |
| **Process** | **systemd** unit `specguard-v2-agent.service` (new), independent of `specguard-operator`. |
| **Vercel** | Agent loop **never** on Vercel; only Next.js app + crons. |

**Rationale:** Long-running quote loop + key material; DO already runs 24/7 operator.

---

### A3 — Phoenix operator vs v2 (permanent dual product)

| Decision | Detail |
|----------|--------|
| **Phoenix operator** | **`specguard-operator` runs indefinitely** on DO (`/opt/specguard`). **Never** shut down for v2. |
| **Product split** | **Phoenix** = live SOL-PERP bot + terminal + `status.json` (ClawPump). **v2 Registry** = onchain policy registry + optional Jupiter limit-order demo agent + badges. v2 is an **added feature**, not a migration. |
| **Two agents, two stories** | Phoenix: existing agent ID + wallet. Registry entry #1 (Jupiter demo): **separate** v2 wallet after Slice 3. Both can be linked from the same site nav. |
| **Public site (end state)** | **specguard.xyz** exposes **both**: Phoenix operator terminal (current experience) **and** routes `/registry`, `/register`, `/agent/...`, `/badge/...` for v2. |
| **Build phase** | v2 UI may ship on **Vercel preview** first (Slices 12–18), then **add paths** to production domain (**Slice 19**) without removing Phoenix pages or stopping the operator. |

**Rationale:** User intent — keep Phoenix all the time; ship Registry as another feature layer.

---

### D1 — DNS / hosting (add v2, keep Phoenix surface)

| Decision | Detail |
|----------|--------|
| **When** | **Slice 19** — publish v2 Registry routes on **specguard.xyz** after preview DoD (Slices 12–18). |
| **Action** | **Option B (Slice 19):** `registry.specguard.xyz` → Vercel for v2; apex `specguard.xyz` stays GitHub Pages for Phoenix + `status.json`. Dual nav links in both UIs. Option (c) proxy is optional later. |
| **Do not** | Do **not** disable GitHub Pages operator deploy, do **not** stop Phoenix `status.json` pushes, do **not** stop `specguard-operator` unless explicitly requested later. |
| **Before go-live** | Run v2 flatten drill on preview; then enable public Registry paths on chosen URL layout. |

---

### D2 — Target timeline

| Decision | Detail |
|----------|--------|
| **Calendar deadline** | Original **19 Sept 2026** hackathon date is **past**. No fixed calendar deadline for v2. |
| **Milestone gates** | **Slice 8** (v2 flatten → RED in DB). **Slice 16** = registry MVP. **Slice 19** = v2 Registry **live on specguard.xyz paths** (Phoenix unchanged). |
| **Pace** | **One slice at a time**; estimate **~4–6 weeks** from Slice 1 if one slice every 1–3 days. |

---

### P1 — Policy governance (onchain memos)

| Decision | Detail |
|----------|--------|
| **Source of truth** | **Latest policy memo** on the **trading wallet** governs evaluation for new activity. |
| **History** | All prior policy memos remain in `policies` table (append-only); UI shows **current** + optional version list on agent page. |
| **Tightening vs loosening** | **Allowed:** operator posts a **new** memo (stricter or looser). **Not allowed:** off-chain-only limit changes. |
| **Loosen while GREEN** | **Allowed** via new memo (public SHA256 / memo sig changes). Registry displays version + block time. |
| **Agent override** | **`agent_can_override: false`** — same philosophy as v1 spec; only wallet-signed memos change policy. |

**Rationale:** Onchain memos are immutable per tx; “latest wins” matches how wallets actually behave.

---

### S2 — RED permanence vs drills (agent #1)

| Decision | Detail |
|----------|--------|
| **Registry rule** | **Breach history is permanent** — `status_events` rows are never deleted. |
| **Badge / current status** | Badge and home page show **current** status (GREEN or RED). |
| **After intentional flatten drill** | **Operator RESET** (not automatic): post **`SPECGUARD:v1:RESET`** memo referencing prior breach/flatten sig → webhook sets **`agents.status = GREEN`**, appends timeline event `operator_reset`. **`first_breach_event_id`** unchanged (historical proof preserved). |
| **Third-party agents** | **No RESET** in v1 product — RED stays RED (per product brief). Only **`is_specguard = true`** wallet may use RESET flow (manual/scripted). |

**Rationale:** Lets SpecGuard prove flatten repeatedly without faking “never breached”; external registry stays strict.

---

### R1 — Registration wallet = trading wallet

| Decision | Detail |
|----------|--------|
| **Rule** | The wallet that **signs the policy memo** is the **watched trading wallet** (Helius webhook + enforcement). |
| **Register UX** | `/register` copy: *“Connect the wallet your bot will trade from — not your personal wallet unless they are the same.”* |
| **Recommended setup** | Generate agent keypair → import into Phantom **or** sign policy via CLI script → paste sig into confirm (advanced path in Slice 14). |
| **Not supported in v1** | “Controller wallet registers, different bot wallet trades” — **deferred** (would need delegated authority program or co-signed flow). |

---

## Secondary decisions (non-blocking for Slice 1, documented now)

### M1 — Drawdown baseline

- **Rolling peak equity** from **registration blocktime** (inclusive of SOL + USDC + mark-to-market inventory).
- Drawdown % = `(peak_equity - current_equity) / peak_equity * 100`.

### M2 — Realized PnL

- **Average-cost** inventory; **SOL fees** included in PnL at tx-time SOL/USDC mark.

### M3 — Unrealized on UI

- **Home:** realized only.
- **Agent page:** show unrealized + equity optional (nice-to-have in Slice 15).

### V1 — Allowed venues (initial map)

| Slug | Programs (mainnet) |
|------|---------------------|
| `jupiter-trigger` | Jupiter Trigger / limit program IDs (confirm at Slice 5 from tx samples) |
| `jupiter-swap` | Jupiter Aggregator v6 |
| `spl-token` | Token + Token-2022 + ATA (transfers only) |
| `system` | System, Memo, Compute Budget |

Any other program in a watched wallet tx → **`disallowed_venue`** breach.

### V2 — max spend per tx

- Count **max(SOL out, USDC out converted to SOL at tx-time mark)** against `max_spend_per_tx_sol`.

### G1 — `$GUARD` minimum at registration

- **Decided:** holder must hold **≥ 2,000,000 $GUARD** (whole tokens) at `/register/confirm`.
- **Env:** `GUARD_MIN_BALANCE_RAW` — set from on-chain mint **decimals** at deploy time:
  - If mint uses **6 decimals** (typical pump.fun): **`2_000_000_000_000`** raw (`2e6 * 10^6`).
  - Verify decimals once via RPC (`getMint`) before Slice 13; do not hardcode in client.
- **Display:** registration UI shows **“2,000,000 GUARD required”** plus wallet’s current balance.

### G2 — Holding rule

- **Check once** at `/register/confirm` only for v1. No periodic `$GUARD` sweep until post-MVP.

### E1 — Browser RPC

- **`NEXT_PUBLIC_SOLANA_RPC_URL`**: Helius RPC with **domain allowlist** for specguard.xyz + Vercel preview domains.

### J1 — Jupiter API key

- **Obtain** at [portal.jup.ag](https://portal.jup.ag) before Slice 5 if rate limits hit; optional for Slice 5 smoke test.

### J2 — Flatten swap failure

- Max slippage **100 bps**, one retry at **200 bps**; if still failing, post **FLATTEN memo** with `"swap_failed": true` and remaining inventory noted — still RED.

### J3 — v2 quote defaults (starting point)

- **0.05 SOL** size, **50 bps** spread, **300s** cycle — tune after Slice 6 live metrics (independent of current Phoenix 0.1 SOL setting).

### B1 — Badge freshness

- **Accept** CDN `s-maxage=30` + embedder page reload; no WebSocket on `<img>`.

### T1–T3 — Buybacks

- **Deferred** to post–Slice 16. **USER CONFIRM** `$ANSEM` mint when enabling Slice 7 buyback work.

### H1 — Helius plan

- Monitor webhook address count; upgrade Helius tier if registry > ~20 wallets.

### H2 — History backfill

- **Post-registration txs only** for policy/drawdown; no pre-registration backfill for new agents.

### X1 — Networks

- **Mainnet only** for Jupiter Trigger + product proof. Unit tests may use Surfpool/local per solana-dev skill; not required for Slice 1–8.

---

## Canonical constants (v2)

| Item | Value |
|------|--------|
| `$GUARD` mint | `BjbyvvuGbQwNZiYyk3aw1J9mAEUYkW1n5W5h6XAxxo5e` |
| USDC mint | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Phoenix ClawPump agent | `89ca5e76-d59f-4276-8399-eecdf8bb3a04` |
| Phoenix wallet (always on) | `2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk` |
| v2 Registry demo agent wallet | `BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK` (keypair `agent/.keys/v2-agent.json`, gitignored) |

---

## Slice 0 — Definition of Done

| Check | Status |
|-------|--------|
| Wallet model (A1) | Done |
| Agent host (A2) | Done |
| Phoenix parallel run (A3) | Done |
| DNS timing (D1) | Done |
| Timeline (D2) | Done |
| Policy versioning (P1) | Done |
| RED / RESET (S2) | Done |
| Registration wallet (R1) | Done |

**Next:** [Slice 1](../SPECGUARD_V2_BUILD_PLAN.md#slice-1--packagescore-only) — `packages/core` + unit tests only.

---

## USER CONFIRM (optional overrides)

Reply if you want different defaults:

1. **`GUARD` minimum** — **2,000,000 tokens** (confirmed 2026-09-20).
2. **Phoenix operator** — **always on**; v2 is additive (confirmed 2026-09-20).
3. **RESET for agent #1 only** — OK with `SPECGUARD:v1:RESET` memo after drills?

If no reply on 3, builders proceed with tables above.
