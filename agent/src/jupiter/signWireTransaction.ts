import {
  assertIsKeyPairSigner,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  signTransaction,
  type TransactionSigner,
} from "@solana/kit";

/** Sign an unsigned base64 versioned transaction (Jupiter Trigger / Swap). */
export async function signJupiterWireTransaction(
  signer: TransactionSigner,
  base64Transaction: string,
): Promise<string> {
  assertIsKeyPairSigner(signer);
  const wireBytes = getBase64Encoder().encode(base64Transaction);
  const [unsigned] = getTransactionDecoder().read(wireBytes, 0);
  const signed = await signTransaction([signer.keyPair], unsigned);
  return getBase64EncodedWireTransaction(signed);
}

/** @deprecated Use signJupiterWireTransaction */
export const signTriggerWireTransaction = signJupiterWireTransaction;
