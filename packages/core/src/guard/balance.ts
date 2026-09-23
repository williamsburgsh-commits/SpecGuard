/** Default raw minimum when env not set: 2M tokens × 10^6 decimals. */
export const DEFAULT_GUARD_MIN_BALANCE_RAW = 2_000_000_000_000n;

export function parseGuardMinBalanceRaw(
  envValue: string | undefined,
): bigint {
  if (!envValue?.trim()) return DEFAULT_GUARD_MIN_BALANCE_RAW;
  try {
    const n = BigInt(envValue.trim());
    if (n <= 0n) return DEFAULT_GUARD_MIN_BALANCE_RAW;
    return n;
  } catch {
    return DEFAULT_GUARD_MIN_BALANCE_RAW;
  }
}

export function meetsGuardMinimum(
  balanceRaw: bigint,
  minBalanceRaw: bigint,
): boolean {
  return balanceRaw >= minBalanceRaw;
}

export function formatTokenWhole(
  amountRaw: bigint,
  decimals: number,
): string {
  if (decimals <= 0) return amountRaw.toString();
  const base = 10n ** BigInt(decimals);
  const whole = amountRaw / base;
  const frac = amountRaw % base;
  if (frac === 0n) return whole.toLocaleString("en-US");
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}.${fracStr}`;
}
