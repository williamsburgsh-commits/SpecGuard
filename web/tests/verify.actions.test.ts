import { describe, expect, it } from "vitest";
import { encodeActionMemo, MEMO_PREFIX } from "@specguard/core";
import {
  actionSnapshotsFromTxRows,
  policyFromPolicyRow,
} from "../lib/verify/buildVerifyInput";

describe("actionSnapshotsFromTxRows", () => {
  it("extracts ACTION memos from ingested transaction raw payloads", () => {
    const memo = encodeActionMemo({
      type: "social_post",
      ts: 1_700_000_000,
      platform: "x",
    });
    const rows = [
      {
        signature: "sig1",
        program_ids: [],
        sol_delta_lamports: 0,
        fee_lamports: 5000,
        token_deltas: {},
        success: true,
        raw: {
          logMessages: [`Program log: Memo ${memo}`],
        },
      },
    ];
    expect(actionSnapshotsFromTxRows(rows)).toEqual([
      {
        type: "social_post",
        platform: "x",
        timestampSec: 1_700_000_000,
      },
    ]);
  });

  it("ignores non-action memos", () => {
    const memo = `${MEMO_PREFIX}HB:1700000000`;
    const rows = [
      {
        signature: "sig1",
        program_ids: [],
        sol_delta_lamports: 0,
        fee_lamports: 5000,
        token_deltas: {},
        success: true,
        raw: { logMessages: [`Program log: Memo ${memo}`] },
      },
    ];
    expect(actionSnapshotsFromTxRows(rows)).toEqual([]);
  });
});

describe("policyFromPolicyRow", () => {
  it("reconstructs V2 from columns when raw_json is absent", () => {
    const policy = policyFromPolicyRow({
      name: "social-bot",
      schema_version: 2,
      agent_type: "social",
      max_spend_per_tx_sol: 0.1,
      heartbeat_interval_sec: 600,
      daily_spend_sol: 1,
      social_limits: { maxPostsPerDay: 5, allowDMs: false, platforms: ["x"] },
      allowed_venues: null,
      max_drawdown_pct: null,
    });
    expect(policy?.version).toBe(2);
    if (policy?.version !== 2) throw new Error("expected v2");
    expect(policy.type).toBe("social");
    expect(policy.spendLimits.dailySol).toBe(1);
    expect(policy.socialLimits?.maxPostsPerDay).toBe(5);
  });
});
