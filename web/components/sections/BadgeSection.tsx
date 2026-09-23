"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeUp } from "@/components/ui/FadeUp";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";

function DemoBadge({ state }: { state: "GREEN" | "RED" }) {
  const green = state === "GREEN";
  return (
    <motion.div
      animate={
        green
          ? { boxShadow: ["0 0 0 #00ff8800", "0 0 24px #00ff8833", "0 0 0 #00ff8800"] }
          : { boxShadow: ["0 0 0 #ff3b3b00", "0 0 24px #ff3b3b55", "0 0 0 #ff3b3b00"] }
      }
      transition={{ duration: green ? 2.4 : 1.4, repeat: Infinity }}
      className="sg-card flex h-28 items-center justify-center px-6"
      style={{ borderColor: green ? "#00ff8844" : "#ff3b3b55" }}
    >
      <div className="flex items-center gap-3">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: green ? "#00ff88" : "#ff3b3b" }}
        />
        <div>
          <p className="font-semibold">{green ? "SpecGuard Verified" : "BREACHED 2026-09-21"}</p>
          <p className="font-mono text-xs text-[#8888aa]">WALLET_ADDRESS</p>
        </div>
      </div>
    </motion.div>
  );
}

export function BadgeSection() {
  const reduced = usePrefersReducedMotion();
  const [loop, setLoop] = useState<"GREEN" | "RED">("GREEN");

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setLoop((s) => (s === "GREEN" ? "RED" : "GREEN"));
    }, 3000);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <section className="sg-section">
      <div className="sg-shell">
        <FadeUp>
          <h2 className="sg-headline">
            One line.
            <br />
            <span className="text-[#00f5c4]">Anywhere.</span>
          </h2>
        </FadeUp>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <FadeUp>
            <DemoBadge state="GREEN" />
          </FadeUp>
          <FadeUp delay={0.08}>
            <DemoBadge state="RED" />
          </FadeUp>
        </div>

        <FadeUp className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={loop}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DemoBadge state={loop} />
            </motion.div>
          </AnimatePresence>
        </FadeUp>

        <FadeUp className="mt-8">
          <CodeBlock code={`<img src="https://specguard.xyz/badge/WALLET_ADDRESS" />`} />
        </FadeUp>
      </div>
    </section>
  );
}
