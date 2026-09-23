/**
 * Slice 7: mainnet flatten drill — cancel triggers → swap SOL→USDC → FLATTEN memo.
 *
 *   npm run flatten-drill -- --dry-run
 *   npm run flatten-drill
 */
import { loadRepoEnv } from "../src/loadEnv.js";
import { createMainnetAgentClient } from "../src/client.js";
import { runFlatten } from "../src/flatten/runFlatten.js";
import { getAddMemoInstruction } from "@solana-program/memo";

loadRepoEnv();

const dryRun = process.argv.includes("--dry-run");
const reason =
  process.argv.find((a) => a.startsWith("--reason="))?.split("=")[1] ??
  "slice7_drill";

async function main() {
  const { client } = await createMainnetAgentClient();
  const wallet = client.payer.address;

  console.log("Flatten drill on mainnet");
  console.log("Wallet:", wallet);
  console.log("Reason:", reason);
  if (dryRun) console.log("Mode: dry-run");

  const result = await runFlatten({
    reason,
    dryRun,
    rpc: client.rpc as Parameters<typeof runFlatten>[0]["rpc"],
    wallet,
    signer: client.payer,
    sendMemoTransaction: async (memoText) => {
      const ix = getAddMemoInstruction({
        memo: memoText,
        signers: [client.identity],
      });
      const sendResult = await client.sendTransaction([ix]);
      const sig = sendResult.context.signature;
      if (!sig) throw new Error("Memo send missing signature");
      return sig;
    },
  });

  console.log("\nResult:");
  for (const s of result.cancelSignatures) {
    console.log("  cancel:", s);
    console.log(`  https://solscan.io/tx/${s}`);
  }
  if (result.swapSignature) {
    console.log("  swap:", result.swapSignature);
    console.log(`  https://solscan.io/tx/${result.swapSignature}`);
  }
  if (result.swapFailed) console.log("  swap: FAILED (memo still posted per J2)");
  if (result.flattenSignature) {
    console.log("  flatten memo:", result.flattenSignature);
    console.log(`  https://solscan.io/tx/${result.flattenSignature}`);
  }
  if (result.dryRun) {
    console.log("\nDry-run complete (no chain txs).");
  } else {
    console.log("\nAgent local state → RED; quoting stopped.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
