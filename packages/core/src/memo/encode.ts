import type { Policy } from "../policy/schema.js";
import { canonicalPolicyJsonAny } from "../policy/hash.js";

export const MEMO_PREFIX = "SPECGUARD:v1:";

export function encodePolicyMemo(policy: Policy): string {
  return `${MEMO_PREFIX}POLICY:${canonicalPolicyJsonAny(policy)}`;
}

export function encodeHeartbeatMemo(timestampSec: number): string {
  return `${MEMO_PREFIX}HB:${timestampSec}`;
}

export interface FlattenMemoPayload {
  reason: string;
  sigs: string[];
}

export function encodeFlattenMemo(payload: FlattenMemoPayload): string {
  const body = JSON.stringify({
    reason: payload.reason,
    sigs: payload.sigs,
  });
  return `${MEMO_PREFIX}FLATTEN:${body}`;
}

export interface ResetMemoPayload {
  priorProofSig: string;
  note?: string;
}

export function encodeResetMemo(payload: ResetMemoPayload): string {
  const body = JSON.stringify({
    priorProofSig: payload.priorProofSig,
    ...(payload.note != null ? { note: payload.note } : {}),
  });
  return `${MEMO_PREFIX}RESET:${body}`;
}

export interface ActionMemoPayload {
  /** e.g. "social_post", "api_call", "transfer". */
  type: string;
  ts: number;
  /** Hash of the action's content, so the payload stays small but provable. */
  contentHash?: string;
  platform?: string;
  tool?: string;
}

export function encodeActionMemo(payload: ActionMemoPayload): string {
  const body = JSON.stringify({
    type: payload.type,
    ts: payload.ts,
    ...(payload.contentHash != null ? { contentHash: payload.contentHash } : {}),
    ...(payload.platform != null ? { platform: payload.platform } : {}),
    ...(payload.tool != null ? { tool: payload.tool } : {}),
  });
  return `${MEMO_PREFIX}ACTION:${body}`;
}

export interface ScopeMemoPayload {
  actions: string[];
  deniedActions?: string[];
  tools?: string[];
  spendLimitSol?: number;
}

export function encodeScopeMemo(payload: ScopeMemoPayload): string {
  const body = JSON.stringify({
    actions: [...payload.actions].sort(),
    ...(payload.deniedActions != null
      ? { deniedActions: [...payload.deniedActions].sort() }
      : {}),
    ...(payload.tools != null ? { tools: [...payload.tools].sort() } : {}),
    ...(payload.spendLimitSol != null
      ? { spendLimitSol: payload.spendLimitSol }
      : {}),
  });
  return `${MEMO_PREFIX}SCOPE:${body}`;
}

export const ATTEST_VERDICTS = ["pass", "fail", "warn"] as const;
export type AttestVerdict = (typeof ATTEST_VERDICTS)[number];

export interface AttestMemoPayload {
  targetWallet: string;
  verdict: AttestVerdict;
  ts: number;
  note?: string;
}

export function encodeAttestMemo(payload: AttestMemoPayload): string {
  const body = JSON.stringify({
    targetWallet: payload.targetWallet,
    verdict: payload.verdict,
    ts: payload.ts,
    ...(payload.note != null ? { note: payload.note } : {}),
  });
  return `${MEMO_PREFIX}ATTEST:${body}`;
}

export interface DelegateMemoPayload {
  delegateWallet: string;
  permissions: string[];
  expirySec?: number;
}

export function encodeDelegateMemo(payload: DelegateMemoPayload): string {
  const body = JSON.stringify({
    delegateWallet: payload.delegateWallet,
    permissions: [...payload.permissions].sort(),
    ...(payload.expirySec != null ? { expirySec: payload.expirySec } : {}),
  });
  return `${MEMO_PREFIX}DELEGATE:${body}`;
}
