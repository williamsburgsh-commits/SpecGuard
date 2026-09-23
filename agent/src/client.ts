import { createClient } from "@solana/kit";
import { memoProgram } from "@solana-program/memo";
import { solanaMainnetRpc } from "@solana/kit-plugin-rpc";
import { signerFromFile } from "@solana/kit-plugin-signer";
import { resolveKeypairPath, resolveRpcUrl } from "./config.js";

export async function createMainnetAgentClient() {
  const keypairPath = resolveKeypairPath();
  const rpcUrl = resolveRpcUrl();

  const client = await createClient()
    .use(await signerFromFile(keypairPath))
    .use(solanaMainnetRpc({ rpcUrl }))
    .use(memoProgram());

  return { client, rpcUrl, keypairPath };
}
