import { describe, expect, it } from "vitest";
import {
  decodeMemo,
  encodeActionMemo,
  encodeAttestMemo,
  encodeDelegateMemo,
  encodePolicyMemo,
  encodeScopeMemo,
  MEMO_PREFIX,
  type PolicyV2,
} from "../src/index.js";

describe("ACTION memo", () => {
  it("roundtrips a minimal payload", () => {
    const memo = encodeActionMemo({ type: "social_post", ts: 1_700_000_000 });
    expect(memo.startsWith(`${MEMO_PREFIX}ACTION:`)).toBe(true);
    const decoded = decodeMemo(memo);
    expect(decoded).toEqual({
      kind: "action",
      type: "social_post",
      ts: 1_700_000_000,
    });
  });

  it("roundtrips a full payload", () => {
    const memo = encodeActionMemo({
      type: "api_call",
      ts: 1_700_000_000,
      contentHash: "abc123",
      platform: "x",
      tool: "firecrawl-search",
    });
    expect(decodeMemo(memo)).toEqual({
      kind: "action",
      type: "api_call",
      ts: 1_700_000_000,
      contentHash: "abc123",
      platform: "x",
      tool: "firecrawl-search",
    });
  });

  it("rejects a missing timestamp", () => {
    expect(decodeMemo(`${MEMO_PREFIX}ACTION:{"type":"social_post"}`)).toBeNull();
  });

  it("rejects an empty type", () => {
    expect(decodeMemo(`${MEMO_PREFIX}ACTION:{"type":"","ts":1}`)).toBeNull();
  });
});

describe("SCOPE memo", () => {
  it("roundtrips and sorts arrays", () => {
    const memo = encodeScopeMemo({
      actions: ["post", "api_call"],
      deniedActions: ["dm"],
      tools: ["z-tool", "a-tool"],
      spendLimitSol: 1.5,
    });
    const decoded = decodeMemo(memo);
    expect(decoded).toEqual({
      kind: "scope",
      actions: ["api_call", "post"],
      deniedActions: ["dm"],
      tools: ["a-tool", "z-tool"],
      spendLimitSol: 1.5,
    });
  });

  it("roundtrips with only required fields", () => {
    const memo = encodeScopeMemo({ actions: ["read_data"] });
    expect(decodeMemo(memo)).toEqual({ kind: "scope", actions: ["read_data"] });
  });

  it("is deterministic regardless of input order", () => {
    const a = encodeScopeMemo({ actions: ["b", "a"], tools: ["y", "x"] });
    const b = encodeScopeMemo({ actions: ["a", "b"], tools: ["x", "y"] });
    expect(a).toBe(b);
  });

  it("rejects a non-string actions array", () => {
    expect(decodeMemo(`${MEMO_PREFIX}SCOPE:{"actions":[1,2]}`)).toBeNull();
  });
});

describe("ATTEST memo", () => {
  it("roundtrips each verdict", () => {
    for (const verdict of ["pass", "fail", "warn"] as const) {
      const memo = encodeAttestMemo({
        targetWallet: "Agent1111111111111111111111111111111111111",
        verdict,
        ts: 1_700_000_000,
      });
      expect(decodeMemo(memo)).toEqual({
        kind: "attest",
        targetWallet: "Agent1111111111111111111111111111111111111",
        verdict,
        ts: 1_700_000_000,
      });
    }
  });

  it("roundtrips an optional note", () => {
    const memo = encodeAttestMemo({
      targetWallet: "Agent1111111111111111111111111111111111111",
      verdict: "warn",
      ts: 1_700_000_000,
      note: "heartbeat gaps observed",
    });
    const decoded = decodeMemo(memo);
    expect(decoded).toMatchObject({ kind: "attest", note: "heartbeat gaps observed" });
  });

  it("rejects an unknown verdict", () => {
    expect(
      decodeMemo(
        `${MEMO_PREFIX}ATTEST:{"targetWallet":"A","verdict":"maybe","ts":1}`,
      ),
    ).toBeNull();
  });

  it("rejects an empty target wallet", () => {
    expect(
      decodeMemo(`${MEMO_PREFIX}ATTEST:{"targetWallet":"","verdict":"pass","ts":1}`),
    ).toBeNull();
  });
});

describe("DELEGATE memo", () => {
  it("roundtrips with an expiry", () => {
    const memo = encodeDelegateMemo({
      delegateWallet: "Sub11111111111111111111111111111111111111",
      permissions: ["trade", "post"],
      expirySec: 1_700_086_400,
    });
    expect(decodeMemo(memo)).toEqual({
      kind: "delegate",
      delegateWallet: "Sub11111111111111111111111111111111111111",
      permissions: ["post", "trade"],
      expirySec: 1_700_086_400,
    });
  });

  it("roundtrips without an expiry", () => {
    const memo = encodeDelegateMemo({
      delegateWallet: "Sub11111111111111111111111111111111111111",
      permissions: ["read"],
    });
    expect(decodeMemo(memo)).toEqual({
      kind: "delegate",
      delegateWallet: "Sub11111111111111111111111111111111111111",
      permissions: ["read"],
    });
  });

  it("rejects a missing permissions array", () => {
    expect(
      decodeMemo(`${MEMO_PREFIX}DELEGATE:{"delegateWallet":"Sub1"}`),
    ).toBeNull();
  });
});

describe("POLICY memo with V2", () => {
  const v2: PolicyV2 = {
    version: 2,
    name: "social-agent",
    type: "social",
    heartbeatIntervalSec: 600,
    spendLimits: { perTxSol: 0.1, dailySol: 1 },
    socialLimits: { maxPostsPerDay: 20, allowDMs: false, platforms: ["x"] },
  };

  it("roundtrips a V2 policy", () => {
    const memo = encodePolicyMemo(v2);
    const decoded = decodeMemo(memo);
    expect(decoded?.kind).toBe("policy");
    if (decoded?.kind !== "policy") throw new Error("expected policy memo");
    expect(decoded.policy).toEqual(v2);
  });

  it("still roundtrips a V1 policy", () => {
    const memo = encodePolicyMemo({
      version: 1,
      name: "legacy",
      maxDrawdownPct: 10,
      maxSpendPerTxSol: 0.5,
      allowedVenues: ["jupiter-swap"],
      heartbeatIntervalSec: 300,
    });
    const decoded = decodeMemo(memo);
    expect(decoded?.kind).toBe("policy");
    if (decoded?.kind !== "policy") throw new Error("expected policy memo");
    expect(decoded.policy.version).toBe(1);
  });

  it("rejects an unknown policy version", () => {
    expect(
      decodeMemo(`${MEMO_PREFIX}POLICY:{"version":9,"name":"x"}`),
    ).toBeNull();
  });
});

describe("unknown tags", () => {
  it("returns null for an unrecognized tag", () => {
    expect(decodeMemo(`${MEMO_PREFIX}WHATEVER:{}`)).toBeNull();
  });
});
