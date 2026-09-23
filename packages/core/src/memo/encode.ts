import type { PolicyV1 } from "../policy/schema.js";
import { canonicalPolicyJson } from "../policy/hash.js";

export const MEMO_PREFIX = "SPECGUARD:v1:";

export function encodePolicyMemo(policy: PolicyV1): string {
  return `${MEMO_PREFIX}POLICY:${canonicalPolicyJson(policy)}`;
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
