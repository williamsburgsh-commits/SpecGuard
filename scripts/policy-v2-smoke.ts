/**
 * Verifies the PolicyV2 stack end to end against the live Supabase project:
 * the 0014 migration landed, V2 policies round-trip through memo + hash, the
 * registry queries read the new columns, and a V2 policy row can be written,
 * read back through the app's own query path, and evaluated.
 *
 *   npm run test:policy-v2
 *
 * Writes only to a throwaway wallet, then deletes it.
 */
import { createClient } from "@supabase/supabase-js";
import {
  canonicalPolicyJsonV2,
  decodeMemo,
  encodePolicyMemo,
  evaluatePolicy,
  hashPolicy,
  parsePolicy,
  type PolicyV2,
} from "@specguardxyz/core";
import { listAgents } from "../web/lib/agents/listAgents";
import { fetchAgentSummary } from "../web/lib/status/fetchAgentSummary";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const TEST_WALLET = "SpecGuardV2SmokeTestWallet000000000000000000";
let failures = 0;

function pass(name: string, detail = ""): void {
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail: string): void {
  failures += 1;
  console.error(`  FAIL  ${name} — ${detail}`);
}

const socialPolicy: PolicyV2 = {
  version: 2,
  name: "v2-smoke-social",
  type: "social",
  heartbeatIntervalSec: 600,
  spendLimits: { perTxSol: 0.1, dailySol: 1 },
  socialLimits: { maxPostsPerDay: 5, allowDMs: false, platforms: ["x"] },
};

async function cleanup(): Promise<void> {
  await supabase.from("status_events").delete().eq("wallet", TEST_WALLET);
  await supabase.from("agents").update({ current_policy_id: null }).eq("wallet", TEST_WALLET);
  await supabase.from("policies").delete().eq("wallet", TEST_WALLET);
  await supabase.from("agents").delete().eq("wallet", TEST_WALLET);
}

