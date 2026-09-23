import { describe, expect, it } from "vitest";
import {
  decodeMemo,
  encodeFlattenMemo,
  encodeHeartbeatMemo,
  encodePolicyMemo,
  encodeResetMemo,
  hashPolicy,
  type PolicyV1,
} from "../src/index.js";

const policy: PolicyV1 = {
  version: 1,
  name: "registry-demo",
  maxDrawdownPct: 15,
  maxSpendPerTxSol: 1,
  allowedVenues: ["jupiter-swap", "jupiter-trigger"],
  heartbeatIntervalSec: 600,
};

describe("memo encode/decode", () => {
  it("round-trips policy memos", () => {
    const memo = encodePolicyMemo(policy);
    expect(memo.startsWith("SPECGUARD:v1:POLICY:")).toBe(true);
    const decoded = decodeMemo(memo);
    expect(decoded?.kind).toBe("policy");
    if (decoded?.kind === "policy") {
      expect(decoded.policy).toEqual(policy);
    }
    expect(hashPolicy(policy)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("round-trips heartbeat", () => {
    const memo = encodeHeartbeatMemo(1_234_567);
    const decoded = decodeMemo(memo);
    expect(decoded).toEqual({ kind: "heartbeat", timestampSec: 1_234_567 });
  });

  it("round-trips flatten", () => {
    const memo = encodeFlattenMemo({
      reason: "max_drawdown",
      sigs: ["abc", "def"],
    });
    const decoded = decodeMemo(memo);
    expect(decoded).toEqual({
      kind: "flatten",
      reason: "max_drawdown",
      sigs: ["abc", "def"],
    });
  });

  it("round-trips reset", () => {
    const memo = encodeResetMemo({
      priorProofSig: "proofSig123",
      note: "post-drill",
    });
    const decoded = decodeMemo(memo);
    expect(decoded).toEqual({
      kind: "reset",
      priorProofSig: "proofSig123",
      note: "post-drill",
    });
  });

  it("returns null for unrelated memo text", () => {
    expect(decodeMemo("hello world")).toBeNull();
    expect(decodeMemo("SPECGUARD:v2:POLICY:{}")).toBeNull();
  });

  it("decodes policy memos with escaped quotes in JSON payload", () => {
    const memo = encodePolicyMemo(policy);
    const payload = memo.slice("SPECGUARD:v1:POLICY:".length);
    const escaped = `SPECGUARD:v1:POLICY:${payload.replace(/"/g, '\\"')}`;
    const decoded = decodeMemo(escaped);
    expect(decoded?.kind).toBe("policy");
  });
});
