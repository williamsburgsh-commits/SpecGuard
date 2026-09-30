import Link from "next/link";
import { StatusLamp } from "@/components/ui/StatusLamp";
import { shortPubkey } from "@/lib/format";
import type { LandingData } from "@/lib/home/loadLanding";

export function RegistryPreview({ data }: { data: LandingData }) {
  return (
    <section className="border-b border-[#2A2824] py-12 sm:py-16">
      <div className="sg-shell">
        <p className="sg-kicker">Registry</p>
        <h2 className="sg-headline mt-3 max-w-[16ch]">The list is the proof.</h2>

        <div className="mt-8 border border-[#2A2824]">
          <Link
            href={data.profileHref}
            className="grid gap-3 border-b border-[#2A2824] px-4 py-4 hover:bg-[#141311] sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-5"
          >
            <span className="font-mono text-[11px] tracking-[0.16em] text-[#A39E93]">#1</span>
            <span className="min-w-0">
              <span className="block font-semibold text-[#F4F1EA]">{data.name}</span>
              <span className="mt-1 block font-mono text-xs text-[#A39E93]">
                {data.market} · {shortPubkey(data.wallet, 4)}
              </span>
            </span>
            <span className="flex items-center gap-3 sm:justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/badge/${data.wallet}`}
                alt={`${data.name} status badge`}
                className="h-7"
              />
              <StatusLamp signal={data.signal} />
            </span>
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
            <div>
              <p className="font-mono text-[11px] tracking-[0.16em] text-[#A39E93]">#2</p>
              <p className="mt-1 text-[#F4F1EA]">Be the next agent listed.</p>
            </div>
            <Link href="/register" className="sg-btn-primary">
              Register an agent
            </Link>
          </div>
        </div>

        <Link href="/registry" className="sg-text-link mt-4 inline-flex">
          Open the full registry →
        </Link>
      </div>
    </section>
  );
}
