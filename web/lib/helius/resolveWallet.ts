function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** Pick the registered agent wallet this enhanced tx belongs to. */
export function resolveWalletForPayload(
  payload: unknown,
  registeredWallets: ReadonlySet<string>,
): string | null {
  const tx = asRecord(payload);
  if (!tx) return null;

  const feePayer = tx.feePayer;
  if (typeof feePayer === "string" && registeredWallets.has(feePayer)) {
    return feePayer;
  }

  const accountData = tx.accountData;
  if (Array.isArray(accountData)) {
    for (const item of accountData) {
      const rec = asRecord(item);
      const account = rec?.account;
      if (typeof account === "string" && registeredWallets.has(account)) {
        return account;
      }
    }
  }

  const nativeTransfers = tx.nativeTransfers;
  if (Array.isArray(nativeTransfers)) {
    for (const item of nativeTransfers) {
      const rec = asRecord(item);
      for (const key of ["fromUserAccount", "toUserAccount"] as const) {
        const addr = rec?.[key];
        if (typeof addr === "string" && registeredWallets.has(addr)) {
          return addr;
        }
      }
    }
  }

  if (typeof feePayer === "string") return feePayer;
  return null;
}
