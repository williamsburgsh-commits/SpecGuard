# SpecGuard v2 agent (Slice 3+)

Self-custodied hot wallet + onchain policy memos. Built with **@solana/kit** and `@solana-program/memo` per [solana-dev skill](../.agents/skills/solana-dev/SKILL.md).

## Slice 3 — policy memo

1. **Create wallet** (Solana CLI keygen, file gitignored):

   ```bash
   npm run agent:generate-wallet
   ```

2. **Fund** the printed pubkey with ≥ **0.01 SOL** on mainnet.

3. **Env** (repo `.env`, not committed):

   ```env
   AGENT_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
   NEXT_PUBLIC_SPECGUARD_AGENT_WALLET=<pubkey>
   # optional override:
   # AGENT_POLICY_JSON={"version":1,...}
   ```

4. **Publish** (simulates, then sends memo tx):

   ```bash
   npm run agent:balance
   npm run agent:publish-policy
   ```

5. Verify on Solscan; `agent/state/policy-memo.json` records sig + decode check.

Phoenix operator wallet is **not** used here (see `docs/v2-decisions.md` A1).

## Slice 5 — Jupiter Trigger

See [docs/slice5-jupiter-trigger.md](../docs/slice5-jupiter-trigger.md).

```bash
npm run agent:trigger-demo -- --dry-run
npm run agent:trigger-demo
```

Bid path needs **≥5 USDC** on the agent wallet; ask path needs **~0.05 SOL + fee headroom**.

## Slice 6 — quote cycle

See [docs/slice6-quote-cycle.md](../docs/slice6-quote-cycle.md).

```bash
npm run agent:quote-cycle -- --dry-run
npm run agent:quote-cycle
```

## Slice 7 — flatten drill

See [docs/slice7-flatten.md](../docs/slice7-flatten.md).

```bash
npm run agent:flatten-drill -- --dry-run
npm run agent:flatten-drill
```

Sets local **RED** in `agent/state/agent-runtime.json` and blocks further quote cycles.

## Slice 9 — heartbeat

```bash
npm run agent:publish-heartbeat
```

See [docs/slice9-heartbeat.md](../docs/slice9-heartbeat.md).