async function main(): Promise<void> {
  console.log("PolicyV2 stack smoke test\n");

  // ---- 1. migration ----
  console.log("migration 0014");
  const { error: agentsErr } = await supabase
    .from("agents")
    .select("wallet, agent_type")
    .limit(1);
  if (agentsErr) {
    fail("agents.agent_type exists", agentsErr.message);
  } else {
    pass("agents.agent_type exists");
  }

  const { error: polErr } = await supabase
    .from("policies")
    .select(
      "id, schema_version, agent_type, daily_spend_sol, social_limits, allowed_tools, denied_actions",
    )
    .limit(1);
  if (polErr) {
    fail("policies v2 columns exist", polErr.message);
  } else {
    pass("policies v2 columns exist");
  }

  if (failures > 0) {
    console.error(
      "\nMigration not applied. Run supabase/migrations/0014_policy_v2.sql in the Supabase SQL editor, then re-run.",
    );
    process.exit(1);
  }

  // ---- 2. memo round-trip ----
  console.log("\nmemo round-trip");
  const memoText = encodePolicyMemo(socialPolicy);
  const decoded = decodeMemo(memoText);
  if (decoded?.kind === "policy" && decoded.policy.version === 2) {
    pass("V2 policy survives encode → decode", `${memoText.length} chars`);
  } else {
    fail("V2 policy survives encode → decode", `got ${JSON.stringify(decoded)?.slice(0, 100)}`);
  }
  const hash = hashPolicy(socialPolicy);
  if (decoded?.kind === "policy" && hashPolicy(decoded.policy) === hash) {
    pass("hash matches after round-trip", hash.slice(0, 16));
  } else {
    fail("hash matches after round-trip", "hash drifted");
  }
  if (memoText.length <= 566) {
    pass("memo fits a single Solana memo instruction", `${memoText.length} ≤ 566 bytes`);
  } else {
    fail("memo fits a single Solana memo instruction", `${memoText.length} bytes`);
  }

  // ---- 3. write a V2 policy through the real column mapping ----
  console.log("\nV2 row write + read");
  await cleanup();
  const now = new Date().toISOString();

  const { error: insAgentErr } = await supabase.from("agents").insert({
    wallet: TEST_WALLET,
    name: socialPolicy.name,
    agent_type: socialPolicy.type,
    is_specguard: false,
    registered_at: now,
    registration_sig: `v2smoke${Date.now()}`,
    status: "GREEN",
    status_since: now,
  });
  if (insAgentErr) {
    fail("insert V2 agent", insAgentErr.message);
    await cleanup();
    process.exit(1);
  }
  pass("insert V2 agent");

  const { data: polRow, error: insPolErr } = await supabase
    .from("policies")
    .insert({
      wallet: TEST_WALLET,
      version: 1,
      schema_version: 2,
      agent_type: socialPolicy.type,
      memo_sig: `v2smokememo${Date.now()}`,
      blocktime: now,
      name: socialPolicy.name,
      max_drawdown_pct: null,
      max_spend_per_tx_sol: socialPolicy.spendLimits.perTxSol,
      allowed_venues: null,
      heartbeat_interval_sec: socialPolicy.heartbeatIntervalSec,
      daily_spend_sol: socialPolicy.spendLimits.dailySol,
      social_limits: socialPolicy.socialLimits,
      allowed_tools: null,
      denied_actions: null,
      raw_json: JSON.parse(canonicalPolicyJsonV2(socialPolicy)),
      policy_hash: hash,
    })
    .select("id")
    .single();

  if (insPolErr || !polRow) {
    fail("insert V2 policy with null drawdown + null venues", insPolErr?.message ?? "no row");
    await cleanup();
    process.exit(1);
  }
  pass("insert V2 policy with null drawdown + null venues");

  await supabase
    .from("agents")
    .update({ current_policy_id: polRow.id })
    .eq("wallet", TEST_WALLET);

  // ---- 4. read back through the app's own query path ----
  console.log("\napp query path");
  const summary = await fetchAgentSummary(supabase, TEST_WALLET);
  if (!summary) {
    fail("fetchAgentSummary returns the agent", "null");
  } else {
    pass("fetchAgentSummary returns the agent");
    if (summary.agentType === "social") pass("agentType reads back as social");
    else fail("agentType reads back as social", String(summary.agentType));

    if (summary.policy?.schemaVersion === 2) pass("policy.schemaVersion is 2");
    else fail("policy.schemaVersion is 2", String(summary.policy?.schemaVersion));

    if (summary.policy?.maxDrawdownPct === null) pass("maxDrawdownPct is null, not 0");
    else fail("maxDrawdownPct is null, not 0", String(summary.policy?.maxDrawdownPct));

    if (summary.policy?.dailySpendSol === 1) pass("dailySpendSol reads back");
    else fail("dailySpendSol reads back", String(summary.policy?.dailySpendSol));

    const social = summary.policy?.socialLimits;
    if (social?.maxPostsPerDay === 5 && social?.allowDMs === false) {
      pass("socialLimits reads back");
    } else {
      fail("socialLimits reads back", JSON.stringify(social));
    }

    if (summary.policy?.raw?.version === 2) {
      pass("raw_json parses back into a V2 policy");
    } else {
      fail("raw_json parses back into a V2 policy", JSON.stringify(summary.policy?.raw));
    }
  }

  // ---- 5. registry listing + type filter ----
  const all = await listAgents(supabase, { status: "all", agentType: "all" });
  const found = all.find((a) => a.wallet === TEST_WALLET);
  if (found) pass("listAgents includes the V2 agent");
  else fail("listAgents includes the V2 agent", "missing");
  if (found?.agentType === "social") pass("listAgents reports agentType");
  else fail("listAgents reports agentType", String(found?.agentType));
  if (found?.policySummary && !found.policySummary.includes("Max DD")) {
    pass("policySummary omits drawdown for a social agent", found.policySummary);
  } else {
    fail("policySummary omits drawdown for a social agent", String(found?.policySummary));
  }

  const socialOnly = await listAgents(supabase, { status: "all", agentType: "social" });
  if (socialOnly.some((a) => a.wallet === TEST_WALLET)) {
    pass("type filter 'social' includes it");
  } else {
    fail("type filter 'social' includes it", "missing");
  }
  const traderOnly = await listAgents(supabase, { status: "all", agentType: "trader" });
  if (!traderOnly.some((a) => a.wallet === TEST_WALLET)) {
    pass("type filter 'trader' excludes it");
  } else {
    fail("type filter 'trader' excludes it", "leaked into trader filter");
  }

  // ---- 6. evaluation against the stored policy ----
  console.log("\nevaluation");
  const stored = parsePolicy(summary?.policy?.raw);
  const nowSec = Math.floor(Date.now() / 1000);
  const base = {
    peakEquityUsdc: 0,
    currentEquityUsdc: 0,
    lastHeartbeatAtSec: nowSec,
    nowSec,
  };

  const clean = evaluatePolicy(stored, {
    metrics: base,
    actions: [{ type: "social_post", platform: "x", timestampSec: nowSec }],
  });
  if (clean.status === "GREEN") pass("in-policy post evaluates GREEN");
  else fail("in-policy post evaluates GREEN", clean.breachReasons.join(","));

  const dm = evaluatePolicy(stored, {
    metrics: base,
    actions: [{ type: "social_dm", platform: "x", timestampSec: nowSec }],
  });
  if (dm.breachReasons.includes("social_limit_exceeded")) {
    pass("blocked DM evaluates RED");
  } else {
    fail("blocked DM evaluates RED", dm.breachReasons.join(","));
  }

  const overspend = evaluatePolicy(stored, {
    metrics: base,
    transactions: [
      { signature: "x", spendSol: 0.5, programIds: [], timestampSec: nowSec },
    ],
  });
  if (overspend.breachReasons.includes("max_spend_per_tx")) {
    pass("overspend evaluates RED");
  } else {
    fail("overspend evaluates RED", overspend.breachReasons.join(","));
  }

  const drawdown = evaluatePolicy(stored, {
    metrics: { ...base, peakEquityUsdc: 1000, currentEquityUsdc: 1 },
  });
  if (!drawdown.breachReasons.includes("max_drawdown")) {
    pass("social agent is not judged on drawdown");
  } else {
    fail("social agent is not judged on drawdown", "drawdown applied");
  }

  await cleanup();
  console.log("\ncleaned up test rows");
  console.log(`\n${failures === 0 ? "OK" : "FAILED"} — ${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e: unknown) => {
  console.error("smoke test crashed:", e instanceof Error ? e.stack : e);
  await cleanup().catch(() => {});
  process.exit(1);
});
