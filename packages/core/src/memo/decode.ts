import { PolicyV1Schema, type PolicyV1 } from "../policy/schema.js";
import { MEMO_PREFIX } from "./encode.js";

export type DecodedMemo =
  | { kind: "policy"; policy: PolicyV1; rawJson: string }
  | { kind: "heartbeat"; timestampSec: number }
  | { kind: "flatten"; reason: string; sigs: string[] }
  | { kind: "reset"; priorProofSig: string; note?: string };

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
        const policy = PolicyV1Schema.parse(parsed);
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
      const sigs = obj.sigs;
      if (typeof reason !== "string" || !Array.isArray(sigs)) return null;
      if (!sigs.every((s) => typeof s === "string")) return null;
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
    default:
      return null;
  }
}
