import { getSignatureFromTransaction, getBase64Encoder, getTransactionDecoder, type TransactionSigner } from "@solana/kit";
import { signJupiterWireTransaction } from "../jupiter/signWireTransaction.js";
import type { AgentBalanceRpc } from "../jupiter/preflight.js";

type SendRpc = {
  sendTransaction: (
    base64: string,
    config: { encoding: "base64"; skipPreflight?: boolean },
  ) => { send: () => Promise<string> };
  getSignatureStatuses: (
    sigs: string[],
  ) => {
    send: () => Promise<{ value: Array<{ err: unknown } | null> }>;
  };
};

export async function signAndSendWireTransaction(
  rpc: SendRpc,
  signer: TransactionSigner,
  base64Transaction: string,
): Promise<string> {
  const signed = await signJupiterWireTransaction(signer, base64Transaction);
  const sig = await rpc
    .sendTransaction(signed, { encoding: "base64" })
    .send();

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const { value } = await rpc.getSignatureStatuses([sig]).send();
    const st = value[0];
    if (st?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(st.err)}`);
    }
    if (st) return sig;
  }
  return sig;
}
