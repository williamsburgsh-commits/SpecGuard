const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isLikelySolanaAddress(value: string): boolean {
  return BASE58_RE.test(value);
}

export function resolveSolanaRpcUrl(): string {
  const url =
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    (process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : undefined);
  if (!url) {
    throw new Error(
      "Set SOLANA_RPC_URL, NEXT_PUBLIC_SOLANA_RPC_URL, or HELIUS_API_KEY",
    );
  }
  return url;
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(resolveSolanaRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`RPC HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    error?: { message?: string };
    result?: T;
  };
  if (body.error) {
    throw new Error(body.error.message ?? "RPC error");
  }
  if (body.result === undefined) {
    throw new Error("RPC missing result");
  }
  return body.result;
}

export async function fetchMintDecimals(mint: string): Promise<number> {
  const result = await rpcCall<{
    value?: {
      data?: { parsed?: { info?: { decimals?: number } } };
    } | null;
  }>("getAccountInfo", [mint, { encoding: "jsonParsed" }]);

  const decimals = result.value?.data?.parsed?.info?.decimals;
  if (typeof decimals !== "number" || decimals < 0 || decimals > 18) {
    throw new Error(`Could not read decimals for mint ${mint}`);
  }
  return decimals;
}

export async function fetchGuardBalanceRaw(
  owner: string,
  mint: string,
): Promise<bigint> {
  const result = await rpcCall<{
    value?: Array<{
      account?: {
        data?: {
          parsed?: {
            info?: {
              tokenAmount?: { amount?: string; decimals?: number };
            };
          };
        };
      };
    }>;
  }>("getTokenAccountsByOwner", [
    owner,
    { mint },
    { encoding: "jsonParsed" },
  ]);

  let total = 0n;
  for (const item of result.value ?? []) {
    const amount = item.account?.data?.parsed?.info?.tokenAmount?.amount;
    if (typeof amount === "string") {
      try {
        total += BigInt(amount);
      } catch {
        /* skip malformed */
      }
    }
  }
  return total;
}
