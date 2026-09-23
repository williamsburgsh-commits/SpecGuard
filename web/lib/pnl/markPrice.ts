import { WSOL_MINT } from "@specguard/core";

export async function fetchSolUsdcMark(): Promise<number> {
  const base =
    process.env.JUPITER_PRICE_API_BASE?.replace(/\/$/, "") ??
    "https://api.jup.ag/price/v3";
  const url = `${base}?ids=${WSOL_MINT}`;
  const headers: Record<string, string> = {};
  const key = process.env.JUPITER_API_KEY;
  if (key) headers["x-api-key"] = key;

  const res = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`Jupiter price HTTP ${res.status}`);
  }
  const body = (await res.json()) as Record<
    string,
    { usdPrice?: number } | undefined
  >;
  const price = body[WSOL_MINT]?.usdPrice;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("Jupiter price missing SOL/USDC mark");
  }
  return price;
}
