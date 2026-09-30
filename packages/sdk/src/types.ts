import type { Keypair } from "@solana/web3.js";
import type { AgentStatus, Policy } from "@specguardxyz/core";

export const DEFAULT_API_URL = "https://specguard.xyz";
export const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

export interface SpecGuardOptions {
  /** The agent's signing key. Required for register/heartbeat/logAction. */
  keypair?: Keypair;
  /** Read-only wallet to inspect when no keypair is supplied. */
  wallet?: string;
  rpcUrl?: string;
  apiUrl?: string;
}

export interface ActionInput {
  /** e.g. "social_post", "social_dm", "api_call". */
  type: string;
  tool?: string;
  platform?: string;
  contentHash?: string;
}

export interface PreCheckInput extends Partial<ActionInput> {
  /** SOL this action would spend, checked against the per-tx cap. */
  spendSol?: number;
  /** Programs the transaction would touch, checked against allowed venues. */
  programIds?: string[];
}

export interface PreCheckResult {
  allowed: boolean;
  reasons: string[];
}

export interface MemoTxResult {
  signature: string;
  wallet: string;
  memoText: string;
  solscanUrl: string;
}

export interface RegisterResult extends MemoTxResult {
  policy: Policy;
  policyHash: string;
  /** Set when the registry accepted the registration. */
  confirmed: boolean;
  confirmError?: string;
  embedHtml?: string;
}

export interface AgentStatusResult {
  wallet: string;
  name: string;
  status: AgentStatus;
  agentType?: string;
  lastHeartbeatAt: string | null;
  policy: Policy | null;
  raw: Record<string, unknown>;
}

export class SpecGuardError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SpecGuardError";
  }
}
