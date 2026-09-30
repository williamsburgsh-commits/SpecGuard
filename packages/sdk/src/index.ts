import { Connection, Keypair } from "@solana/web3.js";
import {
  encodeActionMemo,
  encodeHeartbeatMemo,
  encodePolicyMemo,
  evaluatePolicy,
  hashPolicy,
  PolicySchema,
  type ActionSnapshot,
  type AgentStatus,
  type Policy,
  type TxSnapshot,
} from "@specguardxyz/core";
import { RegistryClient } from "./client.js";
import { keypairFromSecret, sendMemoTransaction } from "./memo.js";
import {
  DEFAULT_API_URL,
  DEFAULT_RPC_URL,
  SpecGuardError,
  type ActionInput,
  type AgentStatusResult,
  type MemoTxResult,
  type PreCheckInput,
  type PreCheckResult,
  type RegisterResult,
  type SpecGuardOptions,
} from "./types.js";

export * from "./types.js";
export { RegistryClient } from "./client.js";
export { keypairFromSecret, memoInstruction, sendMemoTransaction } from "./memo.js";
export type {
  ActionSnapshot,
  AgentStatus,
  AgentType,
  Policy,
  PolicyV1,
  PolicyV2,
  TxSnapshot,
} from "@specguardxyz/core";
export { PolicySchema, PolicyV2Schema, evaluatePolicy, hashPolicy } from "@specguardxyz/core";

export class SpecGuard {
  private readonly keypair?: Keypair;
  private readonly walletAddress: string;
  private readonly connection: Connection;
  private readonly registry: RegistryClient;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private cachedPolicy?: Policy;

  constructor(options: SpecGuardOptions) {
    if (!options.keypair && !options.wallet) {
      throw new SpecGuardError("Provide either a keypair or a wallet address");
    }
    this.keypair = options.keypair;
    this.walletAddress =
      options.keypair?.publicKey.toBase58() ?? (options.wallet as string);
    this.connection = new Connection(options.rpcUrl ?? DEFAULT_RPC_URL, "confirmed");
    this.registry = new RegistryClient(
      (options.apiUrl ?? DEFAULT_API_URL).replace(/\/+$/, ""),
    );
  }

  /** Builds an instance from a base58 or JSON-array secret key. */
  static fromSecretKey(
    secret: string,
    options: Omit<SpecGuardOptions, "keypair" | "wallet"> = {},
  ): SpecGuard {
    return new SpecGuard({ ...options, keypair: keypairFromSecret(secret) });
  }

  get wallet(): string {
    return this.walletAddress;
  }

  private requireKeypair(action: string): Keypair {
    if (!this.keypair) {
      throw new SpecGuardError(
        `${action} needs a keypair — construct SpecGuard with one to sign transactions`,
      );
    }
    return this.keypair;
  }

