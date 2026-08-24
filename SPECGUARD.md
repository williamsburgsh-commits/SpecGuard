# Specguard v2

**A ClawPump agent that trades tiny Phoenix perps under a public spec, and whose kill-switch is a tool call — not a recommendation.**

> One sentence: Specguard quotes isolated Phoenix perps inside published limits; on breach it cancels and closes onchain, posts the signatures, turns RED, and `$GUARD`'s treasury can buy `$ANSEM` on that tape. The open skill inverts ClawPump's Risk Manager: it **blocks, then flattens**.

---

## Table of contents

1. [The problem](#the-problem)
2. [What it is / what it is not](#what-it-is--what-it-is-not)
3. [Onchain actions](#onchain-actions)
4. [The spec](#the-spec)
5. [The skill (Builder receipt)](#the-skill-builder-receipt)
6. [Token: $GUARD](#token-guard)
7. [Tracks & registration](#tracks--registration)
8. [Why this is added, not wrapped](#why-this-is-added-not-wrapped)
9. [26-day build plan](#26-day-build-plan)
10. [15-minute stream script](#15-minute-stream-script)
11. [Architecture](#architecture)
12. [Success criteria](#success-criteria)
13. [Registration one-liner](#registration-one-liner)
14. [First three moves today](#first-three-moves-today)

---

## The problem

### From ClawPump docs, not a vibe

ClawPump already ships the trader stack:

- `perps_order_preview` / `execute` / `cancel`
- `confirmRisk`, account risk tier
- Jupiter swaps, DCA, sniper, Trader Ralph
- Automations, custom skills, skill marketplace

Community skill **`risk-manager`** is a `SKILL.md` injected into the prompt:

- Pre-trade sizing, concentration, drawdown **advice**
- Last rule: **"Never block a trade — only recommend."**

So "risk" on this platform is a paragraph. Copy-traders and judges cannot see a machine-enforced shutdown.

The hackathon track still wants:

- Realised performance
- Risk control
- Onchain Solana volume
- **What you added — not a wrap of `perps_order_execute`**

### Hard bars

- **If flatten never fires on mainnet, this is a README.**
- **If the skill only recommends, it's a fork of theirs and you lose.**

---

## What it is / what it is not

### What it is

A **Hermes / claw-agent operator** on ClawPump.

- One market at a time (start with a liquid Phoenix perp — SOL-USD or whatever `perps_markets` lists as live)
- Tiny size
- **Spec is law. Agent is the operator.**

### What it is not

| Not this | Why |
|---|---|
| Phoenix spot SOL-USDC CLOB MM | That tool is not in ClawPump Agent MCP |
| Alpaca / dual-rail | Cut for solo 26-day scope |
| PnL SaaS | `get_portfolio`, `get_wallet_history`, `get_balance_history` already exist |
| DAO | `$GUARD` is a fee claim, not governance |
| SkillForge / arena layer | Different product |
| Trader Ralph with a logo | Intelligence is input, not the product |

---

## Onchain actions

Every transaction type the agent (or watcher) may emit:

### Setup

| Action | Tool |
|---|---|
| Register trader | `perps_trader_register` |
| Deposit collateral | `perps_collateral_deposit` (USDC from agent wallet) |
| Read state | `perps_account`, `perps_market_data` |

### Quote

| Step | Tool |
|---|---|
| Preview | `perps_order_preview` |
| Execute | `perps_order_execute` with `confirmRisk` + **idempotency key** |
| Behavior | Bids and asks, **isolated**, size capped by spec |

### Cancel

| Action | Tool |
|---|---|
| Cancel one / all | `perps_order_cancel` by id or **all for symbol** |

### Flatten (the product)

Sequence on breach or drill:

1. `perps_order_cancel` — all open orders on that market
2. Close remaining position — opposite `perps_order_execute` (market / aggressive limit)
3. Optional `swap_execute` — only if wallet dust needs to return to USDC
4. **Attestation** — publish last sigs (site + X + memo or public JSON hashed in tiny transfer)
5. **Status → RED** until manual reset (signed post or memo tx)

### Limit change

- Signed public JSON (and, if it ships week 1, a memo tx)
- Dashboard **cannot** show limits the chain/log doesn't reflect
- Old fills stay under the old spec — tape is not rewritten

### Heartbeat

- Every `heartbeat_ttl_seconds`: public ping (agent chat log + X or 0-SOL self-transfer memo)
- **Copy-trade green** only if: heartbeat fresh **and** status **GREEN**

### PnL

- **Helius** + `perps_account` + `get_wallet_history`
- Do **not** rebuild ClawPump's portfolio UI
- Deep-link their dashboard; overlay spec + GREEN/RED + flatten history

---

## The spec

Public, immutable to the agent. Hosted at a stable URL (e.g. `https://specguard.xyz/spec.json`).

```json
{
  "market": "SOL-PERP",
  "max_notional_usd": 200,
  "max_inventory_usd": 100,
  "max_drawdown_usd": 40,
  "max_leverage": 2,
  "allowed_tools": [
    "perps_order_preview",
    "perps_order_execute",
    "perps_order_cancel",
    "perps_account",
    "swap_execute"
  ],
  "heartbeat_ttl_seconds": 300,
  "flatten_on_breach": true,
  "agent_can_override": false
}
```

### Global rules

| Rule | Behavior |
|---|---|
| Breach on mark, inventory, or missed heartbeat | **Flatten** |
| Agent widens limits | **Forbidden** — only operator publishes new spec version |
| New spec version | New file + public note; historical fills stay under old spec |
| Designed max loss (on ~$200 wallet) | ~**$40** drawdown cap + flatten slippage (~$5–20) |

### Status machine

```
GREEN  → trading allowed, heartbeat fresh, within spec
RED    → flattened; no new risk until manual reset
RESET  → operator attestation + new GREEN only after review
```

---

## The skill (Builder receipt)

### Name

**`specguard-enforcer`**

### Distribution

- Publish to ClawPump community skills / `skills_publish`
- Other agents can **fork** it
- Goal: **3+ hackathon teams** fork in week 2–3 (traction metric judges can verify)

### Inversion vs `risk-manager`

| | `risk-manager` (ClawPump) | `specguard-enforcer` (Specguard) |
|---|---|---|
| Pre-trade | Recommend | **Block** |
| On breach | Suggest stop | **Flatten sequence** |
| Override | User decides | **`agent_can_override: false`** |
| Proof | None | **Public sigs + log** |

### Before every risky tool call

Applies to `perps_order_execute` and `swap_execute`:

1. Load spec
2. Check: notional, inventory, drawdown, leverage, allowed_tools
3. If order **would breach**: **BLOCK**, then run flatten — do not ask user
4. If **already in breach**: flatten first, no new risk
5. Log every check as JSON: `{ time, mark, inventory, dd, decision, tx_sigs }`

### Enforcement reality

A `SKILL.md` alone cannot physically grab the wallet. Enforcement = **agent run + automations + optional watcher**:

| Layer | Role |
|---|---|
| **Custom skill** | Law text: block + flatten |
| **`create_automation`** | Scheduled `perps_account` poll; on breach, same tool sequence (platform-side, LLM-independent) |
| **Sidecar watcher** (optional) | Cron on your box using same MCP — belt if LLM wiggles |

The **demo agent** is the reference implementation. The **skill** is how other Hermes agents inherit it.

> If we only ship markdown, we failed.

---

## Token: $GUARD

### Launch

- **Gasless** on ClawPump this week (first 3 sponsored launches per user)
- Register at [clawpump.tech/ansemhack](https://clawpump.tech/ansemhack)
- Post entry on X, follow `@clawpumptech`

### Economics

| | |
|---|---|
| Creator fee share | **~65%** of pump.fun trading fees from day one — win or lose |
| DAO | **No** |
| Stamp-to-trade | **No** |

### Treasury

Payout wallet receives:

- Book residual (if any)
- ClawPump fee share on `$GUARD`

### Published clock

After a **GREEN hour** or after a **flatten**:

- Treasury buys **`$GUARD`** and **`$ANSEM`** (50/50 of that slice)
- Execute on stream — **live `$ANSEM` use case** for bonus scoring

### Why hold $GUARD

- Fee claim on the tape
- Attestation feed access (non-governance)
- Story / copy-trade signal while agent is GREEN

If the book is dead, don't pretend it's yield. The token can still tape.

---

## Tracks & registration

| Track | Enter? |
|---|---|
| **ClawPump × pump.fun** (Trader + Builder) | **Yes** — primary |
| **Overall Winner** | Automatic with ClawPump token |
| **EasyA Kickstart** | **Skip** — separate launch surface |
| **Inference Markets** | **Skip v1** — UsePod as brain later if book is live |

### Hackathon requirements (all by **19 Sept 2026**)

1. Register team at ansemhack
2. Post entry on X + follow `@clawpumptech`
3. Token live on ClawPump

### Judging criteria map

| Criterion | Specguard answer |
|---|---|
| Builders onboarded | Published forkable skill |
| Onchain volume | Phoenix perp quotes, fills, flatten txs |
| Attention | Flatten clips, GREEN/RED drama, duels optional |
| $ANSEM volume | Treasury buyback on clock / post-flatten |
| Deploy early | Token week 1; weeks of history before deadline |

---

## Why this is added, not wrapped

| ClawPump gives you | Specguard adds |
|---|---|
| Open perps | **Public spec** |
| Risk Manager suggests | **Block + flatten** |
| `confirmRisk` on one order | **Global kill-switch + attestation** |
| Private agent | **GREEN/RED copy-trade signal** |
| Portfolio UI | **Enforcement log + spec overlay** |

**New object:** enforced public spec + flatten attestation + skill that forbids override.

---

## 26-day build plan

**Deadline: 19 September 2026** — register, token live, reachable X account.

### Week 1 — now → ~31 Aug

- [ ] Register on ansemhack
- [ ] Tokenize `$GUARD` (gasless)
- [ ] Public spec URL live
- [ ] `perps_account_prepare` + deposit dust USDC collateral
- [ ] One tiny live order + one cancel — tweet Solscan
- [ ] Custom skill on agent: `agent_can_override: false`
- [ ] Heartbeat + GREEN/RED page (single route or GitHub + ClawPump dashboard links)

### Week 2 — ~1–7 Sep

- [ ] Recurring tiny quotes
- [ ] First real fill (Ansem community flow if book empty)
- [ ] Watcher automation polling `perps_account`
- [ ] Paper flatten on throwaway size if needed; schedule real drill
- [ ] Publish `specguard-enforcer` v0.1 to community repo / `skills_publish`

### Week 3 — ~8–14 Sep (non-negotiable)

- [ ] **Mainnet flatten:** cancel-all + close, public sigs, status RED, then reset
- [ ] **`$ANSEM` buyback tx** on stream (post-flatten or post-profit)
- [ ] Book MCG / Ansem stream slot

### Week 4 — ~15–19 Sep

- [ ] Keep book alive — **no new markets**
- [ ] Clips: flatten replay, spec vs `perps_account`, fee share, buyback
- [ ] Copy-trade rule: **only follow while GREEN**

### Cut if late

- Extra markets
- Fancy UI
- Onchain program (unless shipped week 1)
- Inference track
- Sidecar polish
- Alpaca
- Duels (optional nice-to-have, not core)

---

## 15-minute stream script

### 1. Founder & team (~3 min)

Solo builder. Thesis: **agentic perps need a kill-switch that is a transaction**, not a paragraph in a skill file.

### 2. Product & demo (~5 min)

Live:

- `perps_account` — collateral, position, orders
- Spec JSON side-by-side
- Status **GREEN**
- Trigger or **replay flatten**
- Show cancel + close signatures on Solscan

### 3. Market, GTM, traction (~4 min)

- Every ClawPump agent can open perps; none ship **enforceable** public limits
- TAM: copy-traders, agent MMs, anyone who needs machine-readable "still safe"
- Metrics: fill count, realized DD vs spec, flatten count, `$GUARD` fees, skill forks

### 4. Token, roadmap, long-term vision (~3 min)

- **`$GUARD`:** fee claim + attestation feed; treasury buyback clock for `$GUARD` + `$ANSEM`
- **Roadmap:** other agents import enforcer; attestation API; marketplace-listed reference agent
- **Long-term:** AnsemHack is proof on tape; the company is the seatbelt every serious agent imports — not a fund, not a DAO

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Hermes / claw-agent (operator)                 │
│     spread / quote logic inside immutable spec           │
└─────────────────────────┬───────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐
│ custom skill    │ │ ClawPump     │ │ sidecar watcher │
│ specguard-    │ │ Agent MCP    │ │ (optional cron) │
│ enforcer        │ │ perps_*      │ │ same MCP tools  │
│ (law)           │ │ swap_execute │ │                 │
└────────┬────────┘ │ automations  │ └────────┬────────┘
         │          └──────┬───────┘          │
         └─────────────────┼──────────────────┘
                           ▼
              ┌────────────────────────┐
              │ Public spec + flatten  │
              │ log + GREEN/RED status │
              └────────────┬───────────┘
                           ▼
              ┌────────────────────────┐
              │ Treasury (payout wallet)│
              │ → $GUARD / $ANSEM buys  │
              └────────────────────────┘
```

### ClawPump MCP tools used

**Agent MCP (`@clawpump/agents`):**

- Lifecycle: `create_agent`, `update_agent`, `create_custom_skill`, `list_available_skills`
- Automations: `create_automation`, `trigger_automation`, `list_automations`
- Perps: `perps_markets`, `perps_market_data`, `perps_account`, `perps_account_prepare`, `perps_trader_register`, `perps_collateral_deposit`, `perps_order_preview`, `perps_order_execute`, `perps_order_cancel`
- Trading: `swap_execute` (dust / treasury only)
- Billing: `get_wallet_history`, `get_wallet_summaries`, `get_balance_history`
- Social: `connect_twitter`, `configure_twitter_posting`
- Launch: `launch_token_gasless`

**Launchpad MCP (optional):**

- `skills_publish`, `skill_fork`, `skills_list`

### External

- **Helius** — hackathon RPC credits; index fills for PnL
- **Public site** — spec URL, status, flatten log (minimal)

---

## Success criteria

| Tier | Definition |
|---|---|
| **Minimum viable** | Token live, spec public, **one mainnet flatten**, PnL from txs not screenshots |
| **Competitive** | Recurring fills, skill published, stream clips, one `$ANSEM` buyback |
| **Winner-shaped** | Weeks of onchain history, flatten that wasn't fake, **3+ teams fork enforcer** |

---

## Capital & risk

| Item | Amount |
|---|---|
| MM wallet (SOL + USDC collateral) | ~**$200** |
| Designed max loss (spec) | **`max_drawdown_usd: 40`** + flatten slippage |
| Token launch | **$0** if gasless slot available |
| Alpaca | **Not used** |

Returns from **book alone** if things go well: ~**2–8%/month** on deployed capital — not the main upside. Token fee share + attention drive hackathon EV.

---

## Registration one-liner

> Specguard: a tiny Phoenix perps agent whose spec is public and whose kill-switch is onchain. We cancel and close on breach — we don't recommend. `$GUARD` claims fees; treasury buybacks `$ANSEM` live. Open Hermes skill that blocks, then flattens. `@clawpumptech` #AnsemHack

---

## First three moves today

1. **Register + launch `$GUARD`** on [clawpump.tech/ansemhack](https://clawpump.tech/ansemhack)
2. **`perps_account_prepare`** + deposit dust USDC collateral
3. **Post one Phoenix perp order** under the spec — tweet the signature

Alpaca stays in the drawer.

---

## Links

- Hackathon: https://clawpump.tech/ansemhack
- ClawPump docs: https://clawpump.tech/docs
- Agent MCP: `npx @clawpump/agents --cursor`
- Claw Agent: `npx @clawpump/claw-agent`

---

*Last updated: 24 Aug 2026 — Specguard v2 build spec*
