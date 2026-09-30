# @specguardxyz/sdk

Make any autonomous agent verifiable onchain.

Your agent publishes its rules to Solana. SpecGuard watches. If the agent breaks its own rules, that breach is provable onchain — permanently, by anyone. GREEN means it's following the rules. RED means it got caught.

No trust required.

## Install

From the SpecGuard monorepo (npm publish coming soon):

```bash
git clone https://github.com/williamsburgsh-commits/SpecGuard.git
cd SpecGuard && npm install && npm run build -w @specguardxyz/sdk
```

For Claude / Cursor / ClawPump without a custom Node app, use **`npx -y @specguardxyz/mcp`** instead.

## Three-line integration

```ts
import { SpecGuard } from "@specguardxyz/sdk";

const guard = SpecGuard.fromSecretKey(process.env.AGENT_SECRET_KEY!);

await guard.register({
  version: 2,
  name: "MyAgent",
  type: "social",
  heartbeatIntervalSec: 300,
  spendLimits: { perTxSol: 0.5 },
  socialLimits: { maxPostsPerDay: 20, allowDMs: false, platforms: ["x"] },
});

await guard.startHeartbeat();
```

That's it. Your agent is now in the public registry with a live GREEN/RED badge.

## Pre-check before acting

The point of a policy is that it *blocks* things. Check before you act:

```ts
const check = await guard.preCheck({ type: "social_post", platform: "x" });
if (!check.allowed) {
  console.log("blocked:", check.reasons); // ["social_limit_exceeded"]
  return;
}
await postToX(content);
await guard.logAction({ type: "social_post", platform: "x", contentHash: sha256(content) });
```

For trades, pass the spend and the programs you'll touch:

```ts
const check = await guard.preCheck({
  spendSol: 0.3,
  programIds: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"],
});
```

## Agent types

A policy declares what kind of agent this is, and only the relevant limits apply.

| Type | Typical limits |
|---|---|
| `trader` | `maxDrawdownPct`, `allowedVenues`, `spendLimits` |
| `social` | `socialLimits` (posts/day, DMs, platforms) |
| `data` | `allowedTools`, `spendLimits` |
| `infra` | `spendLimits`, `deniedActions` |
| `general` | any combination |

Every type requires `heartbeatIntervalSec` and `spendLimits.perTxSol`. Everything else is optional.

## Policy reference

```ts
{
  version: 2,
  name: string,                    // max 64 chars
  type: "trader" | "social" | "data" | "infra" | "general",
  heartbeatIntervalSec: number,    // min 60
  spendLimits: {
    perTxSol: number,              // required
    dailySol?: number,
  },
  maxDrawdownPct?: number,         // 0–100
  allowedVenues?: ("system" | "jupiter-swap" | "jupiter-trigger" | "spl-token")[],
  socialLimits?: {
    maxPostsPerDay?: number,
    allowDMs?: boolean,
    platforms?: string[],
  },
  allowedTools?: string[],
  deniedActions?: string[],
}
```

## Checking someone else's agent

Before you let another agent touch your money:

```ts
const guard = new SpecGuard({ wallet: myWallet });
const other = await guard.statusOf("SomeOtherAgentWallet...");
// { agent: { status: "RED", breachReason: "max_drawdown", proofSig: "..." } }
```

## API

| Method | Needs a key? | What it does |
|---|---|---|
| `register(policy)` | yes | Publishes the policy memo onchain and registers it |
| `heartbeat()` | yes | Publishes one heartbeat memo |
| `startHeartbeat(opts?)` | yes | Beats now, then on an interval (defaults to half the policy interval) |
| `stopHeartbeat()` | no | Clears the timer |
| `logAction(action)` | yes | Publishes an ACTION memo |
| `preCheck(input)` | no | Evaluates an action against the policy — returns `{ allowed, reasons }` |
| `policy(opts?)` | no | The registered policy, cached |
| `status()` | no | This agent's registry record |
| `statusOf(wallet)` | no | Any agent's registry record |
| `verify()` | no | Asks the registry to re-evaluate now |

## Read-only mode

Omit the keypair to inspect without signing:

```ts
const guard = new SpecGuard({ wallet: "SomeAgentWallet..." });
await guard.status();   // works
await guard.heartbeat(); // throws — needs a keypair
```

## Configuration

```ts
new SpecGuard({
  keypair,                                  // or wallet
  rpcUrl: "https://api.mainnet-beta.solana.com",
  apiUrl: "https://specguard.xyz",
});
```

## Breach reasons

`max_drawdown` · `max_spend_per_tx` · `daily_spend_exceeded` · `disallowed_venue` · `disallowed_tool` · `denied_action` · `social_limit_exceeded` · `heartbeat_missed`

## Registration requires $GUARD

The registry gates registration on a minimum `$GUARD` balance for sybil resistance. `register()` publishes the memo onchain regardless, then reports whether the registry accepted it:

```ts
const result = await guard.register(policy);
if (!result.confirmed) console.log(result.confirmError);
```

## Also available as an MCP server

If your agent runs in Claude, Cursor, ClawPump, or anything else that speaks MCP, you can skip the SDK entirely — see `@specguardxyz/mcp`.

## License

MIT
