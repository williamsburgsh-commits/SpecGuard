import { address, createClient } from "@solana/kit";
import { solanaMainnetRpc } from "@solana/kit-plugin-rpc";
import { loadRepoEnv } from "../src/loadEnv.js";
import { resolveRpcUrl } from "../src/config.js";
import { USDC_MINT } from "../src/jupiter/constants.js";
import { createMainnetAgentClient } from "../src/client.js";

loadRepoEnv();

async function main() {
  const { client } = await createMainnetAgentClient();
  const wallet = client.payer.address;
  const res = await client.rpc
    .getTokenAccountsByOwner(
      wallet,
      { mint: USDC_MINT },
      { encoding: "jsonParsed" },
    )
    .send();
  let total = 0n;
  for (const { account } of res.value) {
    const parsed = account.data as {
      parsed?: { info?: { tokenAmount?: { amount?: string } } };
    };
    const amt = parsed.parsed?.info?.tokenAmount?.amount;
    if (amt) total += BigInt(amt);
  }
  console.log(`Wallet: ${wallet}`);
  console.log(`USDC: ${Number(total) / 1e6}`);
}

main();
