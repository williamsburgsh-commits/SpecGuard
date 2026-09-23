"use client";

import type { SolanaWalletId, SolanaWalletOption } from "@/lib/register/walletProviders";
import { WALLET_TAGLINE, walletIconUrl } from "@/lib/wallet/walletBranding";
import { cn } from "@/lib/utils";

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
      <button
        type="button"
        disabled={connecting}
        onClick={() => onConnect(wallet.id)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#ffffff08]",
          connecting && !pending && "opacity-50",
        )}
      >
        <img
          src={walletIconUrl(wallet.id)}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg bg-[#08080f] object-contain p-0.5"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{wallet.name}</span>
          <span className="block truncate text-xs text-[#8888aa]">{WALLET_TAGLINE[wallet.id]}</span>
        </span>
        <span className="shrink-0 rounded-full bg-[#00ff88]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#00ff88]">
          Detected
        </span>
        {pending ? (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#00f5c4] border-t-transparent"
            aria-hidden
          />
        ) : (
          <span className="shrink-0 text-[#8888aa]" aria-hidden>
            →
          </span>
        )}
      </button>
    );
  }

  return (
    <a
      href={wallet.installUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#ffffff08]"
    >
      <img
        src={walletIconUrl(wallet.id)}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 rounded-lg bg-[#08080f] object-contain p-0.5 opacity-70 grayscale"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{wallet.name}</span>
        <span className="block text-xs text-[#8888aa]">Install extension</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-[#00f5c4]">Get →</span>
    </a>
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
