# Slice 7 — Flatten drill (mainnet)

## Commands

```bash
npm run test:agent
npm run agent:flatten-drill -- --dry-run
npm run agent:flatten-drill
npm run agent:flatten-drill -- --reason=policy_breach
```

## Sequence

1. Cancel all active Jupiter Trigger orders (one sig each).
2. Swap sellable SOL → USDC (`balance − AGENT_SOL_FEE_RESERVE`), slippage 100 bps then 200 bps retry (J2).
3. Memo `SPECGUARD:v1:FLATTEN:{reason,sigs}` — attestation tx.
4. Write `agent/state/agent-runtime.json` → **RED** (quoting blocked).

## DoD

Three+ sigs on Solscan (cancel(s), swap, flatten memo); memo decodes with `@specguard/core`; local RED state.

**Slice 8** wires Helius → Supabase RED + `proof_sig`.
