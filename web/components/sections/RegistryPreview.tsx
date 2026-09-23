"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/ui/FadeUp";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const ROWS = [
  { name: "SpecGuard Jupiter Demo", status: "GREEN" as const, meta: "21 days active" },
  { name: "Sentinel DeFi Agent", status: "GREEN" as const, meta: "14 days active" },
  { name: "Unknown Agent 0x…", status: "RED" as const, meta: "BREACHED 2026-09-21" },
  { name: "Apex Trading Bot", status: "GREEN" as const, meta: "7 days active" },
];

export function RegistryPreview() {
  const reduced = usePrefersReducedMotion();

  return (
    <section className="sg-section">
      <div className="sg-shell">
        <FadeUp>
          <h2 className="sg-headline">
            Every agent.
            <br />
            <span className="text-[#00f5c4]">One place.</span>
          </h2>
        </FadeUp>

        <div className="mt-12 space-y-3">
          {ROWS.map((row, i) => {
            const red = row.status === "RED";
            return (
              <motion.div
                key={row.name}
                initial={reduced ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className={cn(
                  "sg-card relative overflow-hidden px-5 py-4",
                  red && "bg-[#ff3b3b08]",
                )}
              >
                {red ? (
                  <motion.span
                    className="absolute inset-y-0 left-0 w-1 bg-[#ff3b3b]"
                    initial={reduced ? false : { opacity: 0.2 }}
                    whileInView={reduced ? undefined : { opacity: [0.2, 1, 0.7] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9 }}
                  />
                ) : (
                  <span className="absolute inset-y-0 left-0 w-1 bg-[#00ff8822]" />
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 pl-2">
                  <p className="font-semibold">{row.name}</p>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={row.status} size="sm" />
                    <p className={cn("text-sm", red ? "text-[#ff3b3b]" : "text-[#8888aa]")}>
                      {row.meta}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <FadeUp className="mt-10">
          <Link href="/registry" className="sg-btn-ghost">
            View Full Registry →
          </Link>
        </FadeUp>
      </div>
    </section>
  );
}
