import { address, type Address } from "@solana/kit";

/** Wrapped SOL mint (Jupiter Trigger uses this, not native SOL account). */
export const WSOL_MINT = address(
  "So11111111111111111111111111111111111111112",
);

export const USDC_MINT = address(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
);

export const TRIGGER_PROGRAM_ID = address(
  "j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X",
);

export function resolveJupiterTriggerBaseUrl(): string {
  const override = process.env.JUPITER_TRIGGER_API_BASE;
  if (override) return override.replace(/\/$/, "");
  if (process.env.JUPITER_API_KEY) {
    return "https://api.jup.ag/trigger/v1";
  }
  return "https://lite-api.jup.ag/trigger/v1";
}

/** Jupiter Trigger minimum notional (~USD) enforced by API. */
export const TRIGGER_MIN_NOTIONAL_USDC = 5;

export function jupiterTriggerHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = process.env.JUPITER_API_KEY;
  if (key) headers["x-api-key"] = key;
  return headers;
}
