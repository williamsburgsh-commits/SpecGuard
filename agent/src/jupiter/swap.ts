import type { Address } from "@solana/kit";
import { jupiterTriggerHeaders, USDC_MINT, WSOL_MINT } from "./constants.js";

export function resolveJupiterSwapBaseUrl(): string {
  const override = process.env.JUPITER_SWAP_API_BASE;
  if (override) return override.replace(/\/$/, "");
  if (process.env.JUPITER_API_KEY) {
    return "https://api.jup.ag/swap/v1";
  }
  return "https://lite-api.jup.ag/swap/v1";
}

export type SwapQuoteResponse = Record<string, unknown>;

export async function fetchSwapQuote(params: {
  inputMint?: Address;
  outputMint?: Address;
  amountLamports: bigint;
  slippageBps: number;
}): Promise<SwapQuoteResponse> {
  const base = resolveJupiterSwapBaseUrl();
  const q = new URLSearchParams({
    inputMint: params.inputMint ?? WSOL_MINT,
    outputMint: params.outputMint ?? USDC_MINT,
    amount: params.amountLamports.toString(),
    slippageBps: String(params.slippageBps),
  });
  const res = await fetch(`${base}/quote?${q}`, {
    headers: jupiterTriggerHeaders(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Jupiter swap quote ${res.status}: ${text}`);
  }
  return JSON.parse(text) as SwapQuoteResponse;
}

export async function buildSwapTransaction(
  userPublicKey: Address,
  quoteResponse: SwapQuoteResponse,
): Promise<string> {
  const base = resolveJupiterSwapBaseUrl();
  const res = await fetch(`${base}/swap`, {
    method: "POST",
    headers: jupiterTriggerHeaders(),
    body: JSON.stringify({
      userPublicKey,
      quoteResponse,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
    }),
  });
  const body = (await res.json()) as {
    swapTransaction?: string;
    error?: string;
  };
  if (!res.ok || !body.swapTransaction) {
    throw new Error(
      `Jupiter swap build ${res.status}: ${JSON.stringify(body)}`,
    );
  }
  return body.swapTransaction;
}