  private validatePolicy(input: unknown): Policy {
    const result = PolicySchema.safeParse(input);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      throw new SpecGuardError(`Invalid policy: ${issues}`);
    }
    return result.data;
  }

  /**
   * Publishes the policy onchain and registers it with the registry. The wallet
   * must hold $GUARD, and the policy memo transaction is the proof of record.
   */
  async register(policyInput: unknown): Promise<RegisterResult> {
    const keypair = this.requireKeypair("register");
    const policy = this.validatePolicy(policyInput);
    const policyHash = hashPolicy(policy);

    const tx = await sendMemoTransaction(
      this.connection,
      keypair,
      encodePolicyMemo(policy),
    );

    let confirmed = false;
    let confirmError: string | undefined;
    let embedHtml: string | undefined;
    try {
      const body = await this.registry.confirmRegistration({
        wallet: this.walletAddress,
        signature: tx.signature,
        policyHash,
      });
      confirmed = true;
      if (typeof body.embedHtml === "string") embedHtml = body.embedHtml;
    } catch (e) {
      confirmError = e instanceof Error ? e.message : String(e);
    }

    this.cachedPolicy = policy;
    return {
      ...tx,
      policy,
      policyHash,
      confirmed,
      ...(confirmError != null ? { confirmError } : {}),
      ...(embedHtml != null ? { embedHtml } : {}),
    };
  }

  /** Publishes one heartbeat memo. */
  async heartbeat(timestampSec?: number): Promise<MemoTxResult> {
    const keypair = this.requireKeypair("heartbeat");
    const ts = timestampSec ?? Math.floor(Date.now() / 1000);
    return sendMemoTransaction(this.connection, keypair, encodeHeartbeatMemo(ts));
  }

  /**
   * Publishes a heartbeat now and then on an interval. Defaults to the agent's
   * registered interval, halved, so a single failed beat does not trip the
   * registry's staleness check.
   */
  async startHeartbeat(options?: {
    intervalSec?: number;
    onError?: (e: unknown) => void;
    onBeat?: (result: MemoTxResult) => void;
  }): Promise<void> {
    if (this.heartbeatTimer) return;
    this.requireKeypair("startHeartbeat");

    let intervalSec = options?.intervalSec;
    if (intervalSec == null) {
      const policy = await this.policy();
      intervalSec = policy
        ? Math.max(60, Math.floor(policy.heartbeatIntervalSec / 2))
        : 150;
    }

    const beat = async (): Promise<void> => {
      try {
        const result = await this.heartbeat();
        options?.onBeat?.(result);
      } catch (e) {
        options?.onError?.(e);
      }
    };

    await beat();
    this.heartbeatTimer = setInterval(() => void beat(), intervalSec * 1000);
    this.heartbeatTimer.unref?.();
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /** Publishes an ACTION memo, creating an onchain record of non-trading work. */
  async logAction(action: ActionInput): Promise<MemoTxResult> {
    const keypair = this.requireKeypair("logAction");
    const memoText = encodeActionMemo({
      type: action.type,
      ts: Math.floor(Date.now() / 1000),
      ...(action.contentHash != null ? { contentHash: action.contentHash } : {}),
      ...(action.platform != null ? { platform: action.platform } : {}),
      ...(action.tool != null ? { tool: action.tool } : {}),
    });
    return sendMemoTransaction(this.connection, keypair, memoText);
  }

  /** The agent's registered policy, fetched once and cached. */
  async policy(options?: { refresh?: boolean }): Promise<Policy | null> {
    if (this.cachedPolicy && !options?.refresh) return this.cachedPolicy;
    const status = await this.status();
    if (status.policy) this.cachedPolicy = status.policy;
    return status.policy;
  }

  /**
   * Evaluates a proposed action against the registered policy before it runs.
   * Check this and skip the action when `allowed` is false.
   */
  async preCheck(input: PreCheckInput): Promise<PreCheckResult> {
    const policy = await this.policy();
    if (!policy) {
      throw new SpecGuardError(
        `${this.walletAddress} has no registered policy — call register() first`,
      );
    }
    const nowSec = Math.floor(Date.now() / 1000);

    const transactions: TxSnapshot[] =
      input.spendSol != null || input.programIds != null
        ? [
            {
              signature: "pending",
              spendSol: input.spendSol ?? 0,
              programIds: input.programIds ?? [],
              timestampSec: nowSec,
            },
          ]
        : [];
    const actions: ActionSnapshot[] = input.type
      ? [
          {
            type: input.type,
            ...(input.tool != null ? { tool: input.tool } : {}),
            ...(input.platform != null ? { platform: input.platform } : {}),
            timestampSec: nowSec,
          },
        ]
      : [];

    // Heartbeat and drawdown are the registry's judgement; this answers only
    // "would this one action breach the policy?", so metrics stay neutral.
    const result = evaluatePolicy(policy, {
      metrics: {
        peakEquityUsdc: 0,
        currentEquityUsdc: 0,
        lastHeartbeatAtSec: nowSec,
        nowSec,
      },
      transactions,
      actions,
    });

    return {
      allowed: result.status === "GREEN",
      reasons: result.breachReasons,
    };
  }

  /** Current registry view of this agent. */
  async status(): Promise<AgentStatusResult> {
    const body = await this.registry.getAgent(this.walletAddress);
    const agent = (body.agent ?? {}) as Record<string, unknown>;
    const policyRow = agent.policy as Record<string, unknown> | null | undefined;
    const parsed = policyRow?.raw != null ? PolicySchema.safeParse(policyRow.raw) : null;

    return {
      wallet: typeof agent.wallet === "string" ? agent.wallet : this.walletAddress,
      name: typeof agent.name === "string" ? agent.name : "",
      status: (agent.status === "RED" ? "RED" : "GREEN") as AgentStatus,
      ...(typeof agent.agentType === "string" ? { agentType: agent.agentType } : {}),
      lastHeartbeatAt:
        typeof agent.lastHeartbeatAt === "string" ? agent.lastHeartbeatAt : null,
      policy: parsed?.success ? parsed.data : null,
      raw: agent,
    };
  }

  /** Asks the registry to re-evaluate this agent now. */
  async verify(): Promise<Record<string, unknown>> {
    return this.registry.verifyAgent(this.walletAddress);
  }

  /** Reads any other agent's status — use it before trusting a counterparty. */
  async statusOf(wallet: string): Promise<Record<string, unknown>> {
    return this.registry.getAgent(wallet);
  }
}
