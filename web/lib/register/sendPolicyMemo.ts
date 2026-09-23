import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { resolveBrowserRpcUrl } from "../browserRpc";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

export interface SolanaWalletProvider {
  publicKey?: { toString(): string } | null;
  connect(): Promise<{ publicKey?: { toString(): string } } | void>;
  signAndSendTransaction?(
    transaction: Transaction,
  ): Promise<{ signature: string }>;
  signTransaction?(transaction: Transaction): Promise<Transaction>;
}

declare global {
  interface Window {
    phantom?: {
      solana?: SolanaWalletProvider & {
        isPhantom?: boolean;
      };
    };
  }
}

async function signAndSendWithProvider(
  provider: SolanaWalletProvider,
  transaction: Transaction,
  connection: Connection,
): Promise<string> {
  if (provider.signAndSendTransaction) {
    const { signature } = await provider.signAndSendTransaction(transaction);
    return signature;
  }

  if (provider.signTransaction) {
    const signed = await provider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(
      signed.serialize(),
      { skipPreflight: false, preflightCommitment: "confirmed" },
    );
    return signature;
  }

  throw new Error("Wallet does not support signing transactions");
}

export async function sendPolicyMemoTransaction(
  wallet: SolanaWalletProvider,
  memoText: string,
): Promise<string> {
  const pubkey = wallet.publicKey?.toString();
  if (!pubkey) {
    throw new Error("Wallet not connected");
  }

  const connection = new Connection(resolveBrowserRpcUrl(), "confirmed");
  const signer = new PublicKey(pubkey);

  const instruction = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: signer, isSigner: true, isWritable: true }],
    data: Buffer.from(memoText, "utf8"),
  });

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: signer,
    blockhash,
    lastValidBlockHeight,
  }).add(instruction);

  const signature = await signAndSendWithProvider(
    wallet,
    transaction,
    connection,
  );
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  return signature;
}

/** @deprecated Use listSolanaWalletOptions / connectSolanaWallet */
export type PhantomSolanaProvider = SolanaWalletProvider;

/** @deprecated Use connectSolanaWallet("phantom") */
export function getPhantomProvider(): SolanaWalletProvider | null {
  if (typeof window === "undefined") return null;
  const provider = window.phantom?.solana;
  if (provider?.isPhantom) return provider;
  return null;
}
