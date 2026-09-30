import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { MEMO_PROGRAM_ID } from "@specguardxyz/core";

const MEMO_PROGRAM = new PublicKey(MEMO_PROGRAM_ID);

/**
 * Accepts a base58 secret key (Phantom-style) or a JSON byte array, matching
 * the two formats Solana tooling exports.
 */
export function parseKeypair(secret: string): Keypair {
  const trimmed = secret.trim();
  if (!trimmed) throw new Error("Keypair is empty");

  if (trimmed.startsWith("[")) {
    let bytes: unknown;
    try {
      bytes = JSON.parse(trimmed);
    } catch {
      throw new Error("Keypair looks like JSON but did not parse");
    }
    if (!Array.isArray(bytes) || !bytes.every((b) => typeof b === "number")) {
      throw new Error("Keypair JSON must be an array of numbers");
    }
    return Keypair.fromSecretKey(Uint8Array.from(bytes as number[]));
  }

  let decoded: Uint8Array;
  try {
    decoded = bs58.decode(trimmed);
  } catch {
    throw new Error("Keypair is not valid base58 or a JSON byte array");
  }
  return Keypair.fromSecretKey(decoded);
}

export function memoInstruction(memo: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM,
    data: Buffer.from(memo, "utf8"),
  });
}

export interface SendMemoResult {
  signature: string;
  wallet: string;
  memoText: string;
  solscanUrl: string;
}

export async function sendMemo(
  rpcUrl: string,
  keypair: Keypair,
  memoText: string,
): Promise<SendMemoResult> {
  const connection = new Connection(rpcUrl, "confirmed");
  const tx = new Transaction().add(memoInstruction(memoText, keypair.publicKey));
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
    "confirmed",
  );
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = keypair.publicKey;
  tx.sign(keypair);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });
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

/**
 * Builds an unsigned, base64 memo transaction for a wallet the server does not
 * hold keys for — the caller signs and sends it.
 */
export async function buildUnsignedMemoTx(
  rpcUrl: string,
  wallet: string,
  memoText: string,
): Promise<{ transactionBase64: string; memoText: string; wallet: string }> {
  const connection = new Connection(rpcUrl, "confirmed");
  const payer = new PublicKey(wallet);
  const tx = new Transaction().add(memoInstruction(memoText, payer));
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return {
    transactionBase64: serialized.toString("base64"),
    memoText,
    wallet,
  };
}
