"use client";

import type { SolanaWalletId, SolanaWalletOption } from "@/lib/register/walletProviders";
import { WALLET_TAGLINE, walletIconUrl } from "@/lib/wallet/walletBranding";
import { cn } from "@/lib/utils";

function WalletIcon({ id, dimmed }: { id: SolanaWalletId; dimmed?: boolean }) {
  return (
    <img
      src={walletIconUrl(id)}
      alt=""
      width={40}
      height={40}
      className={cn(
        "h-10 w-10 shrink-0 rounded-xl object-cover",
        dimmed && "opacity-60 grayscale",
      )}
    />
  );
}

function WalletRow({
  wallet,
  connecting,
  pendingId,
  onConnect,
}: {
  wallet: SolanaWalletOption;
  connecting: boolean;
  pendingId: SolanaWalletId | null;
  onConnect: (id: SolanaWalletId) => void;
}) {
  const pending = connecting && pendingId === wallet.id;

  if (wallet.installed) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <WalletIcon id={wallet.id} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{wallet.name}</p>
          <p className="truncate text-xs text-[#8888aa]">{WALLET_TAGLINE[wallet.id]}</p>
        </div>
        <button
          type="button"
          disabled={connecting}
          onClick={() => onConnect(wallet.id)}
          className={cn(
            "sg-btn-primary h-9 min-h-9 shrink-0 px-4 text-sm",
            connecting && !pending && "opacity-50",
          )}
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#08080f] border-t-transparent"
                aria-hidden
              />
              Connecting…
            </span>
          ) : (
            "Connect"
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <WalletIcon id={wallet.id} dimmed />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{wallet.name}</p>
        <p className="text-xs text-[#8888aa]">Install extension</p>
      </div>
      <a
        href={wallet.installUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="sg-btn-ghost h-9 min-h-9 shrink-0 px-4 text-sm"
      >
        Install
      </a>
    </div>
  );
}

export function WalletSelectList({
  wallets,
  connecting,
  pendingId,
  error,
  onConnect,
  onRefresh,
  className,
}: {
  wallets: SolanaWalletOption[];
  connecting: boolean;
  pendingId: SolanaWalletId | null;
  error: string | null;
  onConnect: (id: SolanaWalletId) => void;
  onRefresh?: () => void;
  className?: string;
}) {
  const detected = wallets.filter((w) => w.installed);
  const other = wallets.filter((w) => !w.installed);

  return (
    <div className={cn("flex flex-col", className)}>
      {error ? (
        <div className="mx-4 mt-4 rounded-xl border border-[#ff3b3b]/40 bg-[#ff3b3b]/10 px-3 py-2 text-sm text-[#ff3b3b]">
          {error}
        </div>
      ) : null}

      {detected.length > 0 ? (
        <div className="py-1">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#8888aa]">
            Detected
          </p>
          <div className="divide-y divide-[#ffffff0f]">
            {detected.map((w) => (
              <WalletRow
                key={w.id}
                wallet={w}
                connecting={connecting}
                pendingId={pendingId}
                onConnect={onConnect}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-[#8888aa]">
          <p className="font-medium text-white">No wallet detected</p>
          <p className="mt-1">Install a Solana wallet extension, then refresh this page.</p>
          {onRefresh ? (
            <button type="button" className="sg-btn-ghost mt-4 h-9 min-h-9 px-4" onClick={onRefresh}>
              Refresh detection
            </button>
          ) : null}
        </div>
      )}

      {other.length > 0 ? (
        <div className="border-t border-[#ffffff0f] py-1">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#8888aa]">
            More wallets
          </p>
          <div className="divide-y divide-[#ffffff0f]">
            {other.map((w) => (
              <WalletRow
                key={w.id}
                wallet={w}
                connecting={connecting}
                pendingId={pendingId}
                onConnect={onConnect}
              />
            ))}
          </div>
        </div>
      ) : null}

      <p className="border-t border-[#ffffff0f] px-4 py-3 text-center text-[11px] leading-relaxed text-[#8888aa]">
        Only connect the wallet your bot will trade from. You will approve a policy memo on Solana.
      </p>
    </div>
  );
}
