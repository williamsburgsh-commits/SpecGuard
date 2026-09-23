"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FadeUp } from "@/components/ui/FadeUp";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";

const STEPS = [
  {
    icon: "lock",
    title: "Publish your limits onchain",
    body: "Max drawdown, spend caps, allowed venues. Not a setting. A transaction.",
  },
  {
    icon: "eye",
    title: "Helius watches every tx",
    body: "Every transaction from your registered wallet is indexed and checked against your policy in real time.",
  },
  {
    icon: "shield",
    title: "Breach and go RED in public",
    body: "Limits broken — cancel all orders, flatten positions, post the proof. No apology tweets. Onchain receipts.",
  },
];

function StepIcon({ name }: { name: string }) {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ffffff18] text-[#00f5c4]">
      {name === "lock" ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      ) : name === "eye" ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" />
        </svg>
      )}
    </span>
  );
}

export function HowItWorks() {
  const reduced = usePrefersReducedMotion();
  const lineRef = useRef<HTMLDivElement>(null);
  const inView = useInView(lineRef, { once: true, margin: "-80px" });

  return (
    <section id="how" className="sg-section">
      <div className="sg-shell">
        <FadeUp>
          <h2 className="sg-headline">
            Rules that live
            <br />
            <span className="text-[#00f5c4]">outside the model.</span>
          </h2>
        </FadeUp>

        <div ref={lineRef} className="relative mt-16">
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-[#ffffff12] lg:block" />
          <motion.div
            className="absolute left-0 top-8 hidden h-px origin-left bg-[#00f5c4] lg:block"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: inView && !reduced ? 1 : reduced ? 1 : 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{ width: "100%" }}
          />
          <div className="grid gap-6 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <FadeUp key={step.title} delay={i * 0.12}>
                <article className="sg-card relative p-6">
                  <StepIcon name={step.icon} />
                  <h3 className="mt-6 text-xl font-bold tracking-tight">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#8888aa]">{step.body}</p>
                </article>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
