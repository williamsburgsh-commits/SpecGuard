import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  encodeActionMemo,
  encodeHeartbeatMemo,
  encodePolicyMemo,
  evaluatePolicy,
  hashPolicy,
  PolicySchema,
  type ActionSnapshot,
  type Policy,
  type TxSnapshot,
} from "@specguardxyz/core";
import { SpecGuardApi, SpecGuardApiError } from "./lib/api.js";
import { buildUnsignedMemoTx, parseKeypair, sendMemo } from "./lib/rpc.js";
import type { SpecGuardMcpConfig } from "./lib/config.js";

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ ok: false, error: message }, null, 2) }],
    isError: true,
  };
}

function errorMessage(e: unknown): string {
  if (e instanceof SpecGuardApiError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

/** Runs a handler, converting any throw into an MCP error result. */
async function guarded(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (e) {
    return fail(errorMessage(e));
  }
}

const walletSchema = z
  .string()
  .min(32)
  .max(44)
  .describe("Solana wallet address (base58)");

const keypairSchema = z
  .string()
  .min(1)
  .describe(
    "The agent's signing key as a base58 secret key or a JSON byte array. Never stored — used only to sign this one transaction.",
  );

const policyInputSchema = z
  .record(z.unknown())
  .describe(
    'A SpecGuard policy object. V2 example: {"version":2,"name":"MyAgent","type":"social","heartbeatIntervalSec":300,"spendLimits":{"perTxSol":0.5},"socialLimits":{"maxPostsPerDay":20,"allowDMs":false}}',
  );

const actionInputSchema = z.object({
  type: z
    .string()
    .min(1)
    .describe('Action type, e.g. "social_post", "social_dm", "api_call", "swap"'),
  tool: z.string().optional().describe("Tool or MCP tool name used for this action"),
  platform: z.string().optional().describe('Platform, e.g. "x", "telegram"'),
  contentHash: z
    .string()
    .optional()
    .describe("Hash of the action's content, so the memo stays small but provable"),
});

function parsePolicyInput(input: Record<string, unknown>): Policy {
  const result = PolicySchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid policy: ${issues}`);
  }
  return result.data;
}

/** Pulls the agent's onchain-published policy out of the registry response. */
function policyFromAgentResponse(body: Record<string, unknown>): Policy {
  const agent = body.agent;
  if (!agent || typeof agent !== "object") {
    throw new Error("Registry response did not include an agent");
  }
  const policy = (agent as Record<string, unknown>).policy;
  if (!policy || typeof policy !== "object") {
    throw new Error("Agent has no current policy — register it first");
  }
  const raw = (policy as Record<string, unknown>).raw;
  const parsed = PolicySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "Agent's stored policy could not be parsed — it may predate the current policy schema",
    );
  }
  return parsed.data;
}

function heartbeatSecFromAgent(body: Record<string, unknown>): number | null {
  const agent = body.agent as Record<string, unknown> | undefined;
  const at = agent?.lastHeartbeatAt;
  if (typeof at !== "string") return null;
  const ms = Date.parse(at);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

export function registerTools(server: McpServer, config: SpecGuardMcpConfig): void {
  const api = new SpecGuardApi(config.apiUrl);

  server.registerTool(
    "specguard_register",
    {
      title: "Register an agent with SpecGuard",
      description:
        "Validates a SpecGuard policy and returns the onchain memo plus an unsigned transaction for the agent's wallet to sign. Publishing that transaction is what registers the agent. Registration requires the wallet to hold $GUARD.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        wallet: walletSchema,
        policy: policyInputSchema,
      },
    },
    async ({ wallet, policy }) =>
      guarded(async () => {
        const parsed = parsePolicyInput(policy);
        const memoText = encodePolicyMemo(parsed);
        const policyHash = hashPolicy(parsed);
        const unsigned = await buildUnsignedMemoTx(config.rpcUrl, wallet, memoText);
        return ok({
          ok: true,
          wallet,
          policy: parsed,
          policyHash,
          memoText,
          transactionBase64: unsigned.transactionBase64,
          nextStep:
            "Sign and send transactionBase64 from the agent's wallet, then POST the signature and policyHash to /api/register/confirm.",
          confirmUrl: `${config.apiUrl}/api/register/confirm`,
        });
      }),
  );

  server.registerTool(
    "specguard_heartbeat",
    {
      title: "Publish a SpecGuard heartbeat",
      description:
        "Publishes a heartbeat memo onchain, proving the agent is alive. Call this at least as often as the policy's heartbeatIntervalSec or the agent is marked RED.",
      inputSchema: {
        keypair: keypairSchema,
        timestampSec: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Unix seconds. Defaults to now."),
      },
    },
    async ({ keypair, timestampSec }) =>
      guarded(async () => {
        const kp = parseKeypair(keypair);
        const ts = timestampSec ?? Math.floor(Date.now() / 1000);
        const result = await sendMemo(config.rpcUrl, kp, encodeHeartbeatMemo(ts));
        return ok({ ok: true, timestampSec: ts, ...result });
      }),
  );

  server.registerTool(
    "specguard_log_action",
    {
      title: "Log an agent action onchain",
      description:
        "Publishes an ACTION memo, creating a verifiable record that the agent took this action. Use it for non-trading work: posts, outbound messages, paid API calls.",
      inputSchema: {
        keypair: keypairSchema,
        action: actionInputSchema,
      },
    },
    async ({ keypair, action }) =>
      guarded(async () => {
        const kp = parseKeypair(keypair);
        const ts = Math.floor(Date.now() / 1000);
        const memoText = encodeActionMemo({
          type: action.type,
          ts,
          ...(action.contentHash != null ? { contentHash: action.contentHash } : {}),
          ...(action.platform != null ? { platform: action.platform } : {}),
          ...(action.tool != null ? { tool: action.tool } : {}),
        });
        const result = await sendMemo(config.rpcUrl, kp, memoText);
        return ok({ ok: true, action: { ...action, ts }, ...result });
      }),
  );

  server.registerTool(
    "specguard_precheck",
    {
      title: "Check an action against an agent's policy",
      description:
        "Evaluates a proposed action or transaction against the agent's onchain policy BEFORE it happens. Returns allowed:false with reasons when the action would breach the policy. Call this before any spend, trade, or post.",
      inputSchema: {
        wallet: walletSchema,
        action: actionInputSchema.optional().describe("The non-trading action to check"),
        spendSol: z
          .number()
          .nonnegative()
          .optional()
          .describe("SOL this action would spend, checked against the per-tx cap"),
        programIds: z
          .array(z.string())
          .optional()
          .describe("Solana programs this transaction would touch, checked against allowed venues"),
      },
    },
    async ({ wallet, action, spendSol, programIds }) =>
      guarded(async () => {
        const body = await api.getAgent(wallet);
        const policy = policyFromAgentResponse(body);
        const nowSec = Math.floor(Date.now() / 1000);

        // Heartbeat and drawdown are the registry's job to judge; this call
        // answers only "would this specific action breach the policy?", so the
        // metrics are neutral.
        const transactions: TxSnapshot[] =
          spendSol != null || programIds != null
            ? [
                {
                  signature: "pending",
                  spendSol: spendSol ?? 0,
                  programIds: programIds ?? [],
                  timestampSec: nowSec,
                },
              ]
            : [];
        const actions: ActionSnapshot[] = action
          ? [
              {
                type: action.type,
                ...(action.tool != null ? { tool: action.tool } : {}),
                ...(action.platform != null ? { platform: action.platform } : {}),
                timestampSec: nowSec,
              },
            ]
          : [];

        const result = evaluatePolicy(policy, {
          metrics: {
            peakEquityUsdc: 0,
            currentEquityUsdc: 0,
            lastHeartbeatAtSec: heartbeatSecFromAgent(body) ?? nowSec,
            nowSec,
          },
          transactions,
          actions,
        });

        return ok({
          ok: true,
          wallet,
          allowed: result.status === "GREEN",
          reasons: result.breachReasons,
          policyName: policy.name,
          checked: {
            ...(action ? { action } : {}),
            ...(spendSol != null ? { spendSol } : {}),
            ...(programIds != null ? { programIds } : {}),
          },
        });
      }),
  );

  server.registerTool(
    "specguard_status",
    {
      title: "Get an agent's SpecGuard status",
      description:
        "Returns an agent's current GREEN/RED status, policy, last heartbeat and PnL from the SpecGuard registry. Works for any registered wallet — use it to decide whether to trust an agent.",
      inputSchema: { wallet: walletSchema },
    },
    async ({ wallet }) =>
      guarded(async () => {
        const body = await api.getAgent(wallet);
        return ok({ ok: true, ...body });
      }),
  );

  server.registerTool(
    "specguard_verify",
    {
      title: "Run a SpecGuard verification check",
      description:
        "Triggers an on-demand verification of a registered agent: refreshes its PnL, re-evaluates its policy, and flips it to RED onchain if it is in breach. Rate-limited by the registry.",
      inputSchema: { wallet: walletSchema },
    },
    async ({ wallet }) =>
      guarded(async () => {
        const body = await api.verifyAgent(wallet);
        return ok({ ok: true, ...body });
      }),
  );

  server.registerTool(
    "specguard_list_agents",
    {
      title: "List SpecGuard-registered agents",
      description:
        "Returns every agent in the SpecGuard registry with its status and type. Use it to find verified agents or survey the registry.",
      inputSchema: {},
    },
    async () =>
      guarded(async () => {
        const body = await api.listAgents();
        return ok({ ok: true, ...body });
      }),
  );
}
