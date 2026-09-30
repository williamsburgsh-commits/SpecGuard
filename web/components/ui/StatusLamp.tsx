"use client";

import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";
import type { Signal } from "@/lib/home/loadLanding";

const LABEL: Record<Signal, string> = {
  GREEN: "GREEN",
  RED: "RED",
  STALE: "STALE",
};

export function StatusLamp({
  signal,
  size = "md",
}: {
  signal: Signal;
  size?: "md" | "lg";
}) {
  const reduced = usePrefersReducedMotion();
  const large = size === "lg";

  return (
    <span
      className="inline-flex items-center gap-3"
      role="status"
      aria-label={`Status ${LABEL[signal]}`}
    >
      <span
        className={cn(
          "relative inline-flex shrink-0 rounded-full",
          large ? "h-5 w-5" : "h-2.5 w-2.5",
          signal === "GREEN" && "bg-[#22C55E]",
          signal === "RED" && "bg-[#FF3B30]",
          signal === "STALE" && "bg-[#A39E93]",
          !reduced && signal === "GREEN" && "sg-lamp-green",
          !reduced && signal === "RED" && "sg-lamp-red",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "font-mono font-semibold tracking-[0.18em]",
          large ? "text-2xl" : "text-xs",
          signal === "GREEN" && "text-[#22C55E]",
          signal === "RED" && "text-[#FF3B30]",
          signal === "STALE" && "text-[#A39E93]",
        )}
      >
        {LABEL[signal]}
      </span>
    </span>
  );
}
