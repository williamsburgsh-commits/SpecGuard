import type { Connection, Transaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { SolanaWalletProvider } from "@/lib/register/sendPolicyMemo";

/** Bridge wallet-adapter to memo signing helper used by registration. */
export function walletAdapterToProvider(
  wallet: WalletContextState,
  connection: Connection,
): SolanaWalletProvider | null {
  const { publicKey, signTransaction, signAllTransactions } = wallet;
  if (!publicKey) return null;

  return {
    publicKey,
    connect: async () => {},
    signTransaction: signTransaction ?? undefined,
    signAndSendTransaction: async (transaction: Transaction) => {
      if (signTransaction) {
        const signed = await signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });
        return { signature };
      }
      if (signAllTransactions) {
        const [signed] = await signAllTransactions([transaction]);
        const signature = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });
        return { signature };
      }
      throw new Error("Wallet does not support signing transactions");
    },
  };
}
