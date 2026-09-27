import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { MEMO_PROGRAM_ID } from "@specguard/core";
import type { MemoTxResult } from "./types.js";

const MEMO_PROGRAM = new PublicKey(MEMO_PROGRAM_ID);

/** Accepts a base58 secret key or a JSON byte array, as Solana tooling exports. */
export function keypairFromSecret(secret: string): Keypair {
  const trimmed = secret.trim();
  if (!trimmed) throw new Error("Secret key is empty");

  if (trimmed.startsWith("[")) {
    let bytes: unknown;
    try {
      bytes = JSON.parse(trimmed);
    } catch {
      throw new Error("Secret key looks like JSON but did not parse");
    }
    if (!Array.isArray(bytes) || !bytes.every((b) => typeof b === "number")) {
      throw new Error("Secret key JSON must be an array of numbers");
    }
    return Keypair.fromSecretKey(Uint8Array.from(bytes as number[]));
  }

  let decoded: Uint8Array;
  try {
    decoded = bs58.decode(trimmed);
  } catch {
    throw new Error("Secret key is not valid base58 or a JSON byte array");
  }
  return Keypair.fromSecretKey(decoded);
}

export function memoInstruction(
  memo: string,
  signer: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM,
    data: Buffer.from(memo, "utf8"),
  });
}

export async function sendMemoTransaction(
  connection: Connection,
  keypair: Keypair,
  memoText: string,
): Promise<MemoTxResult> {
  const tx = new Transaction().add(memoInstruction(memoText, keypair.publicKey));
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = keypair.publicKey;
  tx.sign(keypair);

  const signature = await connection.sendRawTransaction(tx.serialize());
  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (confirmation.value.err) {
    throw new Error(
      `Transaction failed onchain: ${JSON.stringify(confirmation.value.err)}`,
    );
  }

  return {
    signature,
    wallet: keypair.publicKey.toBase58(),
    memoText,
    solscanUrl: `https://solscan.io/tx/${signature}`,
  };
}
