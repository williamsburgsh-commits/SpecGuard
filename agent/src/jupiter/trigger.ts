import type { Address } from "@solana/kit";
import {
  jupiterTriggerHeaders,
  resolveJupiterTriggerBaseUrl,
  TRIGGER_MIN_NOTIONAL_USDC,
  USDC_MINT,
  WSOL_MINT,
} from "./constants.js";
import { signTriggerWireTransaction } from "./signWireTransaction.js";
import type { TransactionSigner } from "@solana/kit";

export interface CreateBidParams {
  /** USDC lamports (6 decimals) offered. */
  makingUsdcRaw: bigint;
  /** SOL lamports (9 decimals) requested. */
  takingSolRaw: bigint;
}

export interface CreateOrderResponse {
  requestId: string;
  transaction: string;
  order: string;
}

export interface ExecuteResponse {
  status: string;
  signature: string;
  code: number;
}

export interface TriggerOrder {
  orderKey: string;
  inputMint: string;
  outputMint: string;
  status: string;
  rawMakingAmount: string;
  rawTakingAmount: string;
}

async function triggerFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = resolveJupiterTriggerBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...jupiterTriggerHeaders(), ...init?.headers },
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Jupiter Trigger ${path} non-JSON (${res.status}): ${text}`);
  }
  if (!res.ok) {
    throw new Error(
      `Jupiter Trigger ${path} ${res.status}: ${JSON.stringify(body)}`,
    );
  }
  return body as T;
}

const SOL_MINT_ID = "So11111111111111111111111111111111111111112";

export async function fetchSolUsdcMidPrice(): Promise<number> {
  const url = `https://api.jup.ag/price/v3?ids=${SOL_MINT_ID}`;
  const headers: Record<string, string> = {};
  const key = process.env.JUPITER_API_KEY;
  if (key) headers["x-api-key"] = key;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Jupiter price API ${res.status}`);
  }
  const json = (await res.json()) as Record<
    string,
    { usdPrice?: number } | undefined
  >;
  const usdPrice = json[SOL_MINT_ID]?.usdPrice;
  if (usdPrice == null || !Number.isFinite(usdPrice)) {
    throw new Error("Missing SOL usdPrice from Jupiter price v3");
  }
  return usdPrice;
}

export { TRIGGER_MIN_NOTIONAL_USDC };

export function defaultTinyBidParams(midUsdPerSol: number): CreateBidParams {
  const makingUsdcRaw = BigInt(TRIGGER_MIN_NOTIONAL_USDC * 1_000_000);
  const bidUsdPerSol = midUsdPerSol * 0.5;
  const solHuman = TRIGGER_MIN_NOTIONAL_USDC / bidUsdPerSol;
  const takingSolRaw = BigInt(Math.floor(solHuman * 1e9));
  return { makingUsdcRaw, takingSolRaw };
}

export async function createBidOrder(
  maker: Address,
  params: CreateBidParams,
): Promise<CreateOrderResponse> {
  return createTriggerOrder(maker, {
    inputMint: USDC_MINT,
    outputMint: WSOL_MINT,
    makingAmount: params.makingUsdcRaw.toString(),
    takingAmount: params.takingSolRaw.toString(),
  });
}

export interface CreateAskParams {
  /** SOL lamports offered (sell side). */
  makingSolRaw: bigint;
  /** USDC lamports (6 decimals) requested. */
  takingUsdcRaw: bigint;
}

export function defaultTinyAskParams(midUsdPerSol: number): CreateAskParams {
  const solHuman = TRIGGER_MIN_NOTIONAL_USDC / midUsdPerSol;
  const makingSolRaw = BigInt(Math.ceil(solHuman * 1e9));
  const askUsdPerSol = midUsdPerSol * 2;
  const usdcHuman = (Number(makingSolRaw) / 1e9) * askUsdPerSol;
  const takingUsdcRaw = BigInt(Math.floor(usdcHuman * 1e6));
  return { makingSolRaw, takingUsdcRaw };
}

export async function createAskOrder(
  maker: Address,
  params: CreateAskParams,
): Promise<CreateOrderResponse> {
  return createTriggerOrder(maker, {
    inputMint: WSOL_MINT,
    outputMint: USDC_MINT,
    makingAmount: params.makingSolRaw.toString(),
    takingAmount: params.takingUsdcRaw.toString(),
  });
}

async function createTriggerOrder(
  maker: Address,
  order: {
    inputMint: Address;
    outputMint: Address;
    makingAmount: string;
    takingAmount: string;
  },
): Promise<CreateOrderResponse> {
  return triggerFetch<CreateOrderResponse>("/createOrder", {
    method: "POST",
    body: JSON.stringify({
      inputMint: order.inputMint,
      outputMint: order.outputMint,
      maker,
      payer: maker,
      params: {
        makingAmount: order.makingAmount,
        takingAmount: order.takingAmount,
      },
      wrapAndUnwrapSol: true,
      computeUnitPrice: "auto",
    }),
  });
}

export async function executeTriggerOrder(
  requestId: string,
  signedTransaction: string,
): Promise<ExecuteResponse> {
  return triggerFetch<ExecuteResponse>("/execute", {
    method: "POST",
    body: JSON.stringify({ requestId, signedTransaction }),
  });
}

export async function signAndExecuteTriggerOrder(
  signer: TransactionSigner,
  create: CreateOrderResponse,
): Promise<ExecuteResponse> {
  const signed = await signTriggerWireTransaction(signer, create.transaction);
  return executeTriggerOrder(create.requestId, signed);
}

export async function listActiveTriggerOrders(
  wallet: Address,
): Promise<TriggerOrder[]> {
  const q = new URLSearchParams({
    user: wallet,
    orderStatus: "active",
    page: "1",
  });
  const data = await triggerFetch<{ orders: TriggerOrder[] }>(
    `/getTriggerOrders?${q}`,
  );
  return data.orders ?? [];
}

export async function cancelTriggerOrder(
  maker: Address,
  orderKey: string,
): Promise<{ requestId: string; transaction: string }> {
  return triggerFetch("/cancelOrder", {
    method: "POST",
    body: JSON.stringify({
      maker,
      order: orderKey,
      computeUnitPrice: "auto",
    }),
  });
}

export async function signAndExecuteCancel(
  signer: TransactionSigner,
  cancel: { requestId: string; transaction: string },
): Promise<ExecuteResponse> {
  const signed = await signTriggerWireTransaction(signer, cancel.transaction);
  return executeTriggerOrder(cancel.requestId, signed);
}
