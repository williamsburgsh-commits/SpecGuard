import { PolicySchema, type Policy } from "../policy/schema.js";
import { ATTEST_VERDICTS, MEMO_PREFIX, type AttestVerdict } from "./encode.js";

export type DecodedMemo =
  | { kind: "policy"; policy: Policy; rawJson: string }
  | { kind: "heartbeat"; timestampSec: number }
  | { kind: "flatten"; reason: string; sigs: string[] }
  | { kind: "reset"; priorProofSig: string; note?: string }
  | {
      kind: "action";
      type: string;
      ts: number;
      contentHash?: string;
      platform?: string;
      tool?: string;
    }
  | {
      kind: "scope";
      actions: string[];
      deniedActions?: string[];
      tools?: string[];
      spendLimitSol?: number;
    }
  | {
      kind: "attest";
      targetWallet: string;
      verdict: AttestVerdict;
      ts: number;
      note?: string;
    }
  | {
      kind: "delegate";
      delegateWallet: string;
      permissions: string[];
      expirySec?: number;
    };

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((v) => typeof v === "string")) return null;
  return value as string[];
}

function positiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
}

export function decodeMemo(memoText: string): DecodedMemo | null {
  const trimmed = memoText.trim();
  if (!trimmed.startsWith(MEMO_PREFIX)) return null;
  const rest = trimmed.slice(MEMO_PREFIX.length);
  const colon = rest.indexOf(":");
  if (colon === -1) return null;
  const tag = rest.slice(0, colon);
  const payload = rest.slice(colon + 1);

  switch (tag) {
    case "POLICY": {
      const tryParse = (raw: string) => {
        const parsed = JSON.parse(raw) as unknown;
        const policy = PolicySchema.parse(parsed);
        return { kind: "policy" as const, policy, rawJson: raw };
      };
      try {
        return tryParse(payload);
      } catch {
        /* logs sometimes escape quotes — undo and retry */
      }
      if (payload.includes('\\"')) {
        try {
          return tryParse(payload.replace(/\\"/g, '"'));
        } catch {
          return null;
        }
      }
      return null;
    }
    case "HB": {
      const ts = Number(payload);
      if (!Number.isFinite(ts) || ts <= 0) return null;
      return { kind: "heartbeat", timestampSec: Math.floor(ts) };
    }
    case "FLATTEN": {
      const obj = parseJsonObject(payload);
      if (!obj) return null;
      const reason = obj.reason;
      const sigs = stringArray(obj.sigs);
      if (typeof reason !== "string" || sigs == null) return null;
      return { kind: "flatten", reason, sigs };
    }
    case "RESET": {
      const obj = parseJsonObject(payload);
      if (!obj) return null;
      const priorProofSig = obj.priorProofSig;
      if (typeof priorProofSig !== "string" || !priorProofSig) return null;
      const note = obj.note;
      return {
        kind: "reset",
        priorProofSig,
        ...(typeof note === "string" ? { note } : {}),
      };
    }
    case "ACTION": {
      const obj = parseJsonObject(payload);
      if (!obj) return null;
      const type = obj.type;
      const ts = positiveInt(obj.ts);
      if (typeof type !== "string" || !type || ts == null) return null;
      return {
        kind: "action",
        type,
        ts,
        ...(typeof obj.contentHash === "string"
          ? { contentHash: obj.contentHash }
          : {}),
        ...(typeof obj.platform === "string" ? { platform: obj.platform } : {}),
        ...(typeof obj.tool === "string" ? { tool: obj.tool } : {}),
      };
    }
    case "SCOPE": {
      const obj = parseJsonObject(payload);
      if (!obj) return null;
      const actions = stringArray(obj.actions);
      if (actions == null) return null;
      const deniedActions = stringArray(obj.deniedActions);
      const tools = stringArray(obj.tools);
      const spendLimitSol = obj.spendLimitSol;
      return {
        kind: "scope",
        actions,
        ...(deniedActions != null ? { deniedActions } : {}),
        ...(tools != null ? { tools } : {}),
        ...(typeof spendLimitSol === "number" && Number.isFinite(spendLimitSol)
          ? { spendLimitSol }
          : {}),
      };
    }
    case "ATTEST": {
      const obj = parseJsonObject(payload);
      if (!obj) return null;
      const targetWallet = obj.targetWallet;
      const verdict = obj.verdict;
      const ts = positiveInt(obj.ts);
      if (typeof targetWallet !== "string" || !targetWallet) return null;
      if (
        typeof verdict !== "string" ||
        !ATTEST_VERDICTS.includes(verdict as AttestVerdict)
      ) {
        return null;
      }
      if (ts == null) return null;
      return {
        kind: "attest",
        targetWallet,
        verdict: verdict as AttestVerdict,
        ts,
        ...(typeof obj.note === "string" ? { note: obj.note } : {}),
      };
    }
    case "DELEGATE": {
      const obj = parseJsonObject(payload);
      if (!obj) return null;
      const delegateWallet = obj.delegateWallet;
      const permissions = stringArray(obj.permissions);
      if (typeof delegateWallet !== "string" || !delegateWallet) return null;
      if (permissions == null) return null;
      const expirySec = positiveInt(obj.expirySec);
      return {
        kind: "delegate",
        delegateWallet,
        permissions,
        ...(expirySec != null ? { expirySec } : {}),
      };
    }
    default:
      return null;
  }
}
