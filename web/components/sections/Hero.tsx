"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { ParticleGrid } from "./ParticleGrid";
import { shortPubkey } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";

const DEMO_WALLET = "Spec1GuardJup11111111111111111111111111111";

export function Hero() {
  const reduced = usePrefersReducedMotion();

  return (
    <section className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      <ParticleGrid />
      <div className="sg-shell relative grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="sg-hero-headline">
            Onchain <span className="text-[#00f5c4]">proof</span> for
            <br />
            autonomous agents.
          </h1>
          <p className="mt-8 max-w-md text-lg text-[#8888aa]">
            Policy memos. Public GREEN/RED.
            <br />
            Flatten when limits break.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/register" className="sg-btn-primary">
              Register Agent
            </Link>
            <Link href="/registry" className="sg-btn-ghost">
              View Registry
            </Link>
          </div>
        </div>

        <motion.div
          animate={reduced ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="sg-card relative p-6 shadow-[0_0_80px_#00f5c41a]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8888aa]">Live agent</p>
              <h2 className="mt-2 text-xl font-bold">SpecGuard Jupiter Demo</h2>
              <p className="mt-2 font-mono text-xs text-[#8888aa]">{shortPubkey(DEMO_WALLET, 4)}</p>
            </div>
            <StatusBadge status="GREEN" label="VERIFIED" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <StatCard label="PnL" value={124.5} prefix="$" digits={2} className="p-4" />
            <StatCard label="Transactions" value={86} className="p-4" />
            <StatCard label="Days Active" value={21} className="p-4" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
