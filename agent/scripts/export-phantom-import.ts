/**
 * Prints base58 secret key for Phantom "Import private key" (local terminal only).
 * Never commit or share the output.
 */
import { readFileSync, existsSync } from "node:fs";
import { getBase58Decoder } from "@solana/codecs-strings";
import { loadRepoEnv } from "../src/loadEnv.js";
import { resolveKeypairPath } from "../src/config.js";
import { execFileSync } from "node:child_process";

loadRepoEnv();

const path = resolveKeypairPath();
if (!existsSync(path)) {
  console.error(`Keypair not found: ${path}`);
  console.error("Run: npm run agent:generate-wallet");
  process.exit(1);
}

const bytes = Uint8Array.from(JSON.parse(readFileSync(path, "utf8")));
if (bytes.length !== 64) {
  console.error(`Expected 64-byte keypair, got ${bytes.length} bytes`);
  process.exit(1);
}

const pubkey = execFileSync("solana-keygen", ["pubkey", path], {
  encoding: "utf8",
}).trim();

// Bytes → base58 string (Phantom "import private key" format)
const base58 = getBase58Decoder().decode(bytes);

console.log("");
console.log("SpecGuard v2 — Phantom import (PRIVATE — do not share)");
console.log(`Public:  ${pubkey}`);
console.log("");
console.log("Phantom → Add wallet → Import private key → paste this line:");
console.log("");
console.log(base58);
console.log("");
console.log("Then confirm Phantom shows the same public address above.");
