/**
 * Slice 9: post SPECGUARD:v1:HB:<unix_sec> memo on mainnet.
 */
import { encodeHeartbeatMemo } from "@specguard/core";
import { getAddMemoInstruction } from "@solana-program/memo";
import { loadRepoEnv } from "../src/loadEnv.js";
import { createMainnetAgentClient } from "../src/client.js";

loadRepoEnv();

const timestampSec = Math.floor(Date.now() / 1000);
const memoText = encodeHeartbeatMemo(timestampSec);

const { client } = await createMainnetAgentClient();
console.log(`Heartbeat memo from ${client.payer.address}…`);
console.log(memoText);

const instruction = getAddMemoInstruction({
  memo: memoText,
  signers: [client.identity],
});

const result = await client.sendTransaction([instruction]);
const signature = result.context.signature;
if (!signature) {
  throw new Error("No signature returned");
}
console.log("Signature:", signature);
console.log(`https://solscan.io/tx/${signature}`);
