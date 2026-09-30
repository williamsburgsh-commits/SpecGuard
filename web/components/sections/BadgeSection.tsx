import { CodeBlock } from "@/components/ui/CodeBlock";
import type { LandingData } from "@/lib/home/loadLanding";

export function BadgeSection({ wallet }: { wallet: LandingData["wallet"] }) {
  const snippet = `<img src="https://specguard.xyz/badge/${wallet}" alt="SpecGuard status" />`;

  return (
    <section className="border-b border-[#2A2824] py-12 sm:py-16">
      <div className="sg-shell">
        <p className="sg-kicker">Badge</p>
        <h2 className="sg-headline mt-3 max-w-[18ch]">The status, on someone else’s page.</h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#A39E93]">
          The image is rendered from this wallet. The RED panel is the breach treatment, marked
          example, so it is not this operator’s live status.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <figure className="border border-[#2A2824] bg-[#141311] p-4">
            <figcaption className="sg-kicker">Live badge</figcaption>
            <div className="mt-4 flex min-h-16 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/badge/${wallet}`}
                alt="Live SpecGuard badge for the reference operator"
                className="max-w-full"
              />
            </div>
          </figure>
          <figure className="border border-[#FF3B30] bg-[#141311] p-4">
            <figcaption className="sg-kicker text-[#FF3B30]">Example breach</figcaption>
            <div className="mt-4 flex min-h-16 items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#FF3B30]" aria-hidden />
              <span>
                <span className="block text-sm font-semibold text-[#FF3B30]">RED · BREACHED</span>
                <span className="mt-1 block font-mono text-[11px] text-[#A39E93]">
                  Example only · {wallet.slice(0, 4)}…{wallet.slice(-4)}
                </span>
              </span>
            </div>
          </figure>
        </div>

        <div className="mt-4">
          <CodeBlock code={snippet} label="embed" />
        </div>
      </div>
    </section>
  );
}
