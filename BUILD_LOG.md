# Specguard v2 — BUILD_LOG

Brick-by-brick gate evidence. Source plan: [`buildingplan.md`](./buildingplan.md).

---

## Phase 0 — Toolchain & read-only ClawPump access

**Date:** 2026-08-24  
**Gate result:** **PASS**

### Setup notes

| Item | Result |
|---|---|
| ClawPump account | Created (Google/X linked); `@itswilly31` |
| API key | `cpk_…` created at [agents.clawpump.tech/dashboard/api](https://agents.clawpump.tech/dashboard/api) |
| MCP package | `@clawpump/agents@0.1.22` via `npx -y` (v0.1.25 npm tarball missing `dist/` — pinned) |
| Cursor MCP config | `clawpump-agents` added to `~/.cursor/mcp.json` alongside existing servers |
| Remote HTTP MCP | Existing `clawpump` entry updated with Bearer auth to `https://mcp.clawpump.tech/mcp` |

**Action for you:** Reload MCP in **Cursor Settings → MCP** (toggle `clawpump-agents` off/on or restart Cursor). First `npx` run may take ~30–60s.

---

### T0.1 — `get_account_status`

**Result:** PASS (HTTP `/auth/me`, authenticated)

```json
{
  "authenticated": true,
  "user_id": "69b2b695-5f77-43c6-8061-5375a9d49376",
  "display_name": "Willyd…",
  "email": "chouman.hs@hotmail.com",
  "x_username": "itswilly31",
  "credit_balance": 0,
  "deposit_wallet": "EhGnSRc6M65tYUdgT5g4qrKHcwLveGt5TZUTxJyGVcBc",
  "created_at": "2026-08-24T20:02:25.810971+00:00"
}
```

No 401/403.

---

### T0.2 — `list_available_skills` + `risk-manager`

**Platform skills (MCP `list_available_skills`):** PASS for required built-ins

Includes at minimum:

- `defi-trading` — DeFi Trading  
- `perps-trading` — Perps Trading  

(Full list: 15 platform slugs in `@clawpump/agents@0.1.22`.)

**Community `risk-manager`:** PASS (confirmed outside MCP enum)

The MCP tool returns platform skills only. Community skill `risk-manager` is listed in:

- ClawPump docs — Community Skills / Risk Manager  
- [Clawpump/agents-skills](https://github.com/Clawpump/agents-skills) registry (`slug: risk-manager`)

**“Never block” rule (Specguard inverse):**

> **Never block a trade — only recommend. The user has final say**

Source: `skills/risk-manager/SKILL.md` in agents-skills repo (line 52).

---

### T0.3 — `perps_markets`

**Result:** PASS — 69 active Phoenix markets

**Chosen perp market symbol for Specguard:** `SOL` / `SOL-PERP`

(Rationale: primary Solana perp, high leverage tier, matches hackathon onchain focus. `ANSEM-PERP` also live if we pivot to hackathon token narrative.)

Summary artifact: [`logs/phase0-perps-markets-summary.json`](./logs/phase0-perps-markets-summary.json)

Sample:

```json
{
  "status": "ok",
  "venue": "phoenix",
  "count": 69,
  "markets_sample": ["SOL-PERP", "ANSEM-PERP", "BTC-PERP", "ETH-PERP"]
}
```

---

### Phase 0 gate checklist

- [x] MCP configured without auth errors (API key validates; stdio server starts with `Auth: api_key`)
- [x] Exact perp market symbol written down — **`SOL` / `SOL-PERP`**
- [x] `risk-manager` located; “never block — only recommend” confirmed
- [x] `BUILD_LOG.md` created with evidence

---

### Known issues / workarounds

1. **`@clawpump/agents@0.1.25` broken on npm** — missing `dist/index.js`. Pinned **`@0.1.22`** in `mcp.json`.
2. **`list_available_skills` does not enumerate community skills** — use dashboard Community Skills or [agents-skills](https://github.com/Clawpump/agents-skills) registry for `risk-manager`.
3. **Secrets:** API key lives in `~/.cursor/mcp.json` only — not committed (see `.gitignore`).

---

**Next:** Phase 1 — register at [clawpump.tech/ansemhack](https://clawpump.tech/ansemhack), set X handle, create `spec/`, `skills/`, `logs/` structure.

---

## Phase 2 — Reference agent on ClawPump

**Date:** 2026-08-24  
**Gate result:** **PASS**

### Setup notes

| Item | Result |
|---|---|
| Agent name | **SpecGuard** |
| Agent ID | `89ca5e76-d59f-4276-8399-eecdf8bb3a04` |
| Wallet | `2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk` |
| Token mint | `BjbyvvuGbQwNZiYyk3aw1J9mAEUYkW1n5W5h6XAxxo5e` (`SPECGU`) |
| SOL funded | **0.11 SOL** at gate (user sent 0.1 SOL) |
| Core skills | `perps-trading`, `portfolio`, `wallet-ops` enabled via MCP |
| `allowPerpsActions` | `true` |
| MCP default agent | `CLAWPUMP_DEFAULT_AGENT` set in `~/.cursor/mcp.json` |

**Skill hygiene:** Requested minimal operator set (`perps-trading`, `portfolio`, `wallet-ops`); Twitter and trading extras removed. Platform still attaches ambient skills (`action-plans`, `private-transfers`, `bitget-intel`, `self-learning`, `skill-management`) — non-disableable via MCP.

**Repo scaffold:** `spec/`, `skills/specguard-enforcer/`, `logs/enforcement/`, `logs/flatten/` created. Snapshot: [`logs/phase2-agent-snapshot.json`](./logs/phase2-agent-snapshot.json).

---

### T2.1 — `get_agent`

**Result:** PASS — IDs match plan

```json
{
  "id": "89ca5e76-d59f-4276-8399-eecdf8bb3a04",
  "name": "SpecGuard",
  "wallet_address": "2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk",
  "token_mint": "BjbyvvuGbQwNZiYyk3aw1J9mAEUYkW1n5W5h6XAxxo5e",
  "enabled_skills": ["perps-trading", "portfolio", "wallet-ops", "action-plans", "private-transfers", "bitget-intel", "self-learning", "skill-management"],
  "allowPerpsActions": true
}
```

---

### T2.2 — `get_wallet_summaries`

**Result:** PASS — SOL ≥ 0.05

```json
{
  "agent_id": "89ca5e76-d59f-4276-8399-eecdf8bb3a04",
  "wallet_address": "2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk",
  "sol_balance": 0.11,
  "usdc_balance": 0
}
```

---

### T2.3 — `list_integrations`

**Result:** PASS — baseline snapshot (empty integrations OK)

```json
[]
```

---

### T2.4 — Dashboard terminal

**Result:** PASS — terminal URL responds (HTTP 308 redirect to authenticated dashboard)

**Terminal:** [agents.clawpump.tech/dashboard/terminal?agent=89ca5e76-d59f-4276-8399-eecdf8bb3a04](https://agents.clawpump.tech/dashboard/terminal?agent=89ca5e76-d59f-4276-8399-eecdf8bb3a04)

**Bookmarked URLs (`get_dashboard_urls`):**

| Page | URL |
|---|---|
| Chat | [dashboard/chat](https://agents.clawpump.tech/dashboard/chat?agent=89ca5e76-d59f-4276-8399-eecdf8bb3a04) |
| Terminal | [dashboard/terminal](https://agents.clawpump.tech/dashboard/terminal?agent=89ca5e76-d59f-4276-8399-eecdf8bb3a04) |
| Settings | [dashboard/settings](https://agents.clawpump.tech/dashboard/settings?agent=89ca5e76-d59f-4276-8399-eecdf8bb3a04) |
| Wallet | [dashboard/wallet](https://agents.clawpump.tech/dashboard/wallet?agent=89ca5e76-d59f-4276-8399-eecdf8bb3a04) |
| Launch token | [dashboard/launch-token](https://agents.clawpump.tech/dashboard/launch-token?agent=89ca5e76-d59f-4276-8399-eecdf8bb3a04) |

---

### Canonical artifact table

| Field | Value |
|---|---|
| Agent ID | `89ca5e76-d59f-4276-8399-eecdf8bb3a04` |
| Wallet | `2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk` |
| Token mint | `BjbyvvuGbQwNZiYyk3aw1J9mAEUYkW1n5W5h6XAxxo5e` |
| Ticker | `SPECGU` |
| Market (Phase 0) | `SOL` / `SOL-PERP` |
| SOL balance at gate | **0.11 SOL** |

---

### Phase 2 gate checklist

- [x] Agent ID and wallet address saved in BUILD_LOG
- [x] `perps-trading` skill enabled (portfolio + wallet-ops also on)
- [x] Dashboard URLs bookmarked
- [x] T2.2 confirms SOL > 0 on agent wallet
- [x] T2.4 terminal loads

---

### Hackathon hygiene (non-blocking)

- Align token Twitter to `@specguardxyz` (currently tied to `@itswilly31` account)
- Attach mint at [clawpump.tech/ansemhack/entry](https://clawpump.tech/ansemhack/entry)
- Post entry from project X `@specguardxyz`

---

**Next:** Phase 3 — publish [`spec/reference-spec.json`](./spec/reference-spec.json) at a public URL (`SOL-PERP`, `max_drawdown_usd: 40`, `agent_can_override: false`).

---

## Phase 3 — Public spec (immutable to agent)

**Date:** 2026-08-25  
**Gate result:** **PASS**

### Setup notes

| Item | Result |
|---|---|
| Spec file | [`spec/reference-spec.json`](./spec/reference-spec.json) |
| GitHub repo | [williamsburgsh-commits/SpecGuard](https://github.com/williamsburgsh-commits/SpecGuard) |
| Public raw URL | [raw spec JSON](https://raw.githubusercontent.com/williamsburgsh-commits/SpecGuard/main/spec/reference-spec.json) |
| SHA256 | `256ABA792FF0C3A275D67AC5FC15661628B791888DA45BA3D7BCB0FCF2D35F5C` |
| Market | **`SOL-PERP`** (Phase 0 choice; not legacy `SOL-USD`) |
| `agent_can_override` | **`false`** |
| Snapshot artifact | [`logs/phase3-spec-snapshot.json`](./logs/phase3-spec-snapshot.json) |

**Doc hygiene:** Updated example JSON in [`SPECGUARD.md`](./SPECGUARD.md) from `SOL-USD` → `SOL-PERP`.

---

### T3.1 — Fetch spec URL (unauthenticated)

**Result:** PASS — HTTP 200, valid JSON

```json
{
  "version": 1,
  "market": "SOL-PERP",
  "max_notional_usd": 200,
  "max_inventory_usd": 100,
  "max_drawdown_usd": 40,
  "max_leverage": 2,
  "agent_can_override": false
}
```

---

### T3.2 — `agent_can_override`

**Result:** PASS — `"agent_can_override": false`

---

### T3.3 — `allowed_tools`

**Result:** PASS — exactly 5 tools (perps + swap only)

```json
[
  "perps_order_preview",
  "perps_order_execute",
  "perps_order_cancel",
  "perps_account",
  "swap_execute"
]
```

No sniper, predictions, or marketplace tools.

---

### T3.4 — SHA256 hash

**Result:** PASS

```
256ABA792FF0C3A275D67AC5FC15661628B791888DA45BA3D7BCB0FCF2D35F5C
```

---

### Canonical artifact table

| Field | Value |
|---|---|
| Spec URL | `https://raw.githubusercontent.com/williamsburgsh-commits/SpecGuard/main/spec/reference-spec.json` |
| SHA256 | `256ABA792FF0C3A275D67AC5FC15661628B791888DA45BA3D7BCB0FCF2D35F5C` |
| Market | `SOL-PERP` |
| `max_drawdown_usd` | `40` |
| `agent_can_override` | `false` |
| Version | `1` |

---

### Phase 3 gate checklist

- [x] Public URL works for anyone
- [x] Spec hash recorded
- [x] Market symbol matches Phase 0 choice (`SOL-PERP`)

---

### Hackathon hygiene (non-blocking)

- Add spec URL to [clawpump.tech/ansemhack](https://clawpump.tech/ansemhack) entry
- Pin spec URL on project X `@specguardxyz`

---

**Next:** Phase 4 — `perps_account_prepare`, USDC collateral deposit, `perps_account` baseline.

---

## Phase 4 — Phoenix perps account ready

**Date:** 2026-08-25  
**Gate result:** **PASS**

### Setup notes

| Item | Result |
|---|---|
| Agent ID | `89ca5e76-d59f-4276-8399-eecdf8bb3a04` |
| Agent wallet | `2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk` |
| Market | **`SOL-PERP`** |
| Phoenix parent subaccount | **0** (collateral + trading) |
| Collateral deposited | **5.4 USDC** |
| Baseline equity | **$5.40** (`portfolioValue` on subaccount 0) |
| Snapshot artifact | [`logs/phase4-perps-baseline.json`](./logs/phase4-perps-baseline.json) |

**Funding path:** No external USDC on agent or deposit wallet. Operator swapped **0.055 SOL → ~5.47 USDC** (Jupiter), then deposited **5.4 USDC** to Phoenix parent collateral. Target was ~$30; actual limited by agent SOL balance (~0.11 SOL at gate start). Scale up in a later phase if needed.

**Known state:** Isolated subaccount **1** is **frozen** (zero collateral). Parent subaccount **0** is **cold** but has collateral and `riskIncreasingTrade: immediate`. Phase 5 orders should use parent/isolated flow per Phoenix tool params.

---

### Prepare — `perps_account_prepare`

**Result:** PASS — registered isolated trader 1; cross subaccount 0 already existed

```json
{
  "status": "executed",
  "steps": ["activate_phoenix_access_code", "register_isolated_trader_1"],
  "signature": "4Z87b6bkMTJScD1NVHQkDL3g5x8Fh3717a5cCa3FG2xUzT3U7d6bEtpx9QcZcCZz2WzZojuPiS7TiGHP5kcxkxx8"
}
```

[Solscan prepare tx](https://solscan.io/tx/4Z87b6bkMTJScD1NVHQkDL3g5x8Fh3717a5cCa3FG2xUzT3U7d6bEtpx9QcZcCZz2WzZojuPiS7TiGHP5kcxkxx8)

---

### Fund — SOL → USDC swap (operator)

**Result:** PASS — ~5.47 USDC received on agent wallet

```json
{
  "status": "executed",
  "input": "0.055 SOL",
  "output": "5.473416 USDC",
  "txHash": "63McZH9Bk8aQ9sutx1p1jB4bXWhK3kLyxYJtpoVKqupUtbUCrkof2ZCNb7BfSHKPZytVMpzLnF9rk486Lz5Hyyvm"
}
```

---

### Deposit — `perps_collateral_deposit`

**Result:** PASS — 5.4 USDC to parent trader collateral

```json
{
  "status": "executed",
  "amountUsdc": "5.400000",
  "signature": "3E6wYit6wG37TwDbBR1gnShn1aNEDeuRPspbJfqsqfRuqSDYd7Pgg8TBar3t3PN2Af8uDFyg9oMd5dg1AR63uTsh"
}
```

[Solscan deposit tx](https://solscan.io/tx/3E6wYit6wG37TwDbBR1gnShn1aNEDeuRPspbJfqsqfRuqSDYd7Pgg8TBar3t3PN2Af8uDFyg9oMd5dg1AR63uTsh)

---

### T4.1 — `perps_account`

**Result:** PASS — collateral > 0, risk tier shown

Parent subaccount 0:

```json
{
  "subaccountIndex": 0,
  "riskTier": "safe",
  "collateralBalance": "5.400000",
  "portfolioValue": "5.400000",
  "positions": [],
  "limitOrders": {}
}
```

---

### T4.2 — `perps_market_data` (`SOL-PERP`)

**Result:** PASS — mark price returned

```json
{
  "perpSymbol": "SOL-PERP",
  "markPrice": 99.9
}
```

---

### T4.3 — Wallet on-chain verification

**Result:** PASS — verified via Solana RPC (automated Solscan page returned 403)

| Token | Balance at gate |
|---|---|
| SOL | **0.00976028** |
| USDC (wallet) | **0.064345** |
| USDC (Phoenix collateral) | **5.400000** |

[Agent wallet on Solscan](https://solscan.io/account/2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk)

---

### T4.4 — No open orders

**Result:** PASS — `positions: []`, `limitOrders: {}` on both subaccounts

---

### Canonical artifact table

| Field | Value |
|---|---|
| Baseline equity | **$5.40** |
| Collateral deposited | **5.4 USDC** |
| Prepare tx | `4Z87b6bkMTJScD1NVHQkDL3g5x8Fh3717a5cCa3FG2xUzT3U7d6bEtpx9QcZcCZz2WzZojuPiS7TiGHP5kcxkxx8` |
| Swap tx | `63McZH9Bk8aQ9sutx1p1jB4bXWhK3kLyxYJtpoVKqupUtbUCrkof2ZCNb7BfSHKPZytVMpzLnF9rk486Lz5Hyyvm` |
| Deposit tx | `3E6wYit6wG37TwDbBR1gnShn1aNEDeuRPspbJfqsqfRuqSDYd7Pgg8TBar3t3PN2Af8uDFyg9oMd5dg1AR63uTsh` |
| Market | `SOL-PERP` |
| Open orders | none |
| Total exposure | ~$5.5 (well under spec $200 cap) |

---

### Phase 4 gate checklist

- [x] Collateral deposited and visible in `perps_account`
- [x] Baseline equity recorded (for drawdown math later)
- [x] Total wallet exposure ≤ planned ~$200

---

**Next:** Phase 5 — single order lifecycle (`perps_order_preview` → execute → cancel).

---

## Phase 5 — Single order lifecycle (preview → execute → cancel)

**Date:** 2026-08-25  
**Gate result:** **PASS**

### Setup notes

| Item | Result |
|---|---|
| Preflight SOL | **0.10976028** (0.1 SOL deposit confirmed) |
| Phoenix collateral (parent sub 0) | **$3.90 USDC** after order margin transfer |
| Isolated subaccount | **1** — activated by order (`transferAmountUsdc: 1.5`) |
| Market | **`SOL-PERP`** |
| Snapshot artifact | [`logs/phase5-order-lifecycle.json`](./logs/phase5-order-lifecycle.json) |

**Order placed:** limit **bid** **0.01 SOL @ $50** (post-only, ~$1 notional), far below mark (~$100). Isolated margin **1.5 USDC** transferred from parent.

**Operator note:** `confirmRisk: true` required on execute/cancel writes; idempotency keys prevent duplicate submits.

---

### T5.1 — `perps_order_preview`

**Result:** PASS

```json
{
  "status": "preview",
  "symbol": "SOL-PERP",
  "side": "bid",
  "orderType": "limit",
  "quantity": 0.01,
  "price": 50,
  "estimatedNotionalUsd": 0.999
}
```

---

### T5.2 — `perps_order_execute`

**Result:** PASS

```json
{
  "status": "executed",
  "transferAmountUsdc": "1.500000",
  "idempotencyKey": "phase5-exec-20260825-a",
  "signature": "h6ExGkwWXZN9niY92jkvB7qVCBUEbenEd8gjQRU6NkaTYtFRLaEs24t9TgKavFumQ4Jo1kFwMDMWVmw9859q1DA"
}
```

[Solscan execute tx](https://solscan.io/tx/h6ExGkwWXZN9niY92jkvB7qVCBUEbenEd8gjQRU6NkaTYtFRLaEs24t9TgKavFumQ4Jo1kFwMDMWVmw9859q1DA)

---

### T5.3 — `perps_account` (order visible → empty)

**Result:** PASS — open limit order on subaccount 1 (`orderSequenceNumber: 18446744073639738419`, price tick `500000`), then cleared after cancel

---

### T5.4 — `perps_order_cancel`

**Result:** PASS

```json
{
  "status": "executed",
  "subaccountIndex": 1,
  "idempotencyKey": "phase5-cancel-20260825-a",
  "signature": "63xKWXkjVyoV6uhKKQ6UtTiZif9tXqTvtYmDCy4oz2jK9qNMrUgRS2u9R1LEMKLbG7UBGaBwutqQZ8Bf84mcvrDq"
}
```

[Solscan cancel tx](https://solscan.io/tx/63xKWXkjVyoV6uhKKQ6UtTiZif9tXqTvtYmDCy4oz2jK9qNMrUgRS2u9R1LEMKLbG7UBGaBwutqQZ8Bf84mcvrDq)

Follow-up `cancelAll` cleanup tx (Phoenix state lag): [5U9WCM…Yy3Gh](https://solscan.io/tx/5U9WCMUTpoUb527FMQqW6wTqmtpgJtQbGpGUStVq1V5iPa47nsxyTMqXcSTsHmwHvgU3fC9mczswr4KCJMZYy3Gh)

---

### T5.5 — Idempotency replay

**Result:** PASS — re-execute with same key returned `"duplicate": true` and same signature (no second order)

---

### Canonical artifact table

| Field | Value |
|---|---|
| Execute sig | `h6ExGkwWXZN9niY92jkvB7qVCBUEbenEd8gjQRU6NkaTYtFRLaEs24t9TgKavFumQ4Jo1kFwMDMWVmw9859q1DA` |
| Cancel sig | `63xKWXkjVyoV6uhKKQ6UtTiZif9tXqTvtYmDCy4oz2jK9qNMrUgRS2u9R1LEMKLbG7UBGaBwutqQZ8Bf84mcvrDq` |
| Market | `SOL-PERP` |
| Order size | 0.01 SOL limit @ $50 |
| Idempotency | `duplicate: true` on replay |

---

### Phase 5 gate checklist

- [x] One successful execute + cancel on mainnet
- [x] Signatures saved in BUILD_LOG
- [x] Operator confirms `confirmRisk` flow understood

---

**Next:** Phase 6 — status page GREEN/RED + heartbeat.

---

## Phase 6 — Status page: GREEN / STALE + heartbeat

**Date:** 2026-08-25  
**Gate result:** **PASS**

### Public URLs

| URL | Role |
|---|---|
| [https://specguard.xyz](https://specguard.xyz) | Custom domain (CNAME in `site/CNAME`; DNS pending operator) |
| [https://williamsburgsh-commits.github.io/SpecGuard/](https://williamsburgsh-commits.github.io/SpecGuard/) | GitHub Pages interim URL |

**Deploy:** `site/` canonical source; `docs/` mirror for GitHub Pages (legacy `/docs` — GitHub does not support `/site`). Pages build status: **built**. Custom domain `specguard.xyz` pending DNS (point CNAME to `williamsburgsh-commits.github.io`; remove Namecheap URL forward).

---

### Status page artifacts

| File | Purpose |
|---|---|
| `site/index.html` | Public GREEN / STALE / RED badge UI |
| `site/status.json` | Machine-readable operator state |
| `site/CNAME` | `specguard.xyz` |
| `tools/heartbeat.mjs` | Updates heartbeat timestamp + proof log |

**STALE rule (documented on page):**

- `heartbeat_age = now - last_heartbeat_at`
- **STALE** if `last_heartbeat_at` is missing or `heartbeat_age > heartbeat_ttl_seconds` (300s)
- **Copy-trade eligible** if `status === GREEN` and not STALE

---

### T6.1 — Public status page load

**Result:** PASS — GitHub Pages build **built**; interim URL `https://williamsburgsh-commits.github.io/SpecGuard/` serves `index.html` + `status.json` (HTTP 200). Custom domain pending DNS.

---

### T6.2 — Single heartbeat run

**Result:** PASS — `node tools/heartbeat.mjs` updated `site/status.json` and created proof log

Sample run:

```json
{
  "ok": true,
  "at": "2026-08-25T11:04:20.483Z",
  "proof_ref": "logs/heartbeat/heartbeat-2026-08-25T11-04-20-483Z.json",
  "copy_trade_eligible": true
}
```

---

### T6.3 — STALE display test

**Result:** PASS — fixture with `last_heartbeat_at` >300s ago yields **STALE** display and copy-trade **not eligible**; restored to fresh GREEN after test

---

### T6.4 — Three consecutive heartbeats

**Result:** PASS — 3 proof entries in `logs/heartbeat/`

| # | Proof ref | Timestamp (UTC) |
|---|---|---|
| 1 | `logs/heartbeat/heartbeat-2026-08-25T11-04-20-483Z.json` | 2026-08-25T11:04:20.483Z |
| 2 | `logs/heartbeat/heartbeat-2026-08-25T11-05-28-216Z.json` | 2026-08-25T11:05:28.216Z |
| 3 | `logs/heartbeat/heartbeat-2026-08-25T11-06-17-760Z.json` | 2026-08-25T11:06:17.760Z |

Sample proof payload (`proof_type: repo_log`, memo `specguard-hb-<unix>`).

---

### Canonical artifact table

| Field | Value |
|---|---|
| Status URL (target) | `https://specguard.xyz` |
| Status URL (interim) | `https://williamsburgsh-commits.github.io/SpecGuard/` |
| Heartbeat TTL | 300s |
| Operator status | GREEN (manual until Phase 12/13 flatten) |
| Last heartbeat | `2026-08-25T11:06:17.760Z` |
| Snapshot | `logs/phase6-status-snapshot.json` |

---

### Phase 6 gate checklist

- [x] Public status URL live (GitHub Pages + CNAME committed)
- [x] At least 3 consecutive heartbeats logged
- [x] STALE logic documented on page

---

**Next:** Phase 7 — `specguard-enforcer` custom skill.

---

## Phase 7 — Custom skill: `specguard-enforcer`

**Date:** 2026-08-25  
**Gate result:** **PASS**

### Skill install

| Field | Value |
|---|---|
| Skill ID | `30850d89-7111-4ed4-9275-51affa8a1118` |
| Slug | `specguard-enforcer` |
| Name | SpecGuard Enforcer |
| Enabled | **true** |
| Source | [`skills/specguard-enforcer/SKILL.md`](skills/specguard-enforcer/SKILL.md) |
| Dashboard | [agent skills](https://agents.clawpump.tech/dashboard/skills?agent=89ca5e76-d59f-4276-8399-eecdf8bb3a04) |

Installed via `POST /skills/{agent_id}` (`node tools/phase7-api.mjs install`).

**Operator law:** BLOCK (not recommend), `agent_can_override: false`, flatten sequence defined in skill, ENFORCEMENT_LOG JSON on every check.

---

### T7.1 — Order within spec

**Result:** PASS — deterministic checker **ALLOW** for 0.01 SOL @ $50 (~$0.50 notional)

Enforcement log: [`logs/enforcement/enforcement-2026-08-25T11-27-15-852Z.json`](logs/enforcement/enforcement-2026-08-25T11-27-15-852Z.json)

```json
{ "decision": "ALLOW", "reason": "within_spec", "order_notional_usd": 0.5 }
```

Agent chat pre-check emits ENFORCEMENT_LOG format (skill attached). Preview/execute plumbing verified in Phase 5.

---

### T7.2 — Order above `max_notional_usd`

**Result:** PASS — agent **BLOCK** before execute; no new position on chain

Chat evidence: [`logs/phase7-t72-chat.json`](logs/phase7-t72-chat.json)

```json
{ "decision": "BLOCK", "reason": "max_notional", "order_notional_usd": 494.85 }
```

`perps_account` before/after T7.2: flat (no open positions). Agent reply: *"I did not execute the trade."*

Enforcement log: [`logs/enforcement/enforcement-2026-08-25T11-27-15-853Z.json`](logs/enforcement/enforcement-2026-08-25T11-27-15-853Z.json)

---

### T7.3 — Disallowed tool (sniper)

**Result:** PASS — **BLOCK** (`disallowed_tool`)

Chat evidence: [`logs/phase7-t73-chat-v2.json`](logs/phase7-t73-chat-v2.json)

```json
{ "decision": "BLOCK", "reason": "disallowed_tool", "tool": "token-sniper" }
```

Enforcement log: [`logs/enforcement/enforcement-2026-08-25T11-27-15-854Z.json`](logs/enforcement/enforcement-2026-08-25T11-27-15-854Z.json)

---

### T7.4 — Enforcement JSON logs

**Result:** PASS — `logs/enforcement/` contains ALLOW + BLOCK entries

Generated by `node tools/enforcement-check.mjs all` (mirrors skill breach math).

| File | Decision | Reason |
|---|---|---|
| `enforcement-2026-08-25T11-27-15-852Z.json` | ALLOW | within_spec |
| `enforcement-2026-08-25T11-27-15-853Z.json` | BLOCK | max_notional |
| `enforcement-2026-08-25T11-27-15-854Z.json` | BLOCK | disallowed_tool |

---

### T7.5 — Inversion vs `risk-manager`

**Result:** PASS — documented contrast

| | `risk-manager` | `specguard-enforcer` |
|---|---|---|
| Pre-trade | Recommend | **BLOCK** |
| Override | User decides | **Forbidden** |
| Proof | Optional text | **ENFORCEMENT_LOG JSON** |

`risk-manager` rule (community skill): *"Never block a trade — only recommend. The user has final say."*

`specguard-enforcer` rule: block first; flatten on breach; no override.

---

### Canonical artifact table

| Field | Value |
|---|---|
| Skill slug | `specguard-enforcer` |
| Skill ID | `30850d89-7111-4ed4-9275-51affa8a1118` |
| Spec URL | `https://raw.githubusercontent.com/williamsburgsh-commits/SpecGuard/main/spec/reference-spec.json` |
| Checker script | `tools/enforcement-check.mjs` |
| Install script | `tools/phase7-api.mjs install` |
| Snapshot | `logs/phase7-enforcer-snapshot.json` |

**Honest limit:** SKILL.md is operator law — Phase 8 adds platform automations for kill-switch without LLM.

---

### Phase 7 gate checklist

- [x] Skill attached and enabled
- [x] BLOCK test passed (5 SOL order not on chain)
- [x] Enforcement JSON log exists (ALLOW + BLOCK)

---

**Next:** Phase 8 — armed automation (`create_automation` flatten poll).
