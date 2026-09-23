"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { shortPubkey } from "@/lib/format";
import {
  getSolanaWalletDefinition,
  listSolanaWalletOptions,
  type SolanaWalletId,
  type SolanaWalletOption,
} from "@/lib/register/walletProviders";
import { WalletDialog, WalletPanelShell } from "@/app/components/wallet/WalletDialog";
import { WalletSelectList } from "@/app/components/wallet/WalletSelectList";
import { cn } from "@/lib/utils";

const ADAPTER_NAMES: Record<SolanaWalletId, string> = {
  phantom: "Phantom",
  solflare: "Solflare",
  backpack: "Backpack",
  coinbase: "Coinbase Wallet",
};

type WalletConnectProps = {
  className?: string;
  variant?: "header" | "panel";
  appearance?: "primary" | "ghost";
};

export function WalletConnect({
  className,
  variant = "header",
  appearance = "primary",
}: WalletConnectProps) {
  const connectBtnClass = appearance === "ghost" ? "sg-btn-ghost" : "sg-btn-primary";
  const { connected, publicKey, disconnect, wallets, select, connect, connecting, wallet } =
    useWallet();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<SolanaWalletId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<SolanaWalletOption[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted) setOptions(listSolanaWalletOptions());
  }, [mounted]);

  const address = publicKey?.toBase58() ?? null;

  const refreshOptions = useCallback(() => {
    setOptions(listSolanaWalletOptions());
  }, []);

  const onConnect = useCallback(
    async (id: SolanaWalletId) => {
      setError(null);
      setPendingId(id);
      try {
        const def = getSolanaWalletDefinition(id);
        const adapterLabel = ADAPTER_NAMES[id];
        const match = wallets.find((w) => w.adapter.name === adapterLabel);

        if (match) {
          if (
            match.readyState !== WalletReadyState.Installed &&
            match.readyState !== WalletReadyState.Loadable
          ) {
            throw new Error(`${def?.name ?? id} is not installed`);
          }
          select(match.adapter.name);
          await connect();
          setOpen(false);
          return;
        }

        if (!def?.getProvider()) {
          throw new Error(`${def?.name ?? id} is not installed`);
        }
        throw new Error(
          `${def.name} is not supported here yet. Try Phantom, Solflare, or Coinbase Wallet.`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Connection failed");
      } finally {
        setPendingId(null);
      }
    },
    [wallets, select, connect],
  );

  const list = (
    <WalletSelectList
      wallets={options}
      connecting={connecting}
      pendingId={pendingId}
      error={error}
      onConnect={(id) => void onConnect(id)}
      onRefresh={refreshOptions}
    />
  );

  if (!mounted) {
    if (variant === "panel") {
      return (
        <WalletPanelShell title="Connect your agent wallet" subtitle="Detecting installed extensions…">
          <div className="px-4 py-8 text-center text-sm text-[#8888aa]">Loading…</div>
        </WalletPanelShell>
      );
    }
    return (
      <button type="button" className={cn(connectBtnClass, className)} disabled>
        Connect Wallet
      </button>
    );
  }

  if (variant === "panel") {
    if (connected && address) return null;
    return (
      <WalletPanelShell
        title="Connect your agent wallet"
        subtitle="This is the wallet your agent trades from. Not your personal wallet."
        className={className}
      >
        {list}
      </WalletPanelShell>
    );
  }

  if (connected && address) {
    return (
      <div className={cn("relative", className)}>
        <details className="group">
          <summary className="sg-btn-ghost cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            {wallet?.adapter.name ? `${wallet.adapter.name} · ` : ""}
            <span className="font-mono">{shortPubkey(address)}</span>
          </summary>
          <div className="absolute right-0 z-[120] mt-2 w-48 rounded-2xl border border-[#ffffff0f] bg-[#0f0f1a] p-2">
            <button
              type="button"
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#8888aa] hover:bg-[#ffffff08] hover:text-white"
              onClick={() => void disconnect()}
            >
              Disconnect
            </button>
          </div>
        </details>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(connectBtnClass, className)}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Connect Wallet
      </button>
      <WalletDialog
        open={open}
        onOpenChange={setOpen}
        title="Connect wallet"
        subtitle="Choose a Solana wallet extension"
      >
        {list}
      </WalletDialog>
    </>
  );
}
