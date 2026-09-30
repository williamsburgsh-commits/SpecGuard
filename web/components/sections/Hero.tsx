"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusLamp } from "@/components/ui/StatusLamp";
import { shortPubkey, timeAgo } from "@/lib/format";
import type { LandingData } from "@/lib/home/loadLanding";
import { solscanAccount } from "@/lib/solana/explorer";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";

function CheckedAge({ iso }: { iso: string | null }) {
  const [label, setLabel] = useState(iso ? timeAgo(iso) : "—");

  useEffect(() => {
    if (!iso) return;
    setLabel(timeAgo(iso));
    const id = window.setInterval(() => setLabel(timeAgo(iso)), 1000);
    return () => window.clearInterval(id);
  }, [iso]);

  return <span className="tabular-nums">Last checked: {label}</span>;
}

function CountValue({ value }: { value: string }) {
  const reduced = usePrefersReducedMotion();
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  const prefix = value.trim().startsWith("$") ? "$" : "";
  const decimals = value.includes(".") ? 2 : 0;
  const [shown, setShown] = useState(reduced || !Number.isFinite(numeric) ? value : `${prefix}0`);

  useEffect(() => {
    if (reduced || !Number.isFinite(numeric)) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const current = numeric * eased;
      setShown(
        prefix
          ? `${prefix}${current.toLocaleString("en-US", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}`
          : Math.round(current).toLocaleString("en-US"),
      );
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [decimals, numeric, prefix, reduced, value]);

  return <span className="tabular-nums">{shown}</span>;
}

export function Hero({ data }: { data: LandingData }) {
  return (
    <section className="border-b border-[#2A2824] pt-20 pb-8 sm:pt-24 sm:pb-10">
      <div className="sg-shell grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="min-w-0">
          <p className="sg-kicker">Solana · public status light</p>
          <h1 className="sg-hero-headline mt-4 max-w-[16ch]">
            Your agent&apos;s limits, published where it can&apos;t edit them.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#A39E93] sm:text-lg">
            GREEN while the wallet stays inside the spec. RED, with the transaction, when it
            doesn&apos;t.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/register" className="sg-btn-primary">
              Register an agent
            </Link>
            <Link href="/registry" className="sg-text-link">
              View the registry →
            </Link>
          </div>
          <dl className="mt-8 grid grid-cols-1 gap-px border border-[#2A2824] bg-[#2A2824] sm:grid-cols-3">
            {[
              ["Chain", "Solana"],
              ["Signed by", "Trading wallet"],
              ["Watched by", "Helius"],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#0B0B0A] px-3 py-3">
                <dt className="sg-kicker">{label}</dt>
                <dd className="mt-1 text-sm text-[#F4F1EA]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <article className="min-w-0 border border-[#2A2824] bg-[#141311]">
          <header className="flex items-start justify-between gap-4 border-b border-[#2A2824] px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="sg-kicker">{data.policyTag}</p>
              <h2 className="mt-2 truncate text-xl font-semibold tracking-tight text-[#F4F1EA]">
                {data.name}
              </h2>
              <p className="mt-1 font-mono text-xs text-[#A39E93]">
                {data.market}
                <span className="px-2 text-[#2A2824]">/</span>
                <a
                  href={solscanAccount(data.wallet)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#F4F1EA] underline-offset-2 hover:underline"
                >
                  {shortPubkey(data.wallet, 4)}
                </a>
              </p>
            </div>
            <StatusLamp signal={data.signal} size="lg" />
          </header>

          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Published limits</caption>
            <tbody>
              {data.limits.map((row) => (
                <tr key={row.label} className="border-b border-[#2A2824]">
                  <th
                    scope="row"
                    className="px-4 py-3 text-left font-mono text-[11px] font-normal tracking-[0.14em] text-[#A39E93] uppercase sm:px-5"
                  >
                    {row.label}
                  </th>
                  <td className="px-4 py-3 text-right font-mono text-[13px] text-[#F4F1EA] tabular-nums sm:px-5">
                    {row.value}
                    <span className="ml-2 text-[10px] tracking-[0.12em] text-[#6F6A62]">
                      {row.source === "memo" ? "MEMO" : "SPEC"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <footer className="space-y-3 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[12px]">
              {data.proofHref ? (
                <a
                  href={data.proofHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#22C55E] underline-offset-2 hover:underline"
                >
                  {data.proofLabel}: {data.proofDisplay} ↗
                </a>
              ) : (
                <span className="text-[#A39E93]">
                  {data.proofLabel}: {data.proofDisplay}
                </span>
              )}
              <span className="text-[#A39E93]">
                <CheckedAge iso={data.checkedAt} />
              </span>
            </div>
            {data.secondary.length > 0 ? (
              <dl className="flex flex-wrap gap-x-5 gap-y-1 border-t border-[#2A2824] pt-3 font-mono text-[11px] text-[#A39E93]">
                {data.secondary.map((stat) => (
                  <div key={stat.label} className="flex gap-2">
                    <dt className="tracking-[0.12em] uppercase">{stat.label}</dt>
                    <dd className="text-[#F4F1EA]">
                      <CountValue value={stat.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </footer>
        </article>
      </div>
    </section>
  );
}
