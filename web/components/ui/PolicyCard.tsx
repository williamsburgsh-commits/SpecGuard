import { cn } from "@/lib/utils";
import { solscanTx } from "@/lib/solana/explorer";

export type PolicyCardData = {
  name?: string;
  maxDrawdownPct: number;
  maxSpendPerTxSol: number;
  allowedVenues: string[];
  registeredAt?: string | null;
  memoSig?: string | null;
};

export function PolicyCard({
  policy,
  className,
  live,
}: {
  policy: PolicyCardData;
  className?: string;
  live?: boolean;
}) {
  const venues = policy.allowedVenues.length
    ? policy.allowedVenues.join(" / ")
    : "—";

  return (
    <div className={cn("sg-card p-6", className)}>
      <p className="text-xs uppercase tracking-[0.18em] text-[#8888aa]">
        {live ? "Live preview" : "Published Policy"}
      </p>
      {policy.name ? (
        <h3 className="mt-2 text-xl font-bold tracking-tight">{policy.name}</h3>
      ) : null}
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[#8888aa]">Max drawdown</dt>
          <dd className="font-mono">{policy.maxDrawdownPct}%</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#8888aa]">Max spend per tx</dt>
          <dd className="font-mono">{policy.maxSpendPerTxSol} SOL</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#8888aa]">Allowed venues</dt>
          <dd className="text-right">{venues}</dd>
        </div>
        {policy.registeredAt ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[#8888aa]">Registered</dt>
            <dd>{new Date(policy.registeredAt).toLocaleDateString()}</dd>
          </div>
        ) : null}
        {policy.memoSig ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[#8888aa]">Policy tx</dt>
            <dd>
              <a
                href={solscanTx(policy.memoSig)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-[#00f5c4] hover:underline"
              >
                {policy.memoSig.slice(0, 8)}…{policy.memoSig.slice(-6)}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-6 border-t border-[#ffffff0f] pt-4 text-xs leading-relaxed text-[#8888aa]">
        These limits are immutable onchain. This card reads from chain, not a database.
      </p>
    </div>
  );
}
