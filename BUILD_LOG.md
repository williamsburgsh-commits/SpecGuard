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
