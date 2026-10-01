import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  encodeActionMemo,
  encodeHeartbeatMemo,
  PolicySchema,
  type Policy,
} from "@specguardxyz/core";
import {
  assertGuardMinimum,
  evaluatePrecheck,
  spendHistoryFromResponse,
} from "./checks.js";
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

async function indexConfirmedMemo(
  api: SpecGuardApi,
  wallet: string,
  signature: string,
): Promise<{ indexed: boolean; indexError?: string }> {
  try {
    await api.reportMemo(wallet, signature);
    return { indexed: true };
  } catch (e) {
    return { indexed: false, indexError: errorMessage(e) };
  }
}

export function registerTools(server: McpServer, config: SpecGuardMcpConfig): void {
  const api = new SpecGuardApi(config.apiUrl);

  server.registerTool(
    "specguard_register",
    {
      title: "Register an agent with SpecGuard",
      description:
        "Checks the wallet holds the $GUARD minimum, then returns an unsigned policy memo transaction. The agent is not registered until that transaction is signed and confirmed at confirmUrl.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        wallet: walletSchema,
        policy: policyInputSchema,
      },
    },
    async ({ wallet, policy }) =>
      guarded(async () => {
        const parsed = parsePolicyInput(policy);
        const prepared = await api.prepareRegistration({ wallet, policy: parsed });
        assertGuardMinimum(prepared);
        const memoText = prepared.memoText;
        const policyHash = prepared.policyHash;
        if (typeof memoText !== "string" || typeof policyHash !== "string") {
          throw new Error("Registry prepare response did not include a memo");
        }
        const unsigned = await buildUnsignedMemoTx(config.rpcUrl, wallet, memoText);
        return ok({
          ok: true,
          registered: false,
          wallet,
          policy: parsed,
          policyHash,
          memoText,
          meetsMinimum: true,
          transactionBase64: unsigned.transactionBase64,
          nextStep:
            "Sign and send transactionBase64 from the agent's wallet, then POST the signature and policyHash to confirmUrl. The agent is not registered until that confirm call succeeds.",
          confirmUrl: `${config.apiUrl}/api/register/confirm`,
        });
      }),
  );

  server.registerTool(
    "specguard_heartbeat",
    {
      title: "Publish a SpecGuard heartbeat",
      description:
        "Publishes a heartbeat memo onchain and asks the registry to index it. Call this at least as often as the policy's heartbeatIntervalSec. indexed:false means the chain send succeeded but the registry has not recorded it yet.",
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
        const indexed = await indexConfirmedMemo(api, result.wallet, result.signature);
        return ok({ ok: true, timestampSec: ts, ...result, ...indexed });
      }),
  );

  server.registerTool(
    "specguard_log_action",
    {
      title: "Log an agent action onchain",
      description:
        "Publishes an ACTION memo and asks the registry to index it. indexed:false means the chain send succeeded but the registry has not recorded it yet.",
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
        const indexed = await indexConfirmedMemo(api, result.wallet, result.signature);
        return ok({ ok: true, action: { ...action, ts }, ...result, ...indexed });
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
        const nowSec = Math.floor(Date.now() / 1000);
        let history: ReturnType<typeof spendHistoryFromResponse> = null;
        try {
          history = spendHistoryFromResponse(await api.getHistory(wallet), nowSec);
        } catch {
          history = null;
        }
        const outcome = evaluatePrecheck(
          body,
          history,
          {
            ...(action ? { action } : {}),
            ...(spendSol != null ? { spendSol } : {}),
            ...(programIds != null ? { programIds } : {}),
          },
          nowSec,
        );

        return ok({
          ok: true,
          wallet,
          ...outcome,
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
        "Re-evaluates a registered agent in the registry and can mark it RED. This writes a registry status event. It does not publish an onchain transaction.",
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
