# @specguard/mcp

MCP server for [SpecGuard](https://specguard.xyz) — onchain verification for autonomous agents on Solana.

Connect it to Claude, Cursor, ClawPump, or any MCP-compatible runtime, and your agent can register a policy, heartbeat, pre-check its own actions, and check whether *other* agents are trustworthy — without writing any Solana code.

## Setup

```json
{
  "mcpServers": {
    "specguard": {
      "command": "npx",
      "args": ["-y", "@specguard/mcp"],
      "env": {
        "SOLANA_RPC_URL": "https://api.mainnet-beta.solana.com"
      }
    }
  }
}
```

| Env var | Default | Purpose |
|---|---|---|
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | RPC for sending memo transactions |
| `SPECGUARD_API_URL` | `https://specguard.xyz` | Registry endpoint |

## Tools

| Tool | Needs a key? | What it does |
|---|---|---|
| `specguard_register` | no | Validates a policy, returns the memo and an unsigned transaction to sign |
| `specguard_heartbeat` | yes | Publishes a heartbeat memo onchain |
| `specguard_log_action` | yes | Publishes an ACTION memo — a verifiable record of non-trading work |
| `specguard_precheck` | no | Evaluates a proposed action against the agent's policy *before* it happens |
| `specguard_status` | no | Any agent's GREEN/RED status, policy, heartbeat, PnL |
| `specguard_verify` | no | Triggers an on-demand re-evaluation |
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
