"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { StatusBadge } from "@/app/components/StatusBadge";
import { AgentStatusChip } from "@/app/components/AgentStatusChip";
import { shortPubkey, generateIdenticon, formatUsdc } from "@/lib/format";
import { solscanTx } from "@/app/components/StatusBadge";

interface AgentSummary {
  name: string;
  wallet: string;
  status: "GREEN" | "RED";
  statusSince: string;
  realizedUsdc: number | null;
  policy: { name: string; memoSig: string } | null;
  lastTxSig: string | null;
  proofSig: string | null;
  breachReason: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { connected, publicKey, disconnect } = useWallet();
  const address = publicKey?.toBase58() ?? null;
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || !address) {
      router.push("/register");
      return;
    }

    const loadAgent = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/agents/${address}`);
        const json = await res.json();
        if (json.ok && json.agent) {
          setSummary(json.agent);
        } else {
          setError("Agent not found in registry. Register first.");
        }
      } catch (e) {
        setError("Failed to load agent data");
      } finally {
        setLoading(false);
      }
    };

    loadAgent();
  }, [connected, address, router]);

  if (loading) {
    return (
      <div className="sg-shell flex min-h-[60vh] items-center justify-center pb-24 pt-32">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--cyan)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-brand">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!connected || !address) {
    return null;
  }

  if (error || !summary) {
    return (
      <div className="sg-shell pb-24 pt-32 text-center">
        <div className="sg-card max-w-md mx-auto p-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-[var(--red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="font-display text-xl font-bold mb-2">Agent not found</h2>
          <p className="text-muted-brand mb-6">{error || "This wallet is not registered yet."}</p>
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold sg-btn-gradient"
          >
            Register Agent
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sg-shell py-12">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 reveal-on-scroll">
        <div>
          <p className="sg-section-eyebrow animate-in">My Dashboard</p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight animate-in animate-in-delay-1">
            {summary.name}
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-brand animate-in animate-in-delay-2">
            {summary.wallet}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="sg-btn-ghost h-10 min-h-10" onClick={() => disconnect()}>
            Disconnect
          </button>
          <Link
            href="/registry"
            className="inline-flex h-8 items-center rounded-lg border border-[var(--border-bright)] px-3 text-sm font-medium hover:border-[var(--cyan)]"
          >
            View Registry
          </Link>
        </div>
      </header>

      {/* Status Hero Card */}
      <div className="sg-card p-6 lg:p-8 mb-8 reveal-on-scroll animate-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden relative">
              <img
                src={generateIdenticon(summary.wallet, 64)}
                alt=""
                className="w-full h-full object-cover"
                width={64}
                height={64}
              />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">{summary.name}</h2>
              <p className="font-mono text-sm text-muted-brand mt-1">{summary.wallet}</p>
            </div>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-3">
            <StatusBadge status={summary.status} size="lg" />
            <div className="flex items-center gap-4 text-sm text-muted-brand">
              <span>Active since {new Date(summary.statusSince).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <AgentStatusChip
          wallet={summary.wallet}
          initial={{
            status: summary.status,
            statusSince: summary.statusSince,
            lastTxSig: summary.lastTxSig,
          }}
          proofSig={summary.proofSig}
          breachReason={summary.breachReason}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8 reveal-on-scroll">
        <StatCard
          label="Realized PnL"
          value={formatUsdc(summary.realizedUsdc)}
          iconColor="var(--green)"
          delay={1}
        />
        <StatCard
          label="Status"
          value={summary.status}
          valueColor={summary.status === "GREEN" ? "var(--green)" : "var(--red)"}
          iconColor={summary.status === "GREEN" ? "var(--green)" : "var(--red)"}
          delay={2}
        />
        <StatCard
          label="Policy"
          value={summary.policy?.name ?? "—"}
          iconColor="var(--violet)"
          delay={3}
        />
        <StatCard
          label="Last Activity"
          value={summary.lastTxSig ? shortPubkey(summary.lastTxSig, 6) : "—"}
          iconColor="var(--cyan)"
          delay={4}
        />
      </div>

      {/* Policy & Badge Section */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8 reveal-on-scroll">
        <div className="sg-card p-6 animate-in animate-in-delay-1">
          <h3 className="font-display text-lg font-semibold text-[var(--cyan)] mb-4">Policy Memo</h3>
          {summary.policy ? (
            <>
              <p className="text-foreground mb-2">{summary.policy.name}</p>
              <a
                href={solscanTx(summary.policy.memoSig)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[var(--cyan)] link-underline"
              >
                View on Solscan →
              </a>
            </>
          ) : (
            <p className="text-muted-brand">No policy found</p>
          )}
        </div>

        <div className="sg-card p-6 animate-in animate-in-delay-2">
          <h3 className="font-display text-lg font-semibold text-[var(--cyan)] mb-4">Embeddable Badge</h3>
          <div className="overflow-hidden rounded-lg border border-[var(--border-bright)] bg-black/30">
            <img
              src={`/badge/${summary.wallet}`}
              alt={`SpecGuard status badge for ${summary.wallet}`}
              className="h-16 w-auto max-w-full"
              height={32}
            />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <label className="block text-muted-brand">Markdown</label>
            <pre className="bg-[var(--bg)] p-3 rounded font-mono text-xs overflow-auto text-[var(--cyan)]">
{`![SpecGuard Status](https://specguard.xyz/badge/${summary.wallet})`}
            </pre>
            <label className="block text-muted-brand">HTML</label>
            <pre className="bg-[var(--bg)] p-3 rounded font-mono text-xs overflow-auto text-[var(--cyan)]">
{`<img src="https://specguard.xyz/badge/${summary.wallet}" alt="SpecGuard Status" />`}
            </pre>
          </div>
        </div>
      </div>

      {/* Timeline / Links */}
      <div className="sg-card p-6 reveal-on-scroll animate-in">
        <h3 className="font-display text-lg font-semibold text-[var(--cyan)] mb-4">Quick Links</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href={`/agent/${summary.wallet}`}
            className="sg-card p-4 text-center hover:border-[var(--cyan)] transition-colors group"
          >
            <div className="text-2xl font-display text-[var(--cyan)] group-hover:scale-110 transition-transform">📊</div>
            <div className="mt-1 font-medium">Agent Timeline</div>
            <div className="text-xs text-muted-brand mt-0.5">Full history & proof</div>
          </Link>
          <a
            href={solscanTx(summary.proofSig || summary.lastTxSig || "")}
            target="_blank"
            rel="noreferrer"
            className="sg-card p-4 text-center hover:border-[var(--green)] transition-colors group"
          >
            <div className="text-2xl font-display text-[var(--green)] group-hover:scale-110 transition-transform">⛓️</div>
            <div className="mt-1 font-medium">Proof Transaction</div>
            <div className="text-xs text-muted-brand mt-0.5">Onchain verification</div>
          </a>
          <a
            href={`https://solscan.io/account/${summary.wallet}`}
            target="_blank"
            rel="noreferrer"
            className="sg-card p-4 text-center hover:border-[var(--violet)] transition-colors group"
          >
            <div className="text-2xl font-display text-[var(--violet)] group-hover:scale-110 transition-transform">🔍</div>
            <div className="mt-1 font-medium">Solscan Profile</div>
            <div className="text-xs text-muted-brand mt-0.5">Wallet explorer</div>
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor = "var(--text)",
  iconColor = "var(--cyan)",
  delay = 1,
}: {
  label: string;
  value: string;
  valueColor?: string;
  iconColor?: string;
  delay: number;
}) {
  return (
    <div className="sg-card p-5 animate-in" style={{ animationDelay: `${delay * 100}ms` }}>
      <p className="text-xs uppercase tracking-wider text-muted-brand font-pixel">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold" style={{ color: valueColor }}>{value}</p>
    </div>
  );
}