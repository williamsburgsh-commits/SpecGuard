/**
 * Slice 6: one quote cycle — evaluate() pre-check, optional live bid+ask on Trigger.
 *
 *   npm run quote-cycle -- --dry-run
 *   npm run quote-cycle -- --dry-run --simulate-breach
 *   npm run quote-cycle
 */
import { loadRepoEnv } from "../src/loadEnv.js";
import { createMainnetAgentClient } from "../src/client.js";
import { loadPolicyFromEnv, loadQuoteConfig } from "../src/config.js";
import { runQuoteCycle } from "../src/quote/cycle.js";

loadRepoEnv();

const dryRun = process.argv.includes("--dry-run");
const simulateBreach = process.argv.includes("--simulate-breach");

async function main() {
  const policy = loadPolicyFromEnv();
  const quoteConfig = loadQuoteConfig();
  const { client } = await createMainnetAgentClient();
  const wallet = client.payer.address;

  console.log("Policy:", policy.name);
  console.log(
    `Quote: ${quoteConfig.sizeSol} SOL, ${quoteConfig.spreadBps} bps spread (cycle ${quoteConfig.cycleMs}ms)`,
  );
  if (dryRun) console.log("Mode: dry-run");
  if (simulateBreach) console.log("Mode: simulate-breach");

  const result = await runQuoteCycle({
    dryRun,
    simulateBreach,
    policy,
    quoteConfig,
    rpc: client.rpc,
    wallet,
    signer: client.payer,
  });

  const p = result.plan;
  console.log(`\nMid $${p.midUsdPerSol.toFixed(2)} | size ${p.sizeSol.toFixed(4)} SOL`);
  console.log(
    `Bid $${p.bidPriceUsd.toFixed(2)}/SOL → ${Number(p.bid.makingUsdcRaw) / 1e6} USDC for ${Number(p.bid.takingSolRaw) / 1e9} SOL`,
  );
  console.log(
    `Ask $${p.askPriceUsd.toFixed(2)}/SOL → ${Number(p.ask.makingSolRaw) / 1e9} SOL for ${Number(p.ask.takingUsdcRaw) / 1e6} USDC`,
  );

  console.log(`\nDecision: ${result.decision}`);
  if (result.breachReasons.length) {
    console.log("Breach reasons:", result.breachReasons.join(", "));
  }

  if (result.cancelSignatures.length) {
    console.log("\nCancel sigs:");
    for (const s of result.cancelSignatures) {
      console.log(`  https://solscan.io/tx/${s}`);
    }
  }
  if (result.askSignature) {
    console.log("\nAsk sig:", result.askSignature);
    console.log(`  https://solscan.io/tx/${result.askSignature}`);
  }
  if (result.bidSignature) {
    console.log("\nBid sig:", result.bidSignature);
    console.log(`  https://solscan.io/tx/${result.bidSignature}`);
  }

  if (result.decision === "skip_breach") {
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
