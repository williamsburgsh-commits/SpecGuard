import Link from "next/link";
import { notFound } from "next/navigation";
import { shortPubkey } from "@specguard/core";
import { VerifyButton } from "@/app/components/VerifyButton";
import { AgentTxList } from "@/app/components/AgentTxList";
import { fetchAgentDetail } from "@/lib/agents/fetchAgentDetail";
import { fetchAgentTxCount, fetchAgentTxHistory } from "@/lib/agents/fetchAgentHistory";
import { getSupabasePublic } from "@/lib/supabase/public";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { PolicyCard } from "@/components/ui/PolicyCard";
import { BadgeEmbed } from "@/components/ui/BadgeEmbed";
import { CopyButton } from "@/components/ui/CopyButton";
import { solscanAccount, solscanTx } from "@/lib/solana/explorer";

export const dynamic = "force-dynamic";

export default async function AgentPage({
  params,
}: {
  params: { wallet: string };
}) {
  const wallet = params.wallet;
  const supabase = getSupabasePublic();
  const agent = await fetchAgentDetail(supabase, wallet);
  if (!agent) notFound();

  const [history, txCount] = await Promise.all([
    fetchAgentTxHistory(supabase, wallet, { limit: 50 }),
    fetchAgentTxCount(supabase, wallet),
  ]);

  const daysActive = agent.registeredAt
    ? Math.max(0, Math.floor((Date.now() - new Date(agent.registeredAt).getTime()) / 86_400_000))
    : 0;
  const breaches = agent.statusEvents.filter((ev) => ev.toStatus === "RED");

  return (
    <div className="sg-shell pb-24 pt-32">
      <article className="sg-card overflow-hidden">
        {agent.status === "RED" ? (
          <div className="bg-[#ff3b3b]/15 px-6 py-3 text-sm text-[#ff3b3b]">
            BREACHED — {new Date(agent.statusSince).toISOString().slice(0, 10)}
            {agent.proofSig ? (
              <>
                {" "}
                — Proof tx:{" "}
                <a
                  href={solscanTx(agent.proofSig)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono underline"
                >
                  {shortPubkey(agent.proofSig, 8)}
                </a>
              </>
            ) : null}
          </div>
        ) : null}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">{agent.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="font-mono text-sm text-[#8888aa]">{wallet}</p>
                <CopyButton value={wallet} />
                <a href={solscanAccount(wallet)} target="_blank" rel="noreferrer" className="text-sm text-[#00f5c4] hover:underline">
                  Solscan ↗
                </a>
              </div>
              <p className="mt-4 text-sm text-[#8888aa]">
                Active since {agent.registeredAt ? new Date(agent.registeredAt).toLocaleDateString() : "—"} — {daysActive} days
              </p>
            </div>
            <StatusBadge status={agent.status} size="lg" />
          </div>
          <VerifyButton wallet={wallet} />
        </div>
      </article>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Realized PnL"
          value={agent.realizedUsdc}
          prefix="$"
          digits={2}
          tone={agent.realizedUsdc != null && agent.realizedUsdc < 0 ? "red" : "green"}
        />
        <StatCard label="Total Transactions" value={txCount} />
        <StatCard label="Days Active" value={daysActive} />
        <StatCard
          label="Current Drawdown %"
          value={agent.drawdownPct}
          suffix="%"
          digits={2}
        />
      </div>

      {agent.policy ? (
        <div className="mt-8">
          <PolicyCard
            policy={{
              name: agent.policy.name,
              maxDrawdownPct: agent.policy.maxDrawdownPct,
              maxSpendPerTxSol: agent.policy.maxSpendPerTxSol,
              allowedVenues: agent.policy.allowedVenues,
              registeredAt: agent.registeredAt,
              memoSig: agent.policy.memoSig,
            }}
          />
        </div>
      ) : null}

      <section className="sg-card mt-8 p-6">
        <h2 className="text-xl font-bold">Transaction history</h2>
        <div className="mt-4">
          <AgentTxList
            wallet={wallet}
            initialItems={history.items}
            initialCursor={history.nextBefore}
          />
        </div>
      </section>

      <div className="mt-8">
        <BadgeEmbed wallet={wallet} />
      </div>

      <section className="sg-card mt-8 p-6">
        <h2 className="text-xl font-bold">Status history</h2>
        {breaches.length === 0 ? (
          <p className="mt-4 text-sm text-[#8888aa]">No breaches recorded.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#ffffff0f]">
            {agent.statusEvents.map((ev) => (
              <li key={ev.id} className="py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={ev.toStatus as "GREEN" | "RED"} size="sm" />
                  <span className="text-sm text-[#8888aa]">
                    {ev.reason.replace(/_/g, " ")} · {new Date(ev.occurredAt).toLocaleString()}
                  </span>
                </div>
                {ev.proofSig ? (
                  <a
                    href={solscanTx(ev.proofSig)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-mono text-xs text-[#00f5c4] hover:underline"
                  >
                    Proof: {shortPubkey(ev.proofSig, 8)}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/registry" className="mt-8 inline-block text-sm text-[#8888aa] hover:text-[#00f5c4]">
        ← Registry
      </Link>
    </div>
  );
}
