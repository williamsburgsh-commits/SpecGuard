"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

export function FadeUp({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
