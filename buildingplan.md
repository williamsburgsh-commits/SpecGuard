# Specguard v2 — Building Plan (A → Z)

Brick-by-brick build spec for a solo team. **Do not start Phase N+1 until Phase N passes its gate.**

Source of truth: [`SPECGUARD.md`](./SPECGUARD.md) (v2 only).

**Hard deadline:** 19 September 2026 — register, token live, reachable X account.

**Hard product bars (from spec):**

- If flatten never fires on mainnet → README, not a product.
- If the skill only recommends → fork of `risk-manager`, you lose.
- Do not rebuild ClawPump portfolio UI, leaderboard, or Alpaca dual-rail.

---

## How to use this document

Each phase has:

| Section | Meaning |
|---|---|
| **Goal** | What exists when done |
| **Build** | Concrete tasks |
| **Test** | How to verify it works |
| **Gate** | Pass/fail checklist — all must be ✅ before next phase |
| **Notes** | Pitfalls, scope, things easy to miss |
| **Artifacts** | What to save (links, screenshots, sigs) for stream/judging |

Keep a **`BUILD_LOG.md`** (or Notion) and paste every gate result, tx signature, and screenshot there.

---

## Global prerequisites (before Phase 0)

| Item | Notes |
|---|---|
| Solana wallet | Dedicated **reference agent wallet** only — not your personal main wallet |
| Capital plan | ~**$200** SOL + USDC for perps collateral; **`max_drawdown_usd: 40`** in spec |
| Google account | ClawPump signup |
| X account | Project handle for hackathon entry + attestation posts |
| Cursor / Claude | MCP client for `@clawpump/agents` |
| Helius | Register hackathon team → free RPC credits |
| Domain (optional) | `specguard.xyz` or GitHub Pages for public spec — not required day 1 |

**Secrets:** Store `CLAWPUMP_API_KEY` (`cpk_...`) in env only — never commit. Agent wallet keys stay in ClawPump / claw-agent, not in git.

**Out of scope for v2:** Alpaca, custom Anchor program, Inference/UsePod v1, EasyA Kickstart, duels, fancy UI, x402 API, second market.

---

## Phase 0 — Toolchain & read-only ClawPump access

**Goal:** You can call ClawPump MCP from Cursor and read platform state without spending money.

### Build

