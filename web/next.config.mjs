import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

const webDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(webDir, "..");

loadEnvConfig(repoRoot);
loadEnvConfig(webDir);

function resolvePublicSolanaRpcUrl() {
  if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  }
  if (process.env.HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  }
  return undefined;
}

const solanaRpc = resolvePublicSolanaRpcUrl();

const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SPECGUARD_AGENT_WALLET:
    process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET,
  NEXT_PUBLIC_SOLANA_RPC_URL: solanaRpc,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_PHOENIX_URL: process.env.NEXT_PUBLIC_PHOENIX_URL,
  NEXT_PUBLIC_GUARD_MINT: process.env.NEXT_PUBLIC_GUARD_MINT,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@specguard/core",
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
    "@solana/wallet-adapter-wallets",
  ],
  env: publicEnv,
  webpack: (config, { webpack }) => {
    if (solanaRpc) {
      config.plugins.push(
        new webpack.DefinePlugin({
          "process.env.NEXT_PUBLIC_SOLANA_RPC_URL": JSON.stringify(solanaRpc),
        }),
      );
    }
    return config;
  },
};

export default nextConfig;