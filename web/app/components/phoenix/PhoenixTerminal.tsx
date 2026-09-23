"use client";

import Link from "next/link";
import { usePhoenixStatus } from "@/lib/phoenix/usePhoenixStatus";
import { AGENT_ID, DASHBOARD_URL, REPO_RAW } from "@/lib/phoenix/constants";
import {
  capPctFrom,
  computeTradingReturnPct,
  formatAge,
  formatPct,
  heroHint,
  limitPct,
  limitProgressClass,
  statusBadgeClass,
  truncateHash,
} from "@/lib/phoenix/statusDisplay";

function TerminalRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-xs text-[#8888aa]">{label}</dt>
      <dd className="font-mono text-sm mb-3">{children}</dd>
    </>
  );
}

function SigLink({ sig }: { sig?: string | null }) {
  if (!sig) return <>—</>;
  return (
    <a
      href={`https://solscan.io/tx/${sig}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#00f5c4] hover:underline"
    >
      <code>{sig.slice(0, 8)}…</code>
    </a>
  );
}

function LimitBar({ pct, label }: { pct: number; label: string }) {
  return (
    <progress
      className={`progress progress-sm mt-1 w-full ${limitProgressClass(pct)}`}
      value={pct}
      max={100}
      aria-label={label}
    />
  );
}

function TerminalCard({
  title,
  wide,
  loading,
  children,
}: {
  title: string;
  wide?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`sg-card p-6 ${wide ? "md:col-span-2" : ""}`}>
      <div>
        <h3 className="text-sm text-[#8888aa]">{title}</h3>
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-[#ffffff12]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[#ffffff12]" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-[#ffffff12]" />
          </div>
        ) : (
          <dl>{children}</dl>
        )}
      </div>
    </div>
  );
}

export function PhoenixTerminal() {
  const { data, computed, error, loading } = usePhoenixStatus();
  const isLoading = loading && !data;

  const agentId = (data?.agent_id as string) || AGENT_ID;
  const dashboardUrl = DASHBOARD_URL.replace(/agent=[^&]+/, `agent=${agentId}`);
  const portfolioUrl = `${dashboardUrl}&tab=portfolio`;
  const wallet = data?.wallet_address as string | undefined;
  const q = (data?.quoting ?? {}) as Record<string, unknown>;
  const pnl = (data?.pnl ?? {}) as Record<string, unknown>;
  const fills = (data?.fills ?? {}) as Record<string, unknown>;
  const returnPct = computeTradingReturnPct(pnl);
  const ddPct = capPctFrom(pnl, "drawdown");
  const invPct = capPctFrom(pnl, "inventory");
  const levPct = capPctFrom(pnl, "leverage");
  const hbProof = data?.last_heartbeat_proof
    ? `${REPO_RAW}/${data.last_heartbeat_proof}`
    : null;

  const proofLinks = [
    { href: portfolioUrl, label: "ClawPump portfolio" },
    { href: dashboardUrl, label: "Agent dashboard" },
    wallet && { href: `https://solscan.io/account/${wallet}`, label: "Solscan wallet" },
    hbProof && { href: hbProof, label: "Heartbeat proof" },
    { href: "https://github.com/williamsburgsh-commits/SpecGuard", label: "GitHub repo" },
    data?.spec_url && { href: String(data.spec_url), label: "Raw spec JSON" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <section id="live" className="sg-shell pb-24 pt-32">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="sg-headline">Phoenix</h1>
          <p className="mt-2 max-w-xl text-sm text-[#8888aa]">
            Operator state from status.json, refreshed every 15 seconds.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {computed ? (
            <span className={`rounded-full border border-[#ffffff18] px-3 py-1 text-xs ${statusBadgeClass(String(computed.displayStatus))}`}>
              <span
                className={`status status-xs ${
                  computed.displayStatus === "GREEN" ? "sg-hb-dot-live" : ""
                }`}
                aria-hidden="true"
              />
              {computed.displayStatus}
            </span>
          ) : null}
          <span className="rounded-full border border-[#ffffff18] px-3 py-1 font-mono text-xs">
            {data?.last_heartbeat_at
              ? `HB ${new Date(String(data.last_heartbeat_at)).toISOString().slice(11, 19)}Z`
              : "HB —"}
          </span>
          {data?.spec_url ? (
            <a
              href={String(data.spec_url)}
              target="_blank"
              rel="noreferrer"
              className="sg-btn-ghost h-8 min-h-8 px-3 text-xs"
            >
              Spec ↗
            </a>
          ) : null}
        </div>
      </header>

      {error && !data ? (
        <div role="alert" className="sg-card mb-6 border-[#ff3b3b]/30 p-4 text-sm text-[#8888aa]">
          <span>Could not load status: {error}</span>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <TerminalCard title="Live state" loading={isLoading}>
          {computed && data ? (
            <>
              <TerminalRow label="Operator status">
                <span className={`rounded-full border border-[#ffffff18] px-2 py-0.5 text-xs ${statusBadgeClass(String(computed.operatorStatus))}`}>
                  {computed.operatorStatus}
                </span>
              </TerminalRow>
              <TerminalRow label="Display status">
                <span className={`rounded-full border border-[#ffffff18] px-2 py-0.5 text-xs ${statusBadgeClass(String(computed.displayStatus))}`}>
                  {computed.displayStatus}
                </span>
              </TerminalRow>
              <TerminalRow label="Last heartbeat">
                {String(data.last_heartbeat_at || "never")}
              </TerminalRow>
              <TerminalRow label="Heartbeat age">
                {computed.ageSec == null ? "—" : formatAge(computed.ageSec)}
              </TerminalRow>
              <TerminalRow label="TTL">{computed.ttl}s</TerminalRow>
              <TerminalRow label="Copy-trade">
                <span className="rounded-full border border-[#ffffff18] px-2 py-0.5 text-xs">
                  {computed.copyEligible ? "eligible" : "not eligible"}
                </span>
              </TerminalRow>
              <TerminalRow label="Agent ID">
                <code>{agentId}</code>
              </TerminalRow>
            </>
          ) : null}
        </TerminalCard>

        <TerminalCard title="Public spec" loading={isLoading}>
          {data ? (
            <>
              <TerminalRow label="Market">{String(data.market || "—")}</TerminalRow>
              <TerminalRow label="Spec URL">
                <a
                  href={String(data.spec_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="link-underline"
                  title={String(data.spec_url)}
                >
                  reference-spec.json
                </a>
              </TerminalRow>
              <TerminalRow label="Spec SHA256">
                <span className="tooltip tooltip-top" data-tip={String(data.spec_sha256 ?? "")}>
                  <code>{truncateHash(String(data.spec_sha256))}</code>
                </span>
              </TerminalRow>
            </>
          ) : null}
        </TerminalCard>

        <TerminalCard title="Quoting activity" loading={isLoading}>
          {data ? (
            <>
              <TerminalRow label="Operator">{String(q.operator || "—")}</TerminalRow>
              <TerminalRow label="Spread">
                {q.spread_bps != null ? `${q.spread_bps} bps` : "—"}
              </TerminalRow>
              <TerminalRow label="Quote size">
                {q.quantity_sol != null ? `${q.quantity_sol} SOL` : "—"}
              </TerminalRow>
              <TerminalRow label="Isolated margin">
                {q.margin_usdc != null ? `$${q.margin_usdc}` : "—"}
              </TerminalRow>
              <TerminalRow label="Last cycle">{String(q.last_cycle_at || "—")}</TerminalRow>
              <TerminalRow label="Last action">{String(q.last_action || "—")}</TerminalRow>
              <TerminalRow label="Cycles (total)">
                {q.cycles_total != null ? String(q.cycles_total) : "—"}
              </TerminalRow>
              <TerminalRow label="Posts / cancels">
                {q.posts_total != null && q.cancels_total != null
                  ? `${q.posts_total} / ${q.cancels_total}`
                  : "—"}
              </TerminalRow>
              <TerminalRow label="Last mark">
                {q.last_mark_usd != null ? `$${q.last_mark_usd}` : "—"}
              </TerminalRow>
              <TerminalRow label="Last bid sig">
                <SigLink sig={q.last_bid_sig as string} />
              </TerminalRow>
              <TerminalRow label="Last ask sig">
                <SigLink sig={q.last_ask_sig as string} />
              </TerminalRow>
              <TerminalRow label="Open orders">
                {q.open_order_count != null ? String(q.open_order_count) : "—"}
              </TerminalRow>
            </>
          ) : null}
        </TerminalCard>

        <TerminalCard title="PnL overlay" loading={isLoading}>
          {data ? (
            <>
              <TerminalRow label="Book">
                <span
                  className={`badge ${
                    returnPct == null
                      ? "badge-neutral"
                      : returnPct >= 0
                        ? "badge-success"
                        : "badge-error"
                  }`}
                >
                  {returnPct == null
                    ? "—"
                    : returnPct >= 0
                      ? `profitable ${formatPct(returnPct)}`
                      : formatPct(returnPct)}
                </span>
              </TerminalRow>
              <TerminalRow label="Drawdown">
                <div>
                  {formatPct(ddPct, { sign: false, digits: 0 })} of cap
                  <LimitBar pct={limitPct(ddPct, 100)} label="Drawdown" />
                </div>
              </TerminalRow>
              <TerminalRow label="Inventory">
                <div>
                  {formatPct(invPct, { sign: false, digits: 0 })} of cap
                  <LimitBar pct={limitPct(invPct, 100)} label="Inventory" />
                </div>
              </TerminalRow>
              <TerminalRow label="Leverage">
                {formatPct(levPct, { sign: false, digits: 0 })} of cap
              </TerminalRow>
              <TerminalRow label="Within spec">
                {pnl.within_spec == null ? (
                  "—"
                ) : (
                  <span className={`badge ${pnl.within_spec ? "badge-success" : "badge-error"}`}>
                    {pnl.within_spec ? "yes" : "no"}
                  </span>
                )}
              </TerminalRow>
              <TerminalRow label="Updated">{String(pnl.updated_at || "—")}</TerminalRow>
            </>
          ) : null}
        </TerminalCard>

        <TerminalCard title="Fills" loading={isLoading}>
          {data ? (
            <>
              <TerminalRow label="Fill count">
                {fills.count != null ? String(fills.count) : "0"}
              </TerminalRow>
              <TerminalRow label="Maker share">
                {fills.maker_pct != null
                  ? formatPct(Number(fills.maker_pct), { sign: false, digits: 0 })
                  : "—"}
              </TerminalRow>
              <TerminalRow label="Last fill">{String(fills.last_fill_at || "—")}</TerminalRow>
              <TerminalRow label="Position size">
                {fills.position_size_sol != null ? `${fills.position_size_sol} SOL` : "—"}
              </TerminalRow>
              <TerminalRow label="Last fill sig">
                <SigLink sig={fills.last_fill_sig as string} />
              </TerminalRow>
            </>
          ) : null}
        </TerminalCard>

        <TerminalCard title="Proof links" wide loading={isLoading}>
          {data ? (
            <div className="flex flex-wrap gap-2">
              {proofLinks.map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sg-btn-ghost h-8 min-h-8 px-3 text-xs"
                >
                  {label} ↗
                </a>
              ))}
            </div>
          ) : null}
        </TerminalCard>

        <div className="sg-card md:col-span-2 p-6">
          <h3 className="font-medium">STALE / copy-trade rules</h3>
          <div className="text-sm text-[#8888aa]">
            <p>
              Copy-trade is eligible only when <strong>operator status is GREEN</strong> and the
              heartbeat is fresh.
            </p>
            <ul className="my-3 list-inside list-disc space-y-1">
              <li>
                <code>heartbeat_age = now - last_heartbeat_at</code>
              </li>
              <li>
                <strong>STALE</strong> if heartbeat age &gt; TTL (300s)
              </li>
              <li>
                <strong>Copy-trade eligible</strong> if GREEN and not STALE
              </li>
              <li>Breach includes drawdown, inventory, notional, leverage, disallowed tools</li>
            </ul>
            {computed ? <p>{heroHint(computed, pnl)}</p> : null}
            {error ? (
              <div role="alert" className="mt-3 text-[#8888aa]">
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-10 text-sm">
        <Link href="/" className="text-sm text-[#8888aa] hover:text-[#00f5c4]">
          Back home
        </Link>
      </p>
    </section>
  );
}
