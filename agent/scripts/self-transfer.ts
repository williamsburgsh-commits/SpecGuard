/**
 * Slice 4 DoD: 0.001 SOL self-transfer from v2 agent wallet (mainnet).
 */
import { lamports } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { loadRepoEnv } from "../src/loadEnv.js";
import { createMainnetAgentClient } from "../src/client.js";

loadRepoEnv();

const { client } = await createMainnetAgentClient();
const amount = lamports(1_000_000n);

const instruction = getTransferSolInstruction({
  source: client.payer,
  destination: client.payer.address,
  amount,
});

console.log(`Self-transfer 0.001 SOL on mainnet from ${client.payer.address}…`);
const result = await client.sendTransaction([instruction]);
const signature = result.context.signature;
console.log("Signature:", signature);
console.log(`https://solscan.io/tx/${signature}`);
