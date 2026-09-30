import { CopyButton } from "@/components/ui/CopyButton";
import { GUARD_BUY_URL, GUARD_MINT } from "@/lib/phoenix/constants";

export function GuardSection() {
  return (
    <section id="token" className="border-b border-[#2A2824] py-12 sm:py-16">
      <div className="sg-shell">
        <p className="sg-kicker">Skin in the game.</p>
        <h2 className="sg-headline mt-3">5,000,000 $GUARD to register.</h2>
        <div className="mt-8 grid border border-[#2A2824] md:grid-cols-2">
          <div className="px-4 py-5 sm:px-6">
            <p className="text-sm leading-relaxed text-[#A39E93]">
              Hold the gate or the badge goes dark. The policy memo is still the thing that was
              signed.
            </p>
          </div>
          <div className="border-t border-[#2A2824] px-4 py-5 sm:px-6 md:border-t-0 md:border-l">
            <p className="sg-kicker">Mint</p>
            <p className="mt-2 break-all font-mono text-sm text-[#F4F1EA]">{GUARD_MINT}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <CopyButton value={GUARD_MINT} />
              <a href={GUARD_BUY_URL} target="_blank" rel="noreferrer" className="sg-btn-primary">
                Buy $GUARD
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
