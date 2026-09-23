import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadRepoEnv, repoRootPath } from "../src/loadEnv.js";
import { loadPolicyFromEnv } from "../src/config.js";
import { publishPolicyMemo } from "../src/publishPolicy.js";

loadRepoEnv();

const policy = loadPolicyFromEnv();

console.log("Publishing SpecGuard policy memo on mainnet…");
console.log(JSON.stringify(policy, null, 2));

const result = await publishPolicyMemo(policy);

const stateDir = resolve(repoRootPath(), "agent/state");
mkdirSync(stateDir, { recursive: true });
writeFileSync(
  resolve(stateDir, "policy-memo.json"),
  JSON.stringify(
    {
      ...result,
      policy,
      publishedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log("");
console.log("PASS — policy memo confirmed on mainnet.");
console.log(`Wallet:  ${result.wallet}`);
console.log(`Sig:     ${result.signature}`);
console.log(`Hash:    ${result.policyHash}`);
console.log(`Solscan: ${result.solscanUrl}`);
console.log("");
console.log("Add to .env:");
console.log(`NEXT_PUBLIC_SPECGUARD_AGENT_WALLET=${result.wallet}`);
console.log(`AGENT_POLICY_MEMO_SIG=${result.signature}`);
