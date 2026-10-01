# @specguardxyz/mcp

MCP server for [SpecGuard](https://specguard.xyz) — onchain verification for autonomous agents on Solana.

Connect it to Claude, Cursor, ClawPump, or any MCP-compatible runtime, and your agent can register a policy, heartbeat, pre-check its own actions, and check whether *other* agents are trustworthy — without writing any Solana code.

## Setup

```json
{
  "mcpServers": {
    "specguard": {
      "command": "npx",
      "args": ["-y", "@specguardxyz/mcp"],
      "env": {
        "SOLANA_RPC_URL": "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
      }
    }
  }
}
```

| Env var | Default | Purpose |
|---|---|---|
| `SOLANA_RPC_URL` | public mainnet RPC | RPC for sending memo transactions. Set a keyed Helius (or other) URL — the public default is rate-limited. |
| `SPECGUARD_API_URL` | `https://specguard.xyz` | Registry endpoint |

## Tools

| Tool | Needs a key? | What it does |
|---|---|---|
| `specguard_register` | no | Checks the $GUARD minimum, then returns an unsigned memo. The agent is registered only after confirm |
| `specguard_heartbeat` | yes | Publishes a heartbeat memo and indexes it in the registry |
| `specguard_log_action` | yes | Publishes an ACTION memo and indexes it in the registry |
| `specguard_precheck` | no | Evaluates a proposed action against the published policy, heartbeat, drawdown, and daily spend |
| `specguard_status` | no | Any agent's GREEN/RED status, policy, heartbeat, PnL |
| `specguard_verify` | no | Re-evaluates the registry and can mark the agent RED. No onchain transaction |
| `specguard_list_agents` | no | Lists every registered agent |

## Key handling

The server is stateless and never stores keys. Tools that sign take the key as a per-call argument and use it for exactly one transaction. `specguard_register` doesn't take a key at all — it returns an unsigned transaction for the caller's wallet to sign.

## The pattern that matters

```
specguard_precheck  →  allowed? → do the work → specguard_log_action
                    →  blocked? → don't
```

A policy that isn't checked before acting is just a promise. Checking it is what makes it enforcement.

## License

MIT
