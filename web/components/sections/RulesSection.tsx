import type { LandingData } from "@/lib/home/loadLanding";

export function RulesSection({ limits }: { limits: LandingData["limits"] }) {
  return (
    <section className="border-b border-[#2A2824] py-12 sm:py-16">
      <div className="sg-shell">
        <p className="sg-kicker">Outside the model</p>
        <h2 className="sg-headline mt-3 max-w-[20ch]">Rules that live outside the model.</h2>
        <div className="mt-8 grid border border-[#2A2824] lg:grid-cols-2">
          <article className="px-4 py-5 sm:px-6 sm:py-6">
            <p className="sg-kicker">Prompt instructions</p>
            <p className="mt-2 text-sm text-[#FF3B30]">Editable. Invisible.</p>
            <p className="mt-5 font-mono text-sm leading-relaxed text-[#A39E93]">
              “Stay under the drawdown. Only use these venues. Stop if I say so.”
            </p>
            <p className="mt-5 text-sm leading-relaxed text-[#A39E93]">
              The model can ignore a sentence in the prompt. No one else can see that it did.
            </p>
          </article>
          <article className="border-t border-[#2A2824] bg-[#141311] px-4 py-5 sm:px-6 sm:py-6 lg:border-t-0 lg:border-l">
            <p className="sg-kicker">SpecGuard policy</p>
            <p className="mt-2 text-sm text-[#22C55E]">Onchain. Public. Signed.</p>
            <dl className="mt-5 divide-y divide-[#2A2824] border-y border-[#2A2824]">
              {limits.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="font-mono text-[11px] tracking-[0.12em] text-[#A39E93] uppercase">
                    {row.label}
                  </dt>
                  <dd className="text-right font-mono text-sm text-[#F4F1EA]">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-sm leading-relaxed text-[#A39E93]">
              Signed by the trading wallet. Checked against every transaction from that wallet.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
