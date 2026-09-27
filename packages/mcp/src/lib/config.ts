export const DEFAULT_API_URL = "https://specguard.xyz";
export const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

export interface SpecGuardMcpConfig {
  apiUrl: string;
  rpcUrl: string;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SpecGuardMcpConfig {
  return {
    apiUrl: trimTrailingSlash(env.SPECGUARD_API_URL?.trim() || DEFAULT_API_URL),
    rpcUrl: env.SOLANA_RPC_URL?.trim() || DEFAULT_RPC_URL,
  };
}
