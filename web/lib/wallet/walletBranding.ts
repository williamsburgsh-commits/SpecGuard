import type { SolanaWalletId } from "@/lib/register/walletProviders";

/** Served from web/public/wallets (reliable vs external CDN). */
export function walletIconUrl(id: SolanaWalletId): string {
  return `/wallets/${id}.svg`;
}

export const WALLET_TAGLINE: Record<SolanaWalletId, string> = {
  phantom: "Popular browser extension",
  solflare: "Secure Solana wallet",
  backpack: "Multi-chain wallet",
  coinbase: "Coinbase Wallet extension",
};
