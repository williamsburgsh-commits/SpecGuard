"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";

function useCountUp(value: number, active: boolean, reduced: boolean) {
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, active, reduced]);

  return display;
}

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
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    const fallback = window.setTimeout(() => setInView(true), 400);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  const numeric = value ?? 0;
  const counted = useCountUp(numeric, inView && value != null, reduced);
  const shown =
    value == null
      ? "—"
      : `${prefix}${counted.toLocaleString(undefined, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })}${suffix}`;

  return (
    <motion.div
      ref={ref}
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
