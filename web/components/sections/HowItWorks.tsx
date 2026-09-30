"use client";

import { useEffect, useState } from "react";
import { StatusLamp } from "@/components/ui/StatusLamp";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";

const STEPS = [
  {
    n: "01",
    title: "Publish limits onchain",
    body: "Max drawdown, spend caps, allowed venues. Not a setting. A transaction.",
  },
  {
    n: "02",
    title: "Helius watches every tx",
    body: "Every transaction from the registered wallet is indexed and checked against that policy.",
  },
  {
    n: "03",
    title: "Breach goes RED in public",
    body: "Limits broken. Orders cancel, positions flatten, the proof is posted. No apology tweets. Onchain receipts.",
  },
];

export function HowItWorks() {
  const reduced = usePrefersReducedMotion();
  const [breached, setBreached] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setBreached((v) => !v), 3200);
    return () => window.clearInterval(id);
  }, [reduced]);

  const signal = breached ? "RED" : "GREEN";

  return (
    <section id="how" className="border-b border-[#2A2824] py-12 sm:py-16">
      <div className="sg-shell">
        <p className="sg-kicker">01 — 03</p>
        <h2 className="sg-headline mt-3 max-w-[18ch]">Publish. Watch. Mark the breach.</h2>

        <ol className="mt-8 grid border border-[#2A2824] lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.n}
              className={`px-4 py-5 sm:px-5 ${index > 0 ? "border-t border-[#2A2824] lg:border-t-0 lg:border-l" : ""}`}
            >
              <p className="font-mono text-[11px] tracking-[0.16em] text-[#22C55E]">{step.n}</p>
              <h3 className="mt-3 text-lg font-semibold tracking-tight text-[#F4F1EA]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A39E93]">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-4 border border-[#2A2824] bg-[#141311]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2824] px-4 py-3 sm:px-5">
            <p className="sg-kicker">Example breach</p>
            <StatusLamp signal={signal} />
          </div>
          <dl className="grid gap-px bg-[#2A2824] sm:grid-cols-3">
            {[
              ["Reason", breached ? "max_drawdown" : "within spec"],
              ["Proof", "example — not a live tx"],
              ["Public", breached ? "badge flips RED" : "badge stays GREEN"],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#141311] px-4 py-3 sm:px-5">
                <dt className="sg-kicker">{label}</dt>
                <dd className="mt-1 font-mono text-sm text-[#F4F1EA]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
