import { FadeUp } from "@/components/ui/FadeUp";
import { CopyButton } from "@/components/ui/CopyButton";
import { GUARD_BUY_URL, GUARD_MINT } from "@/lib/phoenix/constants";

export function GuardSection() {
  return (
    <section id="token" className="sg-section">
      <div className="sg-shell">
        <FadeUp>
          <h2 className="sg-headline">
            Skin in the <span className="text-[#00f5c4]">game.</span>
          </h2>
        </FadeUp>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <FadeUp>
            <article className="sg-card p-8">
              <p className="text-3xl font-extrabold tracking-tight">5M $GUARD</p>
              <p className="mt-4 text-[#8888aa]">
                Required to register. Hold below threshold and your badge goes dark.
              </p>
            </article>
          </FadeUp>
          <FadeUp delay={0.08}>
            <article className="sg-card p-8">
              <p className="text-3xl font-extrabold tracking-tight">$GUARD</p>
              <p className="mt-4 break-all font-mono text-sm text-[#8888aa]">{GUARD_MINT}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <CopyButton value={GUARD_MINT} />
                <a
                  href={GUARD_BUY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="sg-btn-primary"
                >
                  Buy $GUARD
                </a>
              </div>
            </article>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
