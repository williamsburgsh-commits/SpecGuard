import type { SolanaWalletProvider } from "./sendPolicyMemo";

export type SolanaWalletId =
  | "phantom"
  | "solflare"
  | "backpack"
  | "coinbase";

export interface SolanaWalletDefinition {
  id: SolanaWalletId;
  name: string;
  installUrl: string;
  getProvider: () => SolanaWalletProvider | null;
}

const DEFINITIONS: SolanaWalletDefinition[] = [
  {
    id: "phantom",
    name: "Phantom",
    installUrl: "https://phantom.app/download",
    getProvider: () => {
      if (typeof window === "undefined") return null;
      const provider = window.phantom?.solana;
      return provider?.isPhantom ? provider : null;
    },
  },
  {
    id: "solflare",
    name: "Solflare",
    installUrl: "https://solflare.com/download",
    getProvider: () => {
      if (typeof window === "undefined") return null;
      const provider = window.solflare;
      if (!provider || typeof provider.connect !== "function") return null;
      return provider;
    },
  },
  {
    id: "backpack",
    name: "Backpack",
    installUrl: "https://backpack.app/download",
    getProvider: () => {
      if (typeof window === "undefined") return null;
      const provider = window.backpack;
      return provider?.isBackpack ? provider : null;
    },
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    installUrl: "https://www.coinbase.com/wallet/downloads",
    getProvider: () => {
      if (typeof window === "undefined") return null;
      return window.coinbaseSolana ?? null;
    },
  },
];

export interface SolanaWalletOption extends SolanaWalletDefinition {
  installed: boolean;
}

export function listSolanaWalletOptions(): SolanaWalletOption[] {
  return DEFINITIONS.map((def) => ({
    ...def,
    installed: def.getProvider() !== null,
  }));
}

export function getSolanaWalletDefinition(
  id: SolanaWalletId,
): SolanaWalletDefinition | undefined {
  return DEFINITIONS.find((d) => d.id === id);
}

export async function connectSolanaWallet(id: SolanaWalletId): Promise<{
  provider: SolanaWalletProvider;
  publicKey: string;
  name: string;
}> {
  const def = getSolanaWalletDefinition(id);
  if (!def) throw new Error("Unknown wallet");

  const provider = def.getProvider();
  if (!provider) {
    throw new Error(`${def.name} is not installed`);
  }

  await provider.connect();
  const publicKey = provider.publicKey?.toString();

  if (!publicKey) {
    throw new Error(`${def.name} did not return a public key`);
  }

  return { provider, publicKey, name: def.name };
}

declare global {
  interface Window {
    solflare?: SolanaWalletProvider & { isSolflare?: boolean };
    backpack?: SolanaWalletProvider & { isBackpack?: boolean };
    coinbaseSolana?: SolanaWalletProvider;
  }
}