1. Install Node 18+.
2. Get API key: [clawpump.tech/dashboard/api](https://clawpump.tech/dashboard/api) → create `cpk_...`.
3. Add to Cursor `mcp.json`:

```json
{
  "mcpServers": {
    "clawpump-agents": {
      "command": "npx",
      "args": ["@clawpump/agents"],
      "env": {
        "CLAWPUMP_API_KEY": "cpk_YOUR_KEY"
      }
    }
  }
}
```

4. If `npx @clawpump/agents` 404s, use local dashboard repo fallback per [clawpump.tech/docs](https://clawpump.tech/docs).
5. Run `get_account_status`, `list_agents`, `list_available_skills`, `perps_markets`.

### Test

| # | Action | Expected |
|---|---|---|
| T0.1 | `get_account_status` | Auth OK, profile loads |
| T0.2 | `list_available_skills` | Includes `defi-trading`, `perps-trading`, community `risk-manager` |
| T0.3 | `perps_markets` | At least one live market (note symbol e.g. `SOL-USD`) |
| T0.4 | `platform_health` via launchpad MCP (optional) | Solana RPC connected |

### Gate

- [ ] MCP connects without auth errors
- [ ] You have written down the **exact perp market symbol** you will use
- [ ] You confirmed `risk-manager` exists and read its “never block” rule (your inverse is the pitch)

### Notes

- `@clawpump/mcp` (launchpad, HTTP) and `@clawpump/agents` (stdio) are different servers — v2 needs **Agent MCP** for perps + automations + custom skills.
- Free tier: 1,000 messages/day shared globally — don’t burn on loops during dev.

### Artifacts

- Screenshot of successful `perps_markets` output
- Market symbol chosen: `_______________`

---

## Phase 1 — Hackathon registration & project identity

**Goal:** Official hackathon entry started; project X exists.

### Build

1. Register at [clawpump.tech/ansemhack](https://clawpump.tech/ansemhack).
2. Pick tracks: **ClawPump × pump.fun** (Trader + Builder).
3. Create project X handle (e.g. `@Specguard` or personal).
4. Follow `@clawpumptech`.
5. Create repo folder structure:

```
AnsemHack/
  SPECGUARD.md
  buildingplan.md
  spec/
    reference-spec.json
  skills/
    specguard-enforcer/
      SKILL.md
  logs/
    enforcement/          # JSON check logs
    flatten/              # flatten attestations
  site/                   # optional minimal status page
```

### Test

| # | Action | Expected |
|---|---|---|
| T1.1 | Registration form submitted | Confirmation / team on registry |
| T1.2 | X account live | Can post and tag |
| T1.3 | Helius hackathon credits | Applied if offered in registration flow |

### Gate

- [ ] Registered on ansemhack before heavy build
- [ ] Project X handle decided and linked in registration
- [ ] Repo structure created

### Notes

- Registration unlocks Helius RPC + launch stack per hackathon page — do this early.
- You still need token live by Sept 19 — token comes Phase 8, not day 1, but register now.

---

## Phase 2 — Reference agent on ClawPump

**Goal:** One ClawPump agent exists with wallet, perps skill enabled, non-custodial keys.

### Build

1. `create_agent` — name: `Specguard Reference`, persona: disciplined perps operator under public spec.
2. `update_agent` — enable skills:
   - `perps-trading`
   - `portfolio` (read PnL — don’t rebuild UI)
   - `wallet-ops`
3. `get_agent` → save **agent ID**, **wallet address**, dashboard URLs (`get_dashboard_urls`).
4. Fund wallet with **small SOL** (~0.1–0.2) for gas only first — full collateral in Phase 4.

### Test

| # | Action | Expected |
|---|---|---|
| T2.1 | `get_agent` | Agent ID + wallet address returned |
| T2.2 | `get_wallet_summaries` | SOL balance > 0 after fund |
| T2.3 | `list_integrations` | Baseline state recorded |
| T2.4 | Open ClawPump dashboard terminal for agent | Loads without error |

### Gate

- [ ] Agent ID and wallet address saved in `BUILD_LOG`
- [ ] `perps-trading` skill enabled
- [ ] Dashboard URLs bookmarked

### Notes

- One agent, one market, one wallet — don’t spin up extras.
- Whitelist tools exist but v2 doesn’t require custom onchain whitelist program.

---

## Phase 3 — Public spec (immutable to agent)

**Goal:** Spec JSON is public, versioned, and matches what the agent will enforce.

### Build

1. Copy spec from `SPECGUARD.md` into `spec/reference-spec.json`.
2. Set conservative limits for ~$200 wallet:

```json
{
  "version": 1,
  "market": "SOL-USD",
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

3. Publish at stable URL:
   - **Option A:** GitHub raw URL from this repo (`spec/reference-spec.json`)
   - **Option B:** Static site / domain
4. Document spec URL in registration + X bio.

### Test

| # | Action | Expected |
|---|---|---|
| T3.1 | Fetch spec URL in incognito | JSON valid, all fields present |
| T3.2 | `agent_can_override` | `false` |
| T3.3 | `allowed_tools` | Only perps + swap_execute — no sniper, no predictions |
| T3.4 | SHA256 hash of file | Record hash in BUILD_LOG (for later attestation) |

### Gate

- [ ] Public URL works for anyone
- [ ] Spec hash recorded
- [ ] Market symbol matches Phase 0 choice

### Notes

- Agent must **not** be able to edit spec — only you publish new versions with version bump.
- Limit changes = new file + public note; old fills stay under old spec.

---

## Phase 4 — Phoenix perps account ready

**Goal:** Agent registered on Phoenix, collateral deposited, account readable.

### Build

1. `perps_account_prepare` for reference agent.
2. `perps_trader_register` if required by tool flow.
3. Send **USDC + SOL** to agent wallet:
   - ~$100 USDC collateral target (adjust down if testing)
   - ~0.05–0.1 SOL for fees
4. `perps_collateral_deposit` — deposit USDC to Phoenix parent collateral.
5. `perps_account` — record baseline collateral, empty position, no open orders.

### Test

| # | Action | Expected |
|---|---|---|
| T4.1 | `perps_account` | Collateral > 0, risk tier shown |
| T4.2 | `perps_market_data` for spec market | Mark price, orderbook optional |
| T4.3 | Solscan agent wallet | USDC + SOL received |
| T4.4 | No open orders | Clean slate |

### Gate

- [ ] Collateral deposited and visible in `perps_account`
- [ ] Baseline equity recorded (for drawdown math later)
- [ ] Total wallet exposure ≤ planned ~$200

### Notes

- **Do not quote size yet** — prove account plumbing first.
- If deposit fails, fix before any orders — don’t skip to Phase 5.

### Artifacts

- Baseline equity: `$_______`
- Deposit tx sig(s): `_______`

---

## Phase 5 — Single order lifecycle (preview → execute → cancel)

**Goal:** Prove you can place and cancel one tiny perp order on mainnet under manual control.

### Build

1. Pick **minimum size** allowed by Phoenix (e.g. smallest notional that passes preview).
2. `perps_order_preview` — limit order, isolated, far from market if you don’t want immediate fill.
3. `perps_order_execute` with:
   - `confirmRisk: true`
   - Unique **idempotency key** per order
4. Verify order on `perps_account` (open orders list).
5. `perps_order_cancel` — cancel that order (or cancel all for symbol).
6. Tweet/post: Solscan link to execute + cancel txs.

### Test

| # | Action | Expected |
|---|---|---|
| T5.1 | Preview returns | No error; size within spec notional |
| T5.2 | Execute succeeds | Tx signature on Solscan |
| T5.3 | `perps_account` shows order | Then empty after cancel |
| T5.4 | Cancel succeeds | No ghost orders |
| T5.5 | Idempotency | Re-running same key does not duplicate (or returns same result) |

### Gate

- [ ] One successful execute + cancel on mainnet
- [ ] Signatures saved in BUILD_LOG
- [ ] You understand `confirmRisk` flow

### Notes

- This phase is **manual** — no skill, no automation yet.
- If preview rejects size, lower notional — don’t widen spec to force it.

### Artifacts

- Execute sig: `_______`
- Cancel sig: `_______`

---

## Phase 6 — Status page: GREEN / RED + heartbeat

**Goal:** Public status reflects agent state; heartbeat proves liveness.

### Build

1. Minimal status endpoint or static page showing:
   - Spec URL + hash
   - Status: `GREEN` (manual until flatten exists)
   - Last heartbeat timestamp
   - Link to ClawPump agent dashboard
   - Link to Solscan wallet
2. Heartbeat job (cron or manual script every ≤300s):
   - Post to X **or** 0-SOL memo self-transfer **or** append to public log file
3. Rule: copy-trade green only if heartbeat age < TTL **and** status GREEN.

### Test

| # | Action | Expected |
|---|---|---|
| T6.1 | Page loads publicly | Spec link + GREEN |
| T6.2 | Run heartbeat once | Timestamp updates |
| T6.3 | Wait > TTL without heartbeat | Page shows STALE (or not GREEN for copy-trade) |
| T6.4 | Heartbeat proof | X post URL or tx sig saved |

### Gate

- [ ] Public status URL live
- [ ] At least 3 consecutive heartbeats logged
- [ ] STALE logic documented on page

### Notes

- Can be a single HTML file on GitHub Pages — no framework required.
- Don’t claim RED until Phase 12/13 flatten works.

---

## Phase 7 — Custom skill: `specguard-enforcer` (agent layer)

**Goal:** Skill installed on agent; pre-trade checks **block** (in prompt law), not recommend.

### Build

1. Write `skills/specguard-enforcer/SKILL.md`:
   - Load spec from public URL
   - Before `perps_order_execute` / `swap_execute`:
     - Check notional, inventory, drawdown, leverage, allowed_tools
     - If breach → **BLOCK**, run flatten sequence (defined in skill text)
     - If already in breach → flatten first
   - **`agent_can_override: false`** — never widen limits
   - Log every check as JSON to `logs/enforcement/`
2. `create_custom_skill` on reference agent with SKILL content.
3. `update_agent` — ensure skill enabled.

### Test

| # | Action | Expected |
|---|---|---|
| T7.1 | Ask agent to place order **within** spec | Proceeds to preview/execute |
| T7.2 | Ask agent to place order **above** `max_notional_usd` | Refuses / blocks — does not execute |
| T7.3 | Ask agent to call disallowed tool (e.g. sniper) | Refuses |
| T7.4 | Check log file | JSON entry with decision `ALLOW` or `BLOCK` |
| T7.5 | Compare to `risk-manager` | Your skill says block; theirs says recommend only |

### Gate

- [ ] Skill attached and enabled
- [ ] BLOCK test passed (order not on chain when blocked)
- [ ] Enforcement JSON log exists

### Notes

- **Honest limit:** SKILL.md alone cannot physically stop a determined MCP call — Phase 8 fixes that with automations.
- Still ship this phase — it’s the Builder receipt and operator law.

---

## Phase 8 — Armed automation (platform-side flatten)

**Goal:** Breach triggers cancel + close **without relying on the LLM**.

### Build

1. `create_automation` on reference agent:
   - Trigger: schedule (e.g. every 1–5 min) **or** condition on `perps_account` poll via automation action
   - Action: run tool sequence when breach detected:
     1. `perps_order_cancel` (all for symbol)
     2. Close position via `perps_order_execute`
     3. Write attestation stub / set status RED (via your status page update hook if automated)
2. Document breach math in code/comments:
   - Inventory USD = abs(position notional)
   - Drawdown = baseline equity − current equity
3. `trigger_automation` manually once to verify wiring (dry run if possible).

### Test

| # | Action | Expected |
|---|---|---|
| T8.1 | `list_automations` | Automation armed |
| T8.2 | Simulate breach OR use tiny throwaway position + artificially tight temp limit | Automation fires cancel/close |
| T8.3 | LLM disabled / agent not chatting | Automation still runs on schedule |
| T8.4 | Solscan | Cancel + close sigs present |

### Gate

- [ ] Automation armed and documented
- [ ] At least one **successful** automated cancel (close can be Phase 12)
- [ ] You can explain on stream: “flatten fires outside the model”

### Notes

- This is the **main technical differentiator** vs `risk-manager`.
- Tune poll frequency vs free tier message limits.

---

## Phase 9 — Token `$GUARD` (hackathon entry ticket)

**Goal:** Token live on ClawPump; hackathon eligibility complete.

### Build

1. `get_launch_status` for agent.
2. `launch_token_gasless` — symbol `GUARD`, link to agent (uses 1 of 3 free launches).
3. Complete hackathon checklist:
   - [ ] Registered (Phase 1)
   - [ ] Post entry on X tagging `@clawpumptech` + project link
   - [ ] Token live — paste mint in registration if needed
4. `set_external_wallet` — treasury/payout wallet for fee share.
5. Verify token on ClawPump tokens list.

### Test

| # | Action | Expected |
|---|---|---|
| T9.1 | Token mint exists | On pump.fun / ClawPump |
| T9.2 | Registration shows token linked | Same X handle |
| T9.3 | `fee_earnings` or dashboard | Token associated with agent |
| T9.4 | Entry post on X | Public URL saved |

### Gate

- [ ] `$GUARD` mint address saved
- [ ] Hackathon 3/3 requirements done
- [ ] Payout wallet registered

### Notes

- Token can launch before or after perps — spec says week 1; minimum gate is **before Sept 19**.
- 65% creator fees — win or lose — per `SPECGUARD.md`.

### Artifacts

- Mint: `_______`
- X entry post: `_______`

---

## Phase 10 — Quoting loop (recurring tiny quotes)

**Goal:** Agent repeatedly posts small bid/ask quotes within spec — onchain activity, not idle wallet.

### Build

1. Define quote logic (simple v2):
   - Fixed spread around mark from `perps_market_data`
   - Size ≤ spec `max_notional_usd`
   - Refresh: cancel stale + replace every N minutes
2. Implement via:
   - `create_automation` price/schedule triggers **or**
   - `create_agent_run` with bounded budget/steps **or**
   - Manual agent chat loop during dev hours
3. Run for ≥24h with logs.

### Test

| # | Action | Expected |
|---|---|---|
| T10.1 | `perps_account` over 24h | Regular post/cancel activity |
| T10.2 | Order count | >10 cancels/posts (proves life) |
| T10.3 | No spec breach | Inventory and DD within limits |
| T10.4 | Helius / wallet history | Txs visible |

### Gate

- [ ] 24h of quoting activity logged
- [ ] No unplanned flatten
- [ ] At least one post+cancel cycle on Solscan you can show

### Notes

- Empty book (all cancels, no fills) is visible to judges — start outreach for flow in Phase 11.
- One market only — no second pair.

---

## Phase 11 — First fill + PnL overlay

**Goal:** Real fill, real fees, realized PnL from txs — not a screenshot.

### Build

1. Tighten spread slightly OR coordinate small counterparty flow (Ansem community, friendly wallet).
2. On fill: record sig, position change on `perps_account`.
3. PnL page section (minimal):
   - Deep-link ClawPump `get_portfolio` / dashboard
   - Overlay: spec limits, current inventory, drawdown vs `max_drawdown_usd`
   - Data from `get_wallet_history` + `perps_account` + Helius

### Test

| # | Action | Expected |
|---|---|---|
| T11.1 | ≥1 fill on mainnet | Fill sig saved |
| T11.2 | Position opens then flat or managed within spec | Inventory ≤ cap |
| T11.3 | PnL numbers | Match wallet/perps account within reasonable lag |
| T11.4 | Drawdown display | Updates after fill |

### Gate

- [ ] ≥1 mainnet fill
- [ ] PnL overlay live (even if ugly)
- [ ] Fill clip ready (15s screen recording)

### Notes

- MM PnL expectation: modest % on capital — don’t pitch 50%/month from the book.

---

## Phase 12 — Flatten rehearsal (controlled drill)

**Goal:** Full flatten sequence works once before the “real” stream flatten.

### Build

1. Open **tiny** intentional position + resting orders (within spec).
2. Trigger flatten via:
   - Breach simulation (temp lower `max_drawdown` in test env **or** manual trigger calling same tool sequence as automation)
3. Execute sequence:
   1. `perps_order_cancel` all
   2. Close via `perps_order_execute`
   3. Optional `swap_execute` for dust → USDC
4. Publish attestation:
   - `logs/flatten/YYYY-MM-DD.json` with all sigs
   - X post with Solscan links
5. Set status **RED** → manual **RESET** → **GREEN**

### Test

| # | Action | Expected |
|---|---|---|
| T12.1 | After flatten | Zero open orders, flat position |
| T12.2 | Attestation file | All sigs listed |
| T12.3 | Status page | RED during flat, GREEN after reset |
| T12.4 | Loss amount | ≤ `max_drawdown_usd` + slippage buffer |

### Gate

- [ ] Full flatten rehearsal passed once
- [ ] RED → RESET → GREEN documented
- [ ] Attestation JSON template finalized for production

### Notes

- **Do this before Phase 13** — Phase 13 is the stream-facing one.
- Budget $20–60 slippage cost for drill — expected.

---

## Phase 13 — Production flatten (non-negotiable)

**Goal:** Mainnet flatten under real spec during hackathon window — the product proof.

### Build

1. Resume quoting (GREEN).
2. Trigger flatten via **real breach** or scheduled public drill (announce on X).
3. Same sequence as Phase 12 — no shortcuts.
4. **`$ANSEM` buyback** (treasury):
   - After flatten **or** after profitable GREEN hour
   - 50/50 slice: buy `$GUARD` + `$ANSEM` on clock
   - Record buyback sigs for stream
5. Book MCG / Ansem stream slot if available.

### Test

| # | Action | Expected |
|---|---|---|
| T13.1 | Flatten on mainnet | Cancel + close sigs public |
| T13.2 | Judges can verify | Spec URL + Solscan + status RED |
| T13.3 | `$ANSEM` buyback tx | On Solscan, tagged on X |
| T13.4 | Stream replay | 60s clip of flatten |

### Gate

- [ ] **Production flatten complete** — hard bar satisfied
- [ ] `$ANSEM` buyback executed at least once
- [ ] Stream slot booked or clip published

### Notes

- If you skip this phase, stop calling it Specguard.
- This is Q2 demo + Q4 token utility in one moment.

---

## Phase 14 — Publish skill to community (`skills_publish`)

**Goal:** Other teams can fork `specguard-enforcer` — Builder track receipt.

### Build

1. Finalize `SKILL.md` + install instructions (spec URL, `create_custom_skill`, enable automation template).
2. `skills_publish` via Launchpad MCP **or** ClawPump community repo per docs.
3. `skills_list` / marketplace — confirm listed.
4. Write 5-line install guide in README.

### Test

| # | Action | Expected |
|---|---|---|
| T14.1 | Skill visible in marketplace/list | Public |
| T14.2 | Fresh agent install test | Second agent or test account can attach skill |
| T14.3 | `skill_fork` works | Fork appears |
| T14.4 | Install time | <15 min for you; target <5 min for others |

### Gate

- [ ] Published and forkable
- [ ] Install doc in repo
- [ ] ≥1 external fork OR documented attempt to get 3 by Sept 7 (stretch)

### Notes

- Goal: **3+ forks** by week 2–3 for winner-shaped entry — start DMs after publish.

---

## Phase 15 — Treasury & buyback clock (ongoing)

**Goal:** Repeatable `$GUARD` / `$ANSEM` buys on published schedule.

### Build

1. Define treasury rules in public doc:
   - Trigger: end of GREEN hour **or** post-flatten
   - Split: 50% `$GUARD` / 50% `$ANSEM` of treasury slice
   - Min amount threshold (don’t buy $0.50 on stream)
2. Implement via agent `swap_execute` or manual treasury script.
3. Log every buyback with sig + timestamp.

### Test

| # | Action | Expected |
|---|---|---|
| T15.1 | One scheduled buyback | Two txs or one split logged |
| T15.2 | Public clock page | Next buyback time visible |
| T15.3 | `$GUARD` fee accrual | `fee_earnings` shows non-zero if token traded |

### Gate

- [ ] ≥2 buyback events logged before Sept 19
- [ ] Rules public, not verbal

---

## Phase 16 — Stream package & judging prep

**Goal:** 15-minute stream rehearsed; all artifacts one click away.

### Build

1. Rehearse 4 questions from `SPECGUARD.md`:
   - Founder / team
   - Product demo (live `perps_account`, spec, GREEN → flatten replay)
   - Market / traction (fills, DD vs spec, flatten count, forks, fees)
   - Token / long-term vision (seatbelt company, not fund)
2. Prepare tab folder:
   - Spec URL
   - Status page
   - Solscan flatten txs
   - ClawPump agent dashboard
   - Skill marketplace link
   - `$GUARD` token page
3. Record backup clip if live demo risky.

### Test

| # | Action | Expected |
|---|---|---|
| T16.1 | Dry run ≤15 min | No dead air >30s |
| T16.2 | Live flatten replay | Works from cold open |
| T16.3 | All links open | No 404 |

### Gate

- [ ] Dry run completed once
- [ ] Backup clip stored

---

## Phase 17 — Launch hardening (Sept 15–19)

**Goal:** Freeze scope; survive deadline week.

### Build

1. **Freeze features** — no new markets, skills, or UI.
2. Daily checklist through Sept 19:
   - [ ] Heartbeat fresh
   - [ ] Agent GREEN or documented RED reason
   - [ ] Token still linked in registry
   - [ ] Quoting or documented pause
3. Monitor automation + wallet balance.
4. Post 1 clip/day (flatten replay, spec vs account, buyback, fee share).

### Test

| # | Action | Expected |
|---|---|---|
| T17.1 | Sept 19 registration check | All 3 hackathon reqs still true |
| T17.2 | Onchain history | ≥2 weeks txs for judges |
| T17.3 | No critical bugs | Automations armed |

### Gate

- [ ] Feature freeze honored
- [ ] Hackathon eligibility verified Sept 19
- [ ] BUILD_LOG complete for judging

---

## Phase dependency map

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5
                                                      │
Phase 6 ◄─────────────────────────────────────────────┘
  │
  ▼
Phase 7 ──► Phase 8 ──► Phase 10 ──► Phase 11 ──► Phase 12 ──► Phase 13
  │                              ▲
Phase 9 (token) ─────────────────┘ (can parallel after Phase 5)
  │
  ▼
Phase 14 ──► Phase 15 ──► Phase 16 ──► Phase 17
```

**Critical path:** 0 → 2 → 4 → 5 → 8 → 12 → **13** (flatten)

**Parallel OK:** Phase 6 + 9 anytime after Phase 5; Phase 14 after Phase 8.

---

## Testing philosophy (v2)

| Layer | What it proves |
|---|---|
| Manual MCP (Phases 4–5) | Plumbing works |
| Skill (Phase 7) | Operator law — block not recommend |
| Automation (Phase 8) | Kill-switch without LLM |
| Rehearsal flatten (Phase 12) | Sequence + attestation |
| Production flatten (Phase 13) | **Product exists** |
| Published skill (Phase 14) | **Added, not wrapped** |

Never skip straight to “smart agent” before Phase 5 passes.

---

## Drawdown & breach math (implement once, reuse everywhere)

```text
baseline_equity   = collateral + unrealized PnL at session start (from perps_account)
current_equity    = collateral + unrealized PnL now
drawdown_usd      = baseline_equity - current_equity
inventory_usd     = abs(position_notional_usd)

BREACH if:
  inventory_usd > max_inventory_usd
  OR drawdown_usd > max_drawdown_usd
  OR order_notional > max_notional_usd
  OR leverage > max_leverage
  OR heartbeat_age > heartbeat_ttl_seconds
  OR tool not in allowed_tools
```

Use the **same function** in skill text, automation, and status page.

---

## What to cut if behind schedule

| Cut first | Keep at all costs |
|---|---|
| Sidecar watcher | Phase 13 flatten |
| Fancy site | Phase 8 automation |
| Second buyback | Phase 9 token |
| Duels / outreach blitz | Phase 5 execute+cancel |
| Onchain memo program | Phase 14 skill publish |
| PnL polish | Phase 12 rehearsal |

---

## Success tiers (from SPECGUARD.md)

| Tier | Phases that must pass |
|---|---|
| **Minimum viable** | 9, 13 + spec public |
| **Competitive** | 11, 13, 14, 15 |
| **Winner-shaped** | 13 + 14 with **3+ forks** + weeks of Phase 10 history |

---

## BUILD_LOG template (copy per phase)

```markdown
## Phase X — [date]

### Gate result: PASS / FAIL

### Evidence
- Links:
- Tx sigs:
- Screenshots:

### Issues found
-

### Fix before next phase
-
```

---

## Quick reference — MCP tools by phase

| Phase | Primary tools |
|---|---|
| 0 | `get_account_status`, `perps_markets`, `list_available_skills` |
| 2 | `create_agent`, `update_agent`, `get_wallet_summaries` |
| 4 | `perps_account_prepare`, `perps_trader_register`, `perps_collateral_deposit`, `perps_account` |
| 5 | `perps_order_preview`, `perps_order_execute`, `perps_order_cancel` |
| 7 | `create_custom_skill`, `update_custom_skill` |
| 8 | `create_automation`, `trigger_automation`, `list_automations` |
| 9 | `launch_token_gasless`, `set_external_wallet` |
| 10–11 | `perps_market_data`, `get_wallet_history`, `get_portfolio` |
| 12–13 | Full flatten sequence + `swap_execute` if needed |
| 14 | `skills_publish`, `skill_fork`, `skills_list` |
| 15 | `swap_execute`, `fee_earnings` |

---

## Links

- Spec: [`SPECGUARD.md`](./SPECGUARD.md)
- Hackathon: https://clawpump.tech/ansemhack
- Docs: https://clawpump.tech/docs
- Agent MCP: `npx @clawpump/agents --cursor`

---

*Building plan for Specguard v2 — brick-by-brick. Last updated: 24 Aug 2026.*
