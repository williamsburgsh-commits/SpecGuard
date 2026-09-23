import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { loadRepoEnv, repoRootPath } from "../src/loadEnv.js";
import { DEFAULT_KEYPAIR_PATH } from "../src/config.js";

loadRepoEnv();

const outPath = resolve(
  process.env.AGENT_KEYPAIR_PATH ?? DEFAULT_KEYPAIR_PATH,
);

if (existsSync(outPath)) {
  const pubkey = execFileSync(
    "solana-keygen",
    ["pubkey", outPath],
    { encoding: "utf8" },
  ).trim();
  console.log(`Keypair already exists: ${outPath}`);
  console.log(`Wallet: ${pubkey}`);
  console.log("Fund on mainnet (~0.01 SOL), then: npm run agent:publish-policy");
  process.exit(0);
}

mkdirSync(dirname(outPath), { recursive: true });

execFileSync(
  "solana-keygen",
  ["new", "--no-bip39-passphrase", "--silent", "--force", "--outfile", outPath],
  { stdio: "inherit" },
);

const pubkey = execFileSync(
  "solana-keygen",
  ["pubkey", outPath],
  { encoding: "utf8" },
).trim();

console.log("");
console.log("SpecGuard v2 agent wallet created (Slice 3).");
console.log(`Keypair: ${outPath} (gitignored — copy to DO as AGENT_KEYPAIR_JSON)`);
console.log(`Wallet:  ${pubkey}`);
console.log("");
console.log("Next:");
console.log("  1. Send ≥0.01 SOL on mainnet to the wallet above.");
console.log("  2. Set in .env:");
console.log(`     NEXT_PUBLIC_SPECGUARD_AGENT_WALLET=${pubkey}`);
console.log(`     AGENT_RPC_URL=<Helius mainnet RPC with key>`);
console.log("  3. npm run agent:balance");
console.log("  4. npm run agent:publish-policy");
