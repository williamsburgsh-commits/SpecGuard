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
        "inline-flex items-center rounded-full border font-semibold uppercase tracking-wider",
        sizes[size],
        isRed
          ? "border-[#ff3b3b]/50 bg-[#ff3b3b]/10 text-[#ff3b3b]"
          : "border-[#00ff88]/40 bg-[#00ff88]/10 text-[#00ff88]",
      )}
    >
      <motion.span
        className={cn("rounded-full", size === "lg" ? "h-2.5 w-2.5" : "h-1.5 w-1.5")}
        style={{ background: isRed ? "#ff3b3b" : "#00ff88" }}
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
