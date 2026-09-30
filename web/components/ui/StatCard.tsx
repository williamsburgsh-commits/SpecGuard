"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";


export function StatCard({
  label,
  value,
  prefix = "",
  suffix = "",
  digits = 0,
  className,
  tone,
}: {
  label: string;
  value: number | null;
  prefix?: string;
  suffix?: string;
  digits?: number;
  className?: string;
  tone?: "green" | "red" | "muted";
}) {
  const reduced = usePrefersReducedMotion();

  const shown =
    value == null
      ? "—"
      : `${prefix}${value.toLocaleString(undefined, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })}${suffix}`;

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -4, boxShadow: "0 16px 40px #00000066" }}
      className={cn("sg-card p-6", className)}
    >
      <p
        className={cn(
          "font-semibold tracking-tight",
          shown.length > 10 ? "text-2xl" : "text-3xl",
          tone === "green" && "text-[#00ff88]",
          tone === "red" && "text-[#ff3b3b]",
          !tone && "text-white",
        )}
      >
        {shown}
      </p>
      <p className="mt-2 text-sm text-[#8888aa]">{label}</p>
    </motion.div>
  );
}
