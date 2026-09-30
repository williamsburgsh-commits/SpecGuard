"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/ui/FadeUp";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

export interface RegistryPreviewRow {
  name: string;
  status: "GREEN" | "RED";
  meta: string;
  href: string;
}

export function RegistryPreview({ rows }: { rows: RegistryPreviewRow[] }) {
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

        {rows.length === 0 ? (
          <FadeUp className="mt-12">
            <div className="sg-card px-6 py-8">
              <p className="text-lg font-semibold">No registered agents yet.</p>
              <p className="mt-2 max-w-xl text-sm text-[#8888aa]">
                The public registry lists only wallets that published a policy memo. This preview
                uses that same list — nothing here is a sample name.
              </p>
            </div>
          </FadeUp>
        ) : (
          <div className="mt-12 space-y-3">
            {rows.map((row, i) => {
              const red = row.status === "RED";
              return (
                <motion.div
                  key={row.href}
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
                  <Link
                    href={row.href}
                    className="flex flex-wrap items-center justify-between gap-3 pl-2"
                  >
                    <p className="font-semibold">{row.name}</p>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={row.status} size="sm" />
                      <p className={cn("text-sm", red ? "text-[#ff3b3b]" : "text-[#8888aa]")}>
                        {row.meta}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        <FadeUp className="mt-10">
          <Link href="/registry" className="sg-btn-ghost">
            View Full Registry →
          </Link>
        </FadeUp>
      </div>
    </section>
  );
}
