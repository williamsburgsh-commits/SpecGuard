/**
 * Cancel one open Jupiter Trigger order by orderKey (base58 account).
 * Usage: npx tsx scripts/trigger-cancel-order.ts <orderKey>
 */
import { loadRepoEnv } from "../src/loadEnv.js";
import { createMainnetAgentClient } from "../src/client.js";
import {
  cancelTriggerOrder,
  listActiveTriggerOrders,
  signAndExecuteCancel,
} from "../src/jupiter/trigger.js";

loadRepoEnv();

async function main() {
  const orderKey = process.argv[2];
  const { client } = await createMainnetAgentClient();
  const wallet = client.payer.address;

  const key =
    orderKey ??
    (await listActiveTriggerOrders(wallet))[0]?.orderKey;
  if (!key) {
    console.error("No orderKey and no active orders.");
    process.exit(1);
  }

  console.log("Canceling", key);
  const cancel = await cancelTriggerOrder(wallet, key);
  const exec = await signAndExecuteCancel(client.payer, cancel);
  console.log(JSON.stringify(exec, null, 2));
  if (exec.status !== "Success") process.exit(1);
  console.log(`https://solscan.io/tx/${exec.signature}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
