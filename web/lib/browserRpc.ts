/** Client-safe RPC URL (inlined from `next.config.mjs` `env`). */
export function resolveBrowserRpcUrl(): string {
  const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SOLANA_RPC_URL is not configured. Add it to the repo root .env (see .env.example), or set HELIUS_API_KEY and restart `npm run web:dev`.",
    );
  }
  return url;
}
