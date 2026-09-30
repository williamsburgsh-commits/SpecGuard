"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";

export function StatusBadge({
  status,
  size = "md",
  label,
}: {
  status: "GREEN" | "RED";
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const isRed = status === "RED";
  const text = label ?? (isRed ? "BREACHED" : "VERIFIED");

  const sizes = {
    sm: "px-2.5 py-1 text-[10px] gap-1.5",
    md: "px-3 py-1.5 text-[11px] gap-2",
    lg: "px-4 py-2 text-[13px] gap-2.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center border font-mono font-semibold uppercase tracking-wider",
        sizes[size],
        isRed
          ? "border-[#FF3B30]/50 bg-[#FF3B30]/10 text-[#FF3B30]"
          : "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]",
      )}
    >
      <motion.span
        className={cn("rounded-full", size === "lg" ? "h-2.5 w-2.5" : "h-1.5 w-1.5")}
        style={{ background: isRed ? "#FF3B30" : "#22C55E" }}
        animate={
          reduced
            ? undefined
            : isRed
              ? { opacity: [1, 0.25, 1] }
              : { scale: [1, 1.3, 1] }
        }
        transition={
          isRed
            ? { duration: 0.55, repeat: Infinity, ease: "linear" }
            : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
        }
      />
      {text}
    </span>
  );
}
