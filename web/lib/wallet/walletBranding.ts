import type { SolanaWalletId } from "@/lib/register/walletProviders";

const WALLET_ICON_EXT: Partial<Record<SolanaWalletId, "png" | "svg">> = {
  phantom: "png",
  solflare: "png",
};

/** Served from web/public/wallets (reliable vs external CDN). */
export function walletIconUrl(id: SolanaWalletId): string {
  const ext = WALLET_ICON_EXT[id] ?? "svg";
  return `/wallets/${id}.${ext}`;
}

export const WALLET_TAGLINE: Record<SolanaWalletId, string> = {
  phantom: "Popular browser extension",
  solflare: "Secure Solana wallet",
  backpack: "Multi-chain wallet",
  coinbase: "Coinbase Wallet extension",
};
