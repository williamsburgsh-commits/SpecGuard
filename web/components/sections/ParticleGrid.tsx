"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";

export function ParticleGrid() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mouse = { x: 0.5, y: 0.4 };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMove);

    let frame = 0;
    let t = 0;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const gap = 48;
      const ox = (mouse.x - 0.5) * 18;
      const oy = (mouse.y - 0.5) * 18;
      t += 0.004;

      for (let x = 0; x < w + gap; x += gap) {
        for (let y = 0; y < h + gap; y += gap) {
          const dx = x / w - mouse.x;
          const dy = y / h - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pulse = 0.35 + Math.sin(t + x * 0.01 + y * 0.01) * 0.15;
          const alpha = Math.max(0.04, pulse - dist * 0.35);
          ctx.fillStyle = `rgba(0, 245, 196, ${alpha})`;
          ctx.fillRect(x + ox, y + oy, 1.5, 1.5);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
    };
  }, [reduced]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      aria-hidden
    />
  );
}
