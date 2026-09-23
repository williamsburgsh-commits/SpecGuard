# Slice 20 — Production flatten drill + freeze

Second full **mainnet** flatten on **production Registry URLs** (Helius → Vercel webhook). Same DoD as [Slice 8](slice8-flatten-red.md). **No buybacks** until NOTES T1–T3 are resolved ([v2-decisions.md](v2-decisions.md)).

## Prerequisites

- Slice 19 deployed: `WEBHOOK_PUBLIC_URL` = production Registry origin (e.g. `https://web-pi-opal-szwuxtcplv.vercel.app` or `https://registry.specguard.xyz`).
- Helius webhook `transactionTypes` includes demo agent wallet; webhook URL points at **`/api/webhooks/helius`** on that host.
- Agent keypair at `AGENT_KEYPAIR_PATH`; Jupiter demo wallet funded for fees + small swap.

## Drill (on chain)

```bash
npm run agent:flatten-drill -- --dry-run --reason=slice20_prod_drill
npm run agent:flatten-drill -- --reason=slice20_prod_drill
```

Writes `logs/flatten/flatten-<timestamp>.json` with cancel / swap / **flatten memo** sigs.

**Do not** use `webhook:replay-flatten` for Slice 20 sign-off — use live Helius delivery to prod (replay is for local/dev only).

## Verify (production DoD)

Wait ~30–120s for Helius, then:

```bash
npm run test:production-flatten
# or
npm run test:production-flatten -- --from-log=logs/flatten/flatten-....json
npm run verify:agent-status
```

Expect:

| Check | Expected |
|-------|----------|
| Supabase `agents.status` | `RED` |
| `status_events` | `flatten_observed`, `proof_sig` = **new** flatten memo tx |
| `GET /api/agents/<wallet>` (prod) | `status: RED` |
| `GET /badge/<wallet>` (prod) | SVG shows RED |
| `first_breach_event_id` | Unchanged (first flatten proof preserved per S2) |

## Announcement log

After drill, copy sigs from flatten JSON or script output into stream/post. Optional repo record:

```bash
# Example — adjust path to latest slice20 flatten log
node -e "const j=require('./logs/flatten/flatten-....json'); console.log(JSON.stringify({slice:20,reason:j.reason,sigs:j.allSigs},null,2))"
```

Store under `logs/slice20/` if you want a frozen audit trail (gitignored logs OK for local only).

## Post-drill / freeze

- **Agent #1:** quoting stays off (local `agent-runtime.json` RED). Operator **RESET** memo is manual (S2) — not required for Slice 20 gate.
- **Phoenix:** unchanged; operator may stay GREEN on terminal (separate product).
- **Buybacks:** deferred (T1–T3).
- **Freeze:** no further v2 scope changes until post-launch issues; tag release / BUILD_LOG when DoD passes.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Flatten on chain, no DB row | Confirm Helius webhook URL = `WEBHOOK_PUBLIC_URL/api/webhooks/helius`; run `npm run test:cron-webhook-sync` |
| `test:production-flatten` fails API | Redeploy Vercel; check env on project |
| If Helius ingests tx before memo logs | `npm run sync:flatten-registry -- logs/flatten/<file>.json` |
