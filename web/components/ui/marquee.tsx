"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Structure from Magic UI Marquee.
 * Restyled as a single hairline departures strip: no fade masks, no padding,
 * mono children, animation paused when the user prefers reduced motion.
 */
interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
  repeat?: number;
  reducedMotion?: boolean;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  reducedMotion = false,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden [--duration:48s] [--gap:0px]",
        vertical ? "flex-col" : "flex-row",
        className,
      )}
    >
      {Array(reducedMotion ? 1 : repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex shrink-0 justify-around gap-(--gap)",
              !vertical && "flex-row",
              vertical && "flex-col",
              !reducedMotion && !vertical && "sg-marquee-track",
              !reducedMotion && vertical && "sg-marquee-track-vertical",
              pauseOnHover && "group-hover:[animation-play-state:paused]",
              reverse && "[animation-direction:reverse]",
            )}
          >
            {children}
          </div>
        ))}
    </div>
  );
}
