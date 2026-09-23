/** Infrastructure programs always allowed on trading txs (fees, memos, ATAs). */
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const COMPUTE_BUDGET_PROGRAM_ID =
  "ComputeBudget111111111111111111111111111111";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const ASSOCIATED_TOKEN_PROGRAM_ID =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

/** Wrapped SOL mint (Jupiter routes). */
export const WSOL_MINT =
  "So11111111111111111111111111111111111111112";

/** USDC mint (mainnet). */
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** $GUARD (SPECGU) mint — registration gate (Slice 13). */
export const GUARD_MINT = "BjbyvvuGbQwNZiYyk3aw1J9mAEUYkW1n5W5h6XAxxo5e";

/** Whole tokens required to register (NOTE G1). */
export const GUARD_MIN_WHOLE_TOKENS = 2_000_000;

/** Jupiter Aggregator v6 (swap). */
export const JUPITER_AGGREGATOR_V6_PROGRAM_ID =
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

/** Jupiter Limit Order / Trigger V1 program (Slice 5 may add V2 vault programs). */
export const JUPITER_TRIGGER_PROGRAM_ID =
  "j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X";

export const INFRASTRUCTURE_PROGRAM_IDS: readonly string[] = [
  SYSTEM_PROGRAM_ID,
  MEMO_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
];
